# CLAUDE.md — Recetario

Contexto permanente del proyecto. Léelo entero al empezar una sesión nueva.
Las decisiones que hay aquí están cerradas: aplícalas, no las replantees.

---

## 1. Qué es esto

Blog personal de recetas de cocina. Una receta por semana.

Es un **regalo**. Sin fin comercial: sin anuncios, sin pagos, sin freemium, sin
analítica de conversión, sin captación por newsletter. Si una propuesta solo
tiene sentido para monetizar o para «crecer», no aplica aquí.

Qué hace:

- Portada con listado de recetas y ficha de detalle por receta.
- Panel de administración en la propia web, con login, para escribir y editar
  recetas sin tocar código.
- Tres roles: `admin`, `registrado`, `publico`. Los registrados ven recetas que
  el público no ve.
- Las recetas son **documentos JSON en MongoDB** servidos por API. **Sin MDX.**
- Fotos de portada y de pasos individuales.

El blog está **estrenado y en producción desde el 24 de agosto de 2026**
(`https://recetario-36ok.vercel.app`). El ritmo es semanal: escribir la receta
en el panel, publicarla y `npm run backup`.

---

## 2. Stack

Cerrado. La razón de cada pieza está para no reabrir el debate.

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript | Server Components permiten filtrar en el servidor, que es lo que exige la regla de visibilidad. |
| Estilos | Tailwind CSS | Sin fichero de estilos aparte para un proyecto de una persona. |
| Base de datos | MongoDB Atlas (capa gratuita) | Recetas = documentos anidados, sin joins. |
| Driver | `mongodb` oficial, **sin ORM ni Mongoose** | La validación ya la hace Zod; una segunda capa de esquemas solo añade sitios donde divergir. |
| Auth | **Better Auth** + adaptador de MongoDB + plugin `admin` | Es lo recomendado para proyectos nuevos desde que Auth.js se integró en Better Auth. |
| Imágenes | ImageKit para los bytes, metadatos en MongoDB | Transformaciones y CDN gratis. |
| Validación | Zod, un único esquema compartido entre API y formularios | Un solo sitio donde cambia la forma de una receta. |
| Hosting | Vercel (plan Hobby) | Integración nativa con Next. Preview por rama. |
| Entorno local | conda (`recetario`) | Fija la versión de Node del proyecto. |

**No instalar NextAuth** (los tutoriales lo siguen recomendando por inercia;
está descartado). **No añadir dependencias** que no estén ya en `package.json`
sin preguntar antes. Eso incluye librerías de componentes.

---

## 3. Cómo arrancar

**Primero el entorno, en cada terminal nueva** (el Node del sistema no es el
del proyecto):

```bash
conda activate recetario     # si no existe: conda env create -f environment.yml
```

```bash
npm install
cp .env.example .env.local   # y rellenar los valores
npm run dev          # http://localhost:3000
npm run build        # build de producción
npm run lint
npm run typecheck
npm run test         # pruebas puras (visibilidad y esquemas), sin red
npm run test:entorno # comprueba .env.local: Atlas e ImageKit de verdad
npm run test:todo    # las dos anteriores
npm run indices      # crea los índices de MongoDB (idempotente)
npm run crear-usuario           # alta de usuario, rol registrado
npm run crear-usuario -- --rol admin
npm run seed:dev     # datos de ejemplo (solo recetas_dev)
npm run backup       # volcado manual de la base
```

Los scripts de `scripts/` corren con `node --env-file=.env.local --import tsx`.
Cuando algo «no va» y no se sabe si es el código o el entorno, lo primero es
`npm run test:entorno`.

---

## 4. Modelo de datos

Colecciones: `recipes`, `images`, `saves`, y las de Better Auth (`user`,
`session`, `account`, `verification`).

Los **nombres de colección van en inglés** y los **campos en español**
(inconsistencia heredada; los índices ya están definidos así).

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
    { id: string, orden: number, titulo?: string, texto: string, imagenId: ObjectId | null }
  ],

  portadaId: ObjectId | null,
  notas?: string,
  seo: { descripcion: string }
}
```

Definido en `src/models/receta.ts`. **El esquema Zod es la fuente de verdad**;
los tipos salen de él con `z.infer`, nunca al revés. En el Zod los ids se
validan como hex de 24 caracteres, no como `ObjectId`: el fichero lo importan
componentes de cliente y `z.instanceof(ObjectId)` arrastraría el driver al
navegador. La forma real en Mongo es `RecetaDoc` (import de solo tipo).

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

Definido en `src/models/imagen.ts`. Colección separada, **no subdocumentos**:
permite reutilizar imágenes entre recetas y detectar huérfanas. **`fileId` es
obligatorio**: sin él, al borrar una receta la foto quedaría en ImageKit para
siempre y sin forma de localizarla.

### `saves`

Una receta guardada por un usuario: `{ _id, usuarioId, recetaId, guardadaEn }`
(`src/models/guardada.ts`). Documento propio por (usuario, receta) con índice
único compuesto: guardar dos veces no duplica y quitar es borrar un documento.
Guarda el **id** de la receta, nunca una copia: el listado de guardadas filtra
con el rol de la sesión como cualquier otra consulta, así que una guardada que
deja de ser visible simplemente no aparece.

### Colecciones de Better Auth

Las crea y migra el adaptador; **no se declaran esquemas**. El plugin `admin`
añade `role`, `banned`, `banReason`, `banExpires` a `user` e `impersonatedBy` a
`session`.

Sobre los roles (`src/models/usuario.ts`):

- **`publico` no es un rol almacenado**: es la ausencia de sesión.
- En `user.role` solo se guarda `admin` o `registrado` (`defaultRole:
  "registrado"` en `src/lib/auth.ts`; `rolDeSesion()` trata cualquier valor
  desconocido con sesión válida como `registrado`).
- **El registro público está ABIERTO**: cualquiera crea cuenta en `/login` con
  correo y contraseña y entra como `registrado`. Consecuencia asumida: las
  recetas de visibilidad `registrada` las ve cualquiera que se registre; ya no
  equivalen a «gente invitada». El admin solo se crea con
  `npm run crear-usuario -- --rol admin`; el registro nunca da ese rol.

### Índices

Definidos en `crearIndices()` de `src/lib/mongo.ts`, aplicados con
`npm run indices` (idempotente):

```js
db.recipes.createIndex({ slug: 1 }, { unique: true })
db.recipes.createIndex({ estado: 1, visibilidad: 1, publicadaEn: -1 })  // la consulta de la portada
db.images.createIndex({ recetaId: 1 })
db.saves.createIndex({ usuarioId: 1, recetaId: 1 }, { unique: true })
```

Al añadir un índice, recordar prod: `npm run indices -- --permitir-prod` con
`MONGODB_DB=recetas_prod`, antes de mergear a `main`.

---

## 5. Regla dura: la visibilidad es un filtro, nunca un condicional de render

> **El rol se traduce siempre a un filtro de consulta de MongoDB. Nunca a un
> condicional en el JSX.**

Lo que se oculta con `{rol === "registrado" && <Receta/>}` ya viajó al
navegador dentro del payload de React y se ve con las herramientas de
desarrollo. No es una protección, es un adorno.

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
  string, una cabecera o un campo del cliente.
- Una consulta a `recipes` que no pasa por `filtroVisibilidad` o
  `conVisibilidad` está mal.
- Una receta que el visitante no puede ver se comporta como **inexistente**
  (`notFound()`), no como prohibida: un 403 confirma que existe. Nada de
  candados, tarjetas borrosas ni «inicia sesión para ver esta receta».
- El guard de `src/app/admin/layout.tsx` protege la navegación, **no los
  datos**: un layout no se ejecuta al llamar a `/api/recetas` directamente;
  cada handler comprueba el rol por su cuenta.

---

## 6. Cuatro decisiones del modelo que no se simplifican

1. **`cantidad`, `unidad` y `nombre` van separados** en cada ingrediente: es lo
   que permite escalar raciones multiplicando números. Nunca guardar
   `"600 g de queso crema"` como una sola cadena.
2. **`estado` y `visibilidad` son campos distintos** («¿está terminada?» vs
   «¿quién puede verla?»). No fusionarlos en un boolean ni en un enum único.
3. **Ingredientes y pasos llevan `id` propio**, para reordenar con keys
   estables de React. Nunca el índice del array como key.
4. **Los pasos referencian `imagenId`, no una URL**: cambiar de proveedor de
   imágenes toca una sola colección.

---

## 7. Convención de nombres: todo el dominio en español

Campos, tipos, funciones y variables del dominio: `titulo`, `estado`,
`raciones`, `filtroVisibilidad`, `RecetaDoc`. **Nada de `isPublished`,
`servings` ni `steps`** — sin esta regla escrita, la deriva al inglés aparece
sola.

Excepciones, y solo estas: la API de las librerías (`createIndex`,
`useSession`), los nombres de colección heredados (`recipes`, `images`) y las
variables de entorno.

---

## 8. Separación dev / prod

**Montado y comprobado.** Un solo clúster de Atlas con dos bases:
`recetas_dev` y `recetas_prod`. `MONGODB_URI` es **idéntica** en todas partes;
solo cambia `MONGODB_DB`.

En Vercel (proyecto `recetario`; sus dominios conservan el sufijo `-36ok`
porque `recetario.vercel.app` ya estaba cogido):

| Entorno | `MONGODB_DB` | `IMAGEKIT_FOLDER` | `BETTER_AUTH_URL` |
|---|---|---|---|
| Production | `recetas_prod` | `prod` | `https://recetario-36ok.vercel.app` |
| Preview | `recetas_dev` | `dev` | `https://recetario-36ok-git-develop-barrechee.vercel.app` |
| Development | `recetas_dev` | `dev` | `http://localhost:3000` |

Reglas de esas variables:

- Las tres URLs van **completas, con `https://`**: una `BETTER_AUTH_URL` sin
  esquema no parsea y tumba el build al prerenderizar `/login`.
- La de Preview es la URL fija de rama de `develop`, no la de un despliegue
  concreto (esa cambia en cada push).
- Las otras cinco (`MONGODB_URI`, `BETTER_AUTH_SECRET`, `IMAGEKIT_PRIVATE_KEY`,
  `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`, `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`)
  valen lo mismo en los tres entornos.
- `recetas_prod` va **solo** en Production: al meterla, desmarcar Preview y
  Development explícitamente (Vercel marca las tres casillas por defecto).
- El login solo funciona en el dominio canónico de cada entorno (el de
  `BETTER_AUTH_URL`); en las URLs de deployment con hash, Better Auth responde
  `INVALID_ORIGIN`, y es lo esperado.

**Atlas acepta `0.0.0.0/0`** (Network Access): las funciones de Vercel salen
por IPs cambiantes y las IP estáticas son de pago. La base sigue protegida por
usuario y contraseña. Si el despliegue empieza a fallar al conectar, mirar
primero si esto se revirtió.

**`/api/salud`** hace ping a la base: `{ ok: true }` o 503. El nombre de la
base va al log del servidor (`salud: ok, base "recetas_prod"`), nunca a la
respuesta pública. Lleva `export const dynamic = "force-dynamic"`: sin eso el
ping se ejecutaría en el build y un Atlas caído rompería el despliegue.

**Scripts contra prod**: los de `scripts/` comprueban `MONGODB_DB` y se niegan
a arrancar contra `recetas_prod`. `seed-dev.ts` aborta sin excepción posible;
`indices.ts`, `backup.ts` y `crear-usuario.ts` admiten `--permitir-prod` para
los casos legítimos (índices de prod, volcado de prod, alta del admin real).
Hay que teclearlo a mano.

---

## 9. Aviso de `NEXT_PUBLIC_`

Todo lo que lleve ese prefijo **acaba en el bundle del navegador y es
público**. Lo llevan porque deben: `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`,
`NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`. No lo llevan nunca:
`IMAGEKIT_PRIVATE_KEY`, `BETTER_AUTH_SECRET`, `MONGODB_URI`. Si alguna vez
hace falta un secreto en el cliente, la respuesta no es el prefijo: es mover
esa lógica al servidor.

---

## 10. Patrón de cliente Mongo cacheado

`src/lib/mongo.ts` guarda la **promesa** del cliente en `globalThis`: en
serverless el módulo se puede reevaluar y sin caché cada invocación abriría
una conexión nueva contra el límite del clúster gratuito (M0, 500 conexiones).
Se cachea la promesa y no el cliente conectado para que dos peticiones
simultáneas esperen el mismo `connect()`. El pool es pequeño a propósito
(`maxPoolSize: 10`). **Solo de servidor**: no importarlo desde componentes de
cliente.

---

## 11. Flujo de ramas

```
feature/*  →  develop  →  PR  →  main
```

`main` está protegida, **sin push directo**; de `develop` a `main` siempre por
PR. Vercel despliega `main` a producción y `develop` a un preview fijo.

---

## 12. Backups

Manuales, con `npm run backup`, **justo después de publicar cada receta**: una
receta a la semana, un backup a la semana; única cadencia que no hay que
recordar aparte. Los volcados van a `./backups/` (en `.gitignore`: datos
reales).

---

## 13. El diseño

El sistema visual vigente es el del rediseño **«Mi libro de recetas»**,
copiado fielmente del lienzo «Recetario claro.dc.html» del proyecto de Claude
Design «Diseño blog de cocina desde cero»
(https://claude.ai/design/p/5a5bba19-00f5-4785-aad0-ce60c03ddf0d). **Ante la
duda visual, ese lienzo manda.** (Sustituyó entero al primer sistema, «La
cocina nos Une»; de aquel no queda nada.)

### Reglas de base

Tailwind, sin fichero de estilos aparte: los tokens (color, tipografía,
espaciado) se definen una vez en `globals.css` y todo los usa; nada de valores
sueltos por los componentes.

Restricciones que salen del propio proyecto:

1. **Las fotos son el contenido, no la decoración.** El diseño es el marco.
2. **Se lee en la cocina**, con el móvil en la encimera y las manos sucias:
   cuerpo grande, pasos que no se pierdan, nada que dependa del hover.
3. **Una receta a la semana**: la portada nunca tendrá doscientas tarjetas.
   Puede ser generosa; una rejilla densa sería diseñar un problema que no hay.
4. **Es un regalo**: tiene que tener cara propia, no parecer una plantilla.
5. **Los ingredientes se escalan por raciones**: la lista deja sitio a ese
   control desde el boceto.

Y una fácil de romper sin darse cuenta: **una receta que el visitante no puede
ver no existe para él** (ver sección 5). Nada de candados ni tarjetas borrosas.

### Lo decidido

**Nombre: «Mi libro de recetas»**, firmado «Alejandro». El rótulo en Pinyon
Script; la firma en DM Mono con tracking muy abierto.

**Tipografías** (Google Fonts, vía `next/font`): Bricolage Grotesque para
display, Instrument Sans para el cuerpo, DM Mono para rótulos y datos
(versalitas espaciadas), Pinyon Script SOLO para el nombre.

**Paleta** (tokens en `globals.css`, y solo ahí): papel `#DEE6E9`, tinta
`#0F1418`, superficie `#FFFFFF`, lateral `#CFD9DD`, rayas `#C0CCD1`/`#CCD7DB`,
acento `oklch(0.55 0.19 30)` (rojo anaranjado, ÚNICO acento) y
`oklch(0.8 0.16 34)` para la selección. Los apagados no son tokens: son
`tinta` con opacidad (`text-tinta/60`).

**Solo existe el estilo claro.** El modo oscuro se retiró a propósito: un
único `themeColor` y ninguna media query de `prefers-color-scheme`.

**La portada**: cubierta a pantalla completa con la foto de la semana a sangre
(parallax suave) y el rótulo encima; las dos entradas grandes («Lo último que
hice» → la ficha de la última, «Todas las recetas» → ancla a la rejilla); la
marquesina oscura ligada al scroll; la rejilla de tarjetas 4:5 con numeración
de cuaderno (la más antigua es la 01), categoría · tiempo en acento y píldoras
de categoría como filtros; y «Quién cocina aquí» con la cita, el hueco de gif
y los dos párrafos personales. **Sin captura de correo**: el campo «Avísame»
del lienzo se omitió a sabiendas (regla de la sección 1).

**La ficha**: cabecera pegajosa con el logo (la vuelta universal a la
portada; no existe ningún «← Volver» en el sitio, a propósito), el corazón de
guardar y el botón «Cocinar paso a paso»; cubierta 70svh con parallax y
título en Bricolage gigante; ingredientes en tarjeta blanca pegajosa con
escalador de raciones Y checklist (cada fila se tacha al tocarla, contador
«n de m listos», Desmarcar); pasos con número en acento y rotulillo opcional
(`paso.titulo`); fotos de paso 16:10 intercaladas; «Nota personal» (el campo
`notas`) en caja blanca con filo izquierdo en acento; y «Sigue por aquí» con
las dos publicadas más recientes.

**El modo cocina** («Cocinar paso a paso»): overlay a pantalla completa (en
portal sobre `body`: el backdrop-blur de la cabecera crearía un contexto de
contención que atraparía el `fixed`), un paso cada vez en cuerpo gigante con
su foto si la tiene, barra de progreso en acento, los ingredientes a mano en
un panel propio, y página con botones, deslizando el dedo o con las flechas
(Escape sale). Pide wake lock para que el móvil no se apague cocinando. Es la
respuesta a «se lee en la cocina».

**El panel**: editor sobre la receta tal como se ve. contentEditable sin
control de React para título, resumen, pasos y nota; autoguardado con debounce
y rótulo «Guardado hace Xs»; barra lateral con visibilidad, ficha, categorías
y etiquetas como chips, y la descripción SEO; fotos con subida directa a
ImageKit; reordenado por arrastre. El alta (`/admin/recetas/nueva`) pide solo
el título y salta al editor. Todo valida con el MISMO Zod que la API.

**Las guardadas**: un corazón vacío junto a cada receta (en la cabecera de la
ficha y sobre cada tarjeta de la rejilla) que se rellena al tocarlo
(`corazon-guardar.tsx`, estado optimista). Sin sesión no alterna: lleva a
`/login?volver=` a donde estabas. La lista vive en la vista de cuenta de
`/login`, con enlace a cada receta y quitar en el sitio. La API
(`/api/guardadas`) comprueba la sesión por su cuenta y trata una receta no
visible para el rol como inexistente (404), también al guardarla.

**Movimiento**: entradas en cascada (`Revelado`), parallax (`CapaParallax`) y
marquesina, siempre respetando `prefers-reduced-motion` y sin esconder nada si
no hay JS. El hover solo decora.

**Huecos de foto**: rayas diagonales (`.rayas` / `.rayas-finas`), nunca gris
plano. La foto cuadrada y el gif de «Quién cocina» siguen siendo huecos hasta
que existan los ficheros reales.

**Estados vacíos y 404**: «La primera está al fuego.», «De eso aún no
tenemos.», «Esta página se nos ha quemado.» — el 404 deliberadamente ambiguo
(es lo que ve un visitante ante una receta de solo registrados).

Concesión asumida al copiar el lienzo: los botones del escalador son de 26 px,
por debajo de la regla de toques de 44 px; las filas de ingredientes, en
cambio, son tocables a toda anchura.

### Subida de imágenes

La subida va **del navegador directo a ImageKit** con una firma de un solo uso
de `/api/imagenes/firma` (las funciones de Vercel tienen un límite de petición
de ~4 MB; los bytes no pasan por ellas). Esa ruta comprueba sesión y rol
`admin` antes de firmar: sin eso, cualquiera podría subir a nuestra cuenta.

---

## 14. Decisiones aún abiertas

No darlas por cerradas sin querer.

- **Dónde se decide la autorización**: reglas en la base de datos frente a
  comprobaciones en las rutas de API. De momento, todo pasa por el servidor.
- **Formato del texto de cada paso**: string plano por ahora; como el texto
  plano ya es Markdown válido, renderizarlo como Markdown más adelante no
  exigiría migrar nada.
- **Dominio propio**: por ahora, el subdominio gratuito de Vercel.

(Las **recetas guardadas** — pedidas el 25 de agosto — están hechas: ver la
sección 4, colección `saves`, y la sección 13, «Las guardadas».)

Y dos que se cerraron el 26 de agosto de 2026, para no reabrirlas:

- **El login aterriza siempre como lector**: portada, o la ruta interna de
  `?volver=` si el login interceptó la navegación (la pone el guard de
  `/admin`). El panel es el enlace «Ir al panel» de la vista de cuenta, nunca
  un destino forzado por rol.
- **No existe ningún «← Volver»**: la vuelta es siempre el logo.

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
│  │  ├─ not-found.tsx               # el 404; texto ambiguo a propósito
│  │  ├─ sitemap.ts                  # dinámico, SIEMPRE con rol "publico"
│  │  ├─ robots.ts
│  │  ├─ (public)/
│  │  │  ├─ page.tsx                 # portada: cubierta, buscador (?q, ?categoria)
│  │  │  └─ recetas/[slug]/page.tsx  # ficha con escalador de raciones
│  │  ├─ (auth)/
│  │  │  └─ login/page.tsx           # panel de cuenta: entrar, registrarse, salir
│  │  ├─ admin/
│  │  │  ├─ layout.tsx               # guard de rol admin (navegación, no datos)
│  │  │  ├─ page.tsx                 # listado de recetas
│  │  │  └─ recetas/
│  │  │     ├─ nueva/page.tsx        # alta: solo el título
│  │  │     └─ [id]/editar/page.tsx
│  │  └─ api/
│  │     ├─ auth/[...all]/route.ts   # handler de Better Auth
│  │     ├─ recetas/route.ts         # GET listado (por rol), POST alta
│  │     ├─ recetas/[id]/route.ts    # PUT, DELETE con limpieza de imágenes
│  │     ├─ guardadas/route.ts       # GET: las guardadas de la sesión
│  │     ├─ guardadas/[recetaId]/route.ts  # POST guarda, DELETE quita
│  │     ├─ imagenes/route.ts        # POST metadatos tras subir a ImageKit
│  │     ├─ imagenes/[id]/route.ts   # DELETE: ImageKit + metadatos + referencias
│  │     ├─ imagenes/firma/route.ts  # firma de subida (solo admin)
│  │     └─ salud/route.ts           # ping a la base; ver sección 8
│  ├─ lib/
│  │  ├─ mongo.ts                    # cliente cacheado + índices
│  │  ├─ auth.ts
│  │  ├─ auth-client.ts
│  │  ├─ sesion.ts                   # sesión y rol de la petición, en servidor
│  │  ├─ recetas.ts                  # doc ↔ receta (ObjectId ↔ hex) y publicadaEn
│  │  ├─ imagenes.ts                 # doc ↔ imagen (solo servidor)
│  │  ├─ imagekit.ts                 # cliente de servidor: borrar por fileId
│  │  ├─ subir-imagen.ts             # firma → subida directa → metadatos (cliente)
│  │  ├─ formato.ts                  # fechas, cantidades, duración, urlConAncho
│  │  └─ visibilidad.ts              # rol → filtro de Mongo
│  ├─ models/
│  │  ├─ receta.ts                   # Zod, fuente de verdad
│  │  ├─ imagen.ts
│  │  ├─ guardada.ts                 # receta guardada por un usuario
│  │  └─ usuario.ts
│  └─ components/
│     ├─ editor-receta.tsx           # editor del panel: WYSIWYG + autosave
│     ├─ crear-receta.tsx            # alta mínima
│     ├─ corazon-guardar.tsx         # el corazón de guardar
│     ├─ cabecera-panel.tsx
│     ├─ ingredientes-escalables.tsx # escalador de raciones + checklist
│     ├─ modo-cocina.tsx             # «Cocinar paso a paso»
│     ├─ revelado.tsx                # entrada en cascada
│     ├─ marquesina.tsx
│     ├─ parallax.tsx
│     ├─ logo.tsx
│     └─ boton-salir.tsx
├─ scripts/
│  ├─ indices.ts
│  ├─ crear-usuario.ts               # única vía de alta del rol admin
│  ├─ backup.ts
│  └─ seed-dev.ts
└─ tests/
   ├─ unidad/                        # puras: `npm run test`
   └─ entorno/                       # tocan la red: `npm run test:entorno`
```

Las pruebas corren con el runner de `node:test` y `tsx`: **sin framework de
pruebas nuevo**. Las de `tests/entorno/` escriben en la base, así que se
niegan a arrancar contra producción y borran lo que insertan.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
