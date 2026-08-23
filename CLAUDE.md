# CLAUDE.md — Recetario

Contexto permanente del proyecto. Si estás empezando una sesión nueva, lee esto
entero antes de tocar nada. Las decisiones que hay aquí están cerradas: aplícalas,
no las replantees.

---

## 1. Qué es esto

Blog personal de recetas de cocina. Se publica **una receta por semana**.

Es un **regalo**. No tiene ni va a tener fin comercial: sin anuncios, sin pagos,
sin freemium, sin analítica de conversión, sin newsletter de captación. Si una
propuesta solo tiene sentido para monetizar o para "crecer", no aplica aquí.

Qué tiene que hacer:

- Portada con listado de recetas y página de detalle por receta.
- Panel de administración dentro de la propia web, con login, para escribir y
  editar recetas sin tocar código.
- Tres roles: `admin`, `registrado`, `publico`. Los registrados ven recetas que
  el público no ve.
- Las recetas son **documentos JSON en MongoDB** servidos por API. **No se usan
  ficheros MDX.**
- Fotos de portada y de pasos individuales.

---

## 2. Stack

Cerrado. La razón de cada pieza está para no reabrir el debate, no para
reevaluarlo.

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript | Server Components permiten filtrar en el servidor, que es lo que exige la regla de visibilidad. Despliegue directo en Vercel. |
| Estilos | Tailwind CSS | Sin fichero de estilos que mantener aparte para un proyecto de una sola persona. |
| Base de datos | MongoDB Atlas (capa gratuita) | Las recetas son documentos anidados (ingredientes, pasos). Encajan en documentos sin necesidad de joins. Gratis para este volumen. |
| Driver | Driver oficial `mongodb`, **sin ORM ni Mongoose** | La validación ya la hace Zod. Una segunda capa de esquemas solo añade sitios donde divergir. |
| Auth | **Better Auth** + adaptador de MongoDB + plugin `admin` | El equipo de Auth.js se integró en Better Auth en septiembre de 2025 y es lo recomendado para proyectos nuevos. |
| Imágenes | ImageKit para los bytes, metadatos en MongoDB | Transformaciones y CDN gratis. Vercel Blob no da transformaciones en Hobby. |
| Validación | Zod, un único esquema compartido entre API y formularios | Un solo sitio donde cambia la forma de una receta. |
| Hosting | Vercel (plan Hobby) | Integración nativa con Next. Preview por rama. |
| Entorno local | conda (`recetario`) | Fija la versión de Node del proyecto sin depender del Node del sistema. |

**No instalar NextAuth.** Muchos tutoriales lo siguen recomendando por inercia.
Está descartado.

**No añadir dependencias** que no estén ya en `package.json` sin preguntar antes.

---

## 3. Cómo arrancar

**Primero el entorno. En cada terminal nueva.** El Node del sistema no es el
Node del proyecto; si no activas el entorno, estás usando otra versión.

```bash
conda activate recetario
```

Si el entorno no existe todavía:

```bash
conda env create -f environment.yml   # o: conda create -n recetario -c conda-forge nodejs=22 -y
```

Ya con el entorno activo:

```bash
npm install          # dependencias
npm run dev          # desarrollo, http://localhost:3000
npm run build        # build de producción
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # pruebas puras (visibilidad y esquemas). Sin red.
npm run test:entorno # comprueba .env.local: Atlas e ImageKit de verdad
npm run test:todo    # las dos anteriores
npm run indices      # crea los índices de MongoDB (idempotente)
npm run seed:dev     # datos de ejemplo (solo recetas_dev)
npm run backup       # volcado manual de la base
```

Los scripts de `scripts/` corren con `node --env-file=.env.local --import tsx`,
así que leen las variables de `.env.local` sin dependencias extra.

Antes de empezar hay que copiar la plantilla de entorno:

```bash
cp .env.example .env.local
```

Con `.env.local` relleno, `npm run test:entorno` dice si de verdad sirve: conecta
con Atlas, comprueba permisos de escritura, crea y verifica los índices y valida
las claves de ImageKit contra su API. Es lo primero que hay que lanzar cuando
algo «no va» y no se sabe si es el código o el entorno.

---

## 4. Modelo de datos

Colecciones: `recipes`, `images`, y las de Better Auth (`user`, `session`,
`account`, `verification`).

Los **nombres de colección están en inglés** (`recipes`, `images`) y los
**campos en español**. Es una inconsistencia heredada de la especificación
inicial; se mantiene porque los índices ya están definidos así. La regla de
español aplica a los campos, que es donde de verdad hay riesgo de deriva.

### `recipes`

```ts
{
  _id: ObjectId,
  slug: string,                        // único, es la URL
  titulo: string,
  resumen: string,
  estado: "borrador" | "publicada",
  visibilidad: "publica" | "registrada",
  publicadaEn: Date | null,
  actualizadaEn: Date,
  autorId: ObjectId,

  raciones: number,
  tiempo: { preparacion: number, coccion: number, total: number },  // minutos
  dificultad: "facil" | "media" | "dificil",
  categorias: string[],
  etiquetas: string[],

  ingredientes: [
    { id: string, cantidad: number, unidad: string, nombre: string, nota?: string }
  ],
  pasos: [
    { id: string, orden: number, texto: string, imagenId: ObjectId | null }
  ],

  portadaId: ObjectId | null,
  notas?: string,
  seo: { descripcion: string }
}
```

Definido en `src/models/receta.ts`. **El esquema Zod es la fuente de verdad** y
los tipos salen de él con `z.infer`, nunca al revés.

Detalle de implementación: en el Zod los identificadores se validan como cadena
hex de 24 caracteres, no como `ObjectId`. Es a propósito — ese fichero lo
importan también los formularios del panel, que son componentes de cliente, y
`z.instanceof(ObjectId)` arrastraría el driver de MongoDB al bundle del
navegador. La forma real en Mongo es el tipo `RecetaDoc`, que sí usa `ObjectId`
mediante un `import type` que TypeScript borra al compilar.

### `images`

```ts
{
  _id: ObjectId,          // identificador compartido con la receta
  recetaId: ObjectId | null,
  proveedor: "imagekit",
  fileId: string,         // id en ImageKit; sin esto no se puede borrar allí
  url: string,
  path: string,
  alt: string,
  ancho: number, alto: number, bytes: number,
  tipo: "portada" | "paso" | "galeria",
  orden: number,
  subidaEn: Date,
  subidaPor: ObjectId
}
```

Definido en `src/models/imagen.ts`.

Colección separada, **no subdocumentos**: permite reutilizar imágenes entre
recetas y detectar huérfanas.

**`fileId` es obligatorio.** Sin él, al borrar una receta la foto se queda
ocupando espacio en ImageKit para siempre y no hay forma de localizarla.

### Colecciones de Better Auth

Las crea y las migra el adaptador de MongoDB; **no las declaramos nosotros** y no
hay que generar esquema.

- `user` — email, emailVerified, name, image, createdAt, updatedAt. El plugin
  `admin` añade `role`, `banned`, `banReason`, `banExpires`.
- `session` — token, expiresAt, userId, ipAddress, userAgent. El plugin `admin`
  añade `impersonatedBy`.
- `account` — credenciales y proveedores enlazados.
- `verification` — tokens de verificación.

Sobre los roles (`src/models/usuario.ts`):

- **`publico` no es un rol almacenado.** Es la ausencia de sesión. Nadie tiene
  `role: "publico"` en la base de datos.
- En `user.role` solo se guarda `admin` o `registrado`.
- El plugin `admin` pone `"user"` por defecto en los usuarios nuevos, así que
  `rolDeSesion()` trata cualquier valor desconocido con sesión válida como
  `registrado`.

### Índices

Definidos en `crearIndices()` de `src/lib/mongo.ts`, se aplican con
`npm run indices`. Es idempotente.

```js
db.recipes.createIndex({ slug: 1 }, { unique: true })
db.recipes.createIndex({ estado: 1, visibilidad: 1, publicadaEn: -1 })
db.images.createIndex({ recetaId: 1 })
```

El segundo índice existe porque es exactamente la consulta de la portada: filtro
de visibilidad más orden por fecha de publicación.

---

## 5. Regla dura: la visibilidad es un filtro, nunca un condicional de render

> **El rol se traduce siempre a un filtro de consulta de MongoDB. Nunca a un
> condicional en el JSX.**

Si se oculta contenido con `{rol === "registrado" && <Receta/>}` en el render,
ese contenido **ya ha viajado al navegador** dentro del payload de React y se ve
abriendo las herramientas de desarrollo. No es una protección, es un adorno.

Todas las consultas de recetas pasan por `src/lib/visibilidad.ts`:

| Rol | Ve |
|---|---|
| `publico` | `estado: "publicada"` y `visibilidad: "publica"` |
| `registrado` | lo anterior más `visibilidad: "registrada"` |
| `admin` | todo, incluidos borradores |

```ts
import { conVisibilidad } from "@/lib/visibilidad";

const recetas = await coleccion.find(conVisibilidad(rol, { categorias: "postres" }));
```

Corolarios:

- El rol sale **siempre de la sesión, en el servidor**. Nunca de una query
  string, una cabecera o un campo que mande el cliente.
- Si escribes una consulta a `recipes` que no pasa por `filtroVisibilidad` o
  `conVisibilidad`, está mal.
- Una receta que el visitante no puede ver debe comportarse como **inexistente**
  (`notFound()`), no como prohibida. Un 403 confirma que existe.
- El guard de `src/app/admin/layout.tsx` protege la navegación, **no los datos**.
  Un layout no se ejecuta cuando alguien llama a `/api/recetas` directamente:
  cada handler comprueba el rol por su cuenta.

---

## 6. Cuatro decisiones del modelo de receta que no se simplifican

1. **`cantidad`, `unidad` y `nombre` van separados** en cada ingrediente. Es lo
   que permitirá escalar raciones multiplicando números. Nunca guardar
   `"600 g de queso crema"` como una sola cadena.
2. **`estado` y `visibilidad` son campos distintos.** Uno responde a "¿está
   terminada?" y el otro a "¿quién puede verla?". No fusionarlos en un
   `publicado: boolean` ni en un enum único.
3. **Ingredientes y pasos llevan `id` propio**, para reordenarlos en el panel con
   keys estables de React. Nunca usar el índice del array como key: al reordenar,
   React reutiliza el nodo equivocado y el texto salta de fila.
4. **Los pasos referencian `imagenId`, no una URL.** Si cambiamos de proveedor de
   imágenes se toca una sola colección.

---

## 7. Convención de nombres: todo el dominio en español

Los campos son `titulo`, `estado`, `visibilidad`, `raciones`, `ingredientes`,
`pasos`, `dificultad`, `portadaId`. **Nada de `isPublished`, `servings` ni
`steps`.**

Esto vale para nombres de campo, de tipos, de funciones y de variables del
dominio: `filtroVisibilidad`, `crearIndices`, `RecetaDoc`.

Sin esta regla escrita, la deriva al inglés aparece sola pasadas unas sesiones,
y acaba habiendo documentos con `titulo` y `steps` en el mismo objeto.

Excepciones, y solo estas: la API de las librerías (`createIndex`, `useSession`,
`getUploadAuthParams`), los nombres de colección heredados (`recipes`, `images`)
y las variables de entorno.

---

## 8. Separación dev / prod

**Un solo clúster de Atlas con dos bases**: `recetas_dev` y `recetas_prod`.

La cadena de conexión (`MONGODB_URI`) es **idéntica** en local y en Vercel. Lo
único que cambia es `MONGODB_DB`.

En Vercel:

| Entorno | `MONGODB_DB` | `IMAGEKIT_FOLDER` | `BETTER_AUTH_URL` |
|---|---|---|---|
| Production | `recetas_prod` | `prod` | `https://recetario-36ok.vercel.app` |
| Preview | `recetas_dev` | `dev` | URL fija de rama de `develop` |
| Development | `recetas_dev` | `dev` | `http://localhost:3000` |

Las otras cinco (`MONGODB_URI`, `BETTER_AUTH_SECRET`, `IMAGEKIT_PRIVATE_KEY`,
`NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`, `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`) valen lo
mismo en los tres entornos.

`recetas_prod` va **solo** en el entorno Production. Al meter la variable en
Vercel hay que desmarcar Preview y Development explícitamente.

**Orden al rellenarlas, y no es un capricho:** Vercel marca las tres casillas por
defecto. Primero las cinco compartidas, luego los valores de dev y `recetas_prod`
el último. Si se empieza por producción, el preview de `develop` queda apuntando
a la base de producción hasta que alguien se dé cuenta.

`BETTER_AUTH_URL` **no puede quedarse en `localhost` en Vercel**: Better Auth la
usa para construir los enlaces de sesión. La de Preview es la URL fija de rama de
`develop`, que se lee en el panel de Vercel; no la de un despliegue concreto, que
cambia en cada push. Hasta la fase 3 nadie la lee, así que se puede rellenar
después del primer despliegue, que es cuando se conocen las URLs.

### Atlas tiene que aceptar las conexiones de Vercel

En local basta con la IP propia autorizada, pero **las funciones de Vercel salen
por IPs que cambian en cada invocación**. Con solo la IP de casa en la lista, el
despliegue falla al conectar (no en las credenciales: en la conexión, que es un
error mucho más confuso de leer).

En el plan gratuito la única salida es `0.0.0.0/0` en Atlas > Network Access; las
IP estáticas de salida son de pago. No deja la base abierta: sigue protegida por
usuario y contraseña, que es lo que de verdad la protege.

### La primera vez que se toque producción

`recetas_prod` nace vacía y **sin índices**. Antes del primer despliegue que lea
o escriba recetas de verdad hay que crearlos a mano, que es el caso legítimo del
permiso explícito:

```bash
MONGODB_DB=recetas_prod npm run indices -- --permitir-prod
```

**Nunca ejecutar scripts contra `recetas_prod` desde local.** Los scripts de
`scripts/` comprueban `MONGODB_DB` y se niegan a arrancar si apunta a prod:

- `seed-dev.ts` **escribe**: aborta contra prod sin excepción posible.
- `indices.ts` y `backup.ts` admiten `--permitir-prod` para el caso legítimo
  (crear los índices en producción la primera vez, volcar producción). Hay que
  teclearlo a mano; nunca por accidente.

---

## 9. Aviso de `NEXT_PUBLIC_`

Todo lo que lleve el prefijo `NEXT_PUBLIC_` **acaba empaquetado en el bundle del
navegador y es público.** Cualquiera lo ve mirando el código fuente de la página.

Llevan prefijo porque tienen que llevarlo:

- `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`

**No lo llevan nunca:**

- `IMAGEKIT_PRIVATE_KEY`
- `BETTER_AUTH_SECRET`
- `MONGODB_URI`

Si alguna vez hace falta un secreto en el cliente, la respuesta correcta no es
ponerle el prefijo: es mover esa lógica al servidor.

---

## 10. Patrón de cliente Mongo cacheado

`src/lib/mongo.ts` guarda la **promesa** del cliente en `globalThis`.

Por qué: en Vercel cada invocación en caliente reutiliza el proceso de Node, pero
el módulo se puede reevaluar. Si el cliente se crea sin cachear, cada invocación
abre una conexión nueva y el clúster gratuito de Atlas (M0, límite de 500
conexiones) se agota en cuanto hay algo de tráfico o un par de despliegues
seguidos. Es el fallo clásico de Mongo + serverless.

Se cachea la promesa y no el cliente ya conectado: si llegan dos peticiones antes
de que termine el primer `connect()`, ambas esperan la misma promesa en lugar de
abrir dos conexiones.

El pool es pequeño a propósito (`maxPoolSize: 10`): muchas instancias serverless
con pools grandes agotan el límite igual de rápido.

`src/lib/mongo.ts` es **solo de servidor**. No importarlo desde componentes de
cliente.

---

## 11. Flujo de ramas

```
feature/*  →  develop  →  PR  →  main
```

- `main` está protegida. **Sin push directo.**
- El trabajo sale de `develop` en ramas `feature/*` y vuelve a `develop`.
- De `develop` a `main` siempre por PR.
- Vercel despliega `main` a producción y `develop` a un preview fijo.

---

## 12. Backups

Manuales, con `npm run backup`.

**Se ejecuta justo después de publicar cada receta**, para que el ritmo de los
backups vaya sincronizado con el del blog: una receta a la semana, un backup a la
semana. Es la única cadencia que no hay que recordar aparte.

Los volcados van a `./backups/`, que está en `.gitignore`: contienen datos
reales.

---

## 13. Orden de construcción

1. **Repo, Next, ramas y despliegue en blanco a Vercel** ← **estamos aquí**
2. Conexión a Mongo con cliente cacheado
3. Better Auth, roles y usuario admin creado a mano
4. Esquema de receta con Zod
5. Panel: crear y editar recetas **sin imágenes** todavía
6. ImageKit con subida firmada
7. Vistas públicas y filtro de visibilidad
8. JSON-LD de `schema.org/Recipe`, SEO y script de backup

La lógica del orden: validar el pipeline completo de despliegue cuando todavía no
hay nada que perder, y meter las imágenes tarde porque son la pieza con más
partes móviles.

(El andamiaje de la fase 1 ya adelanta `src/lib/mongo.ts`, `src/lib/visibilidad.ts`
y los modelos de Zod, porque son la base sobre la que se apoya todo lo demás.)

### Nota para la fase 6

Las funciones de Vercel tienen un **límite de tamaño de petición de unos 4 MB**,
así que una foto de móvil sin comprimir puede no pasar.

La subida va **del navegador directamente a ImageKit**, usando una firma de un
solo uso emitida por `/api/imagenes/firma`. Los bytes no pasan por nuestras
funciones. Así se esquiva el límite y no se gastan invocaciones.

Esa ruta tiene que comprobar que hay sesión y que el rol es `admin` antes de
firmar. Sin eso, cualquiera puede pedir firmas y subir a nuestra cuenta.

---

## 14. Decisiones aún abiertas

No darlas por cerradas sin querer.

- **Dónde se decide la autorización**: reglas en la base de datos frente a
  comprobaciones en las rutas de API. Se decidirá más adelante. De momento, todo
  pasa por el servidor.
- **Formato del texto de cada paso**: texto plano frente a Markdown. Se guarda
  como string plano por ahora. Ventaja: el texto plano ya es Markdown válido, así
  que si más adelante se decide renderizarlo como Markdown **no hará falta migrar
  nada**.
- **Dominio propio**: por ahora se usa el subdominio gratuito de Vercel.

---

## 15. Estructura

```
recetario/
├─ .env.local                        # gitignored
├─ .env.example                      # sí se sube
├─ environment.yml
├─ CLAUDE.md
├─ README.md
├─ src/
│  ├─ app/
│  │  ├─ (public)/
│  │  │  ├─ page.tsx                 # portada
│  │  │  └─ recetas/[slug]/page.tsx  # detalle de receta
│  │  ├─ (auth)/
│  │  │  └─ login/page.tsx
│  │  ├─ admin/
│  │  │  ├─ layout.tsx               # guard de rol admin
│  │  │  ├─ page.tsx                 # listado de recetas
│  │  │  └─ recetas/[id]/editar/page.tsx
│  │  └─ api/
│  │     ├─ auth/[...all]/route.ts   # handler de Better Auth
│  │     ├─ recetas/route.ts
│  │     └─ imagenes/firma/route.ts  # firma de subida a ImageKit
│  ├─ lib/
│  │  ├─ mongo.ts                    # cliente cacheado + índices
│  │  ├─ auth.ts
│  │  ├─ auth-client.ts
│  │  ├─ imagekit.ts
│  │  └─ visibilidad.ts              # rol → filtro de Mongo
│  ├─ models/
│  │  ├─ receta.ts                   # Zod, fuente de verdad
│  │  ├─ imagen.ts
│  │  └─ usuario.ts
│  └─ components/
├─ scripts/
│  ├─ indices.ts
│  ├─ backup.ts
│  └─ seed-dev.ts
└─ tests/
   ├─ unidad/                        # puras: `npm run test`
   │  ├─ visibilidad.test.ts
   │  └─ modelos.test.ts
   └─ entorno/                       # tocan la red: `npm run test:entorno`
      ├─ variables.test.ts
      ├─ mongo.test.ts
      └─ imagekit.test.ts
```

Las pruebas corren con el runner de `node:test` y `tsx`, que ya estaban en el
proyecto: **no hay framework de pruebas ni dependencia nueva**. Las de
`tests/entorno/` escriben en la base, así que se niegan a arrancar si
`MONGODB_DB` apunta a producción, y borran lo que insertan.

Los ficheros con `// TODO(fase N)` son andamiaje: la cabecera dice qué va ahí y
en qué fase. Muchos llevan ya la API oficial verificada en comentarios
(Better Auth 1.7.x, ImageKit, agosto de 2026) para no tener que volver a
investigarla.
