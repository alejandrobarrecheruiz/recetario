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

- Inicio con las tres últimas publicaciones, catálogo completo y ficha por receta.
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
- **El registro público requiere correo transaccional configurado**:
  `RESEND_API_KEY` y `CORREO_REMITENTE` habilitan altas con confirmación de correo
  y sin inicio automático de sesión. Sin ambos valores se cierran las altas y
  se conserva el acceso de las cuentas existentes. Al habilitar correo, también
  las cuentas antiguas no verificadas deben confirmar su dirección: un intento
  de acceso válido les envía el enlace. Consecuencia asumida: las
  recetas de visibilidad `registrada` las ve cualquiera que se registre; ya no
  equivalen a «gente invitada». El admin solo se crea con
  `npm run crear-usuario -- --rol admin`; el registro nunca da ese rol.
- **Correo aplazado por decisión de producto**: no se configura por ahora un
  dominio ni un proveedor transaccional, tampoco se integra Gmail personal.
  El registro permanece cerrado y no hay recuperación automática por correo;
  las cuentas existentes conservan el acceso y el cambio autenticado de contraseña.

### Protección del acceso y edición

- **Minimización de datos:** conservar lo necesario para acceso, guardadas y
  edición; no añadir seguimiento. Al crear una sesión, `minimizarNuevaSesion`
  deja `ipAddress` y `userAgent` a `null` antes de persistirla. No desactivar
  la detección de IP global: el límite de intentos sigue utilizándola en
  `rateLimit`. No se migran sesiones anteriores ni se borran backups.
  La configuración y retención de logs de proveedores requieren revisión aparte.
- Better Auth limita intentos con almacenamiento en MongoDB (`rateLimit`),
  también en desarrollo: login 5/min y alta/recuperación/reenvío 3/min. Verificar
  IP fiable y comportamiento entre instancias antes de producción; las APIs
  propias no heredan estos límites.
- `/recuperar` usa enlaces de una hora y revoca sesiones tras cambiar la
  contraseña. Resend se integra mediante HTTP sin dependencias nuevas; el
  envío se programa con `after()` para no bloquear la respuesta. No registrar
  enlaces ni tokens. La entrega y los DNS del remitente requieren prueba real.
- `/cuenta` permite cambiar nombre y contraseña, activar TOTP con códigos de
  recuperación y eliminar una cuenta lectora. No se permite eliminar admins
  desde esta interfaz. La activación de TOTP no es obligatoria ni automática;
  el administrador ha aplazado su activación. Cuando se retome, debe completarla
  y conservar los códigos fuera del sitio.
- Las mutaciones propias comprueban Origin y Fetch Metadata además de sesión.
  El destino de retorno del login se restringe al origen propio.
- `src/proxy.ts` aplica CSP con nonce, `frame-ancestors 'none'` y restricciones
  de recursos; el layout raíz es dinámico para generar un nonce por petición.
  Estilos inline siguen permitidos por el diseño actual; `unsafe-eval` solo en
  desarrollo. Cabeceras globales adicionales viven en `next.config.ts`.
- `PUT /api/recetas/[id]` requiere `If-Match` con `actualizadaEn` en ISO y hace
  reemplazo condicionado a esa versión. Devuelve 412 ante conflicto. El editor
  serializa guardados y avisa antes de abandonar cambios pendientes. Mantiene
  borradores locales separados por usuario, receta y pestaña; permite recuperar
  o descargar el trabajo. Ante un conflicto se consulta la versión actual y se
  confirma expresamente cualquier sustitución; no hay fusión automática.
- Una publicación requiere ingredientes y pasos; el slug no cambia después
  de la primera publicación. Resumen y portada continúan siendo opcionales.
- Las fotos antiguas se borran después de guardar sus nuevas referencias y
  nunca si otra receta las usa. Se validan metadatos con ImageKit y referencias
  al guardar. Las fotos se resuelven por IDs referenciados, no por propietario.
  No hay transacción distribuida Mongo/ImageKit ni tarea de limpieza automática.
- Las fotografías siguen la visibilidad de las recetas que las referencian.
  El cliente recibe `/api/imagenes/[id]`, nunca una firma reutilizable de ImageKit.
  La ruta autoriza cada descarga, entrega sin caché compartida y solicita al
  proveedor una versión de hasta 1600 px. El original se conserva para backup.
  Las nuevas subidas son privadas. La cuenta ImageKit se usa solo para Recetario
  y tiene activado **Restrict all requests** para imágenes desde el 19/09/2026.
  Se invalidó la caché de los siete archivos existentes: originales y variantes
  probadas sin firma devuelven 401; la entrega pública del sitio devuelve 200.
  No volver a una versión que dependa de URLs directas sin firma.
  Véase `docs/OPERACION.md`.
- Guardar sin sesión registra una intención temporal en `sessionStorage`.
  Después del acceso (también con TOTP) se completa el guardado, con reintento
  explícito si falla. No se ejecutan guardados por un parámetro de URL aislado.
- `icon`, `apple-icon` y `opengraph-image` reutilizan `public/Logo.png`. Las
  portadas locales pasan por el optimizador de Next; no se modifica el original.
  La cubierta usa calidad 60; las tarjetas solicitan variantes adaptativas por
  ancho mediante el endpoint protegido. La cabecera permite saltar al contenido
  con teclado. Las listas de ingredientes/pasos conservan semántica explícita
  para Safari; las subidas del editor son alcanzables por teclado. Impresión
  muestra todos los pasos sin depender de animaciones ni del recorrido previo,
  y excluye controles y recetas relacionadas. Evidencias en `docs/REVISION-FINAL.md`.
  Cuenta, acceso, admin y Preview se marcan para no indexar.
  `robots.txt` permite `/api/imagenes/` para las fotos públicas de Recipe/OG,
  salvo `/api/imagenes/firma`; el resto de la API se excluye. Esto no sustituye
  la autorización por visibilidad que se aplica en cada descarga.

La lista de cierre y las validaciones pendientes están en [AUDITORIA.md](./AUDITORIA.md).
`src/lib/sitio.ts` centraliza la identidad y el correo públicos confirmados:
Alejandro Barreche Ruiz, alex.barreche@gmail.com. `/contacto` los muestra y
ofrece un canal para consultas y derechos; se enlaza desde el pie público y
las páginas de acceso/cuenta. No es el remitente automático de Resend.
El borrador [PRIVACIDAD.md](./PRIVACIDAD.md) queda fuera de las rutas públicas:
faltan bases jurídicas validadas, conservación, cookies y condiciones reales de
proveedores. Contacto no sustituye una política de privacidad completa.
El inventario técnico está en
[docs/INVENTARIO-PRIVACIDAD.md](./docs/INVENTARIO-PRIVACIDAD.md): distingue
cookies/almacenamiento configurados de observaciones HTTP y comprobaciones
pendientes. Incluye el aviso local `better-auth.message` de la dependencia,
los borradores sin caducidad y los límites del borrado en backups.

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

Un clúster de Atlas con dos bases: `recetas_dev` y `recetas_prod`.
La separación por nombre está montada, pero no certifica aislamiento.
La credencial local comprobada tiene `atlasAdmin`; hay que reemplazarla por
usuarios con permisos limitados a su base y verificar los de Production.

En Vercel (proyecto `recetario`; el dominio principal conserva `-36ok`,
pero los alias de rama no):

| Entorno | `MONGODB_DB` | `IMAGEKIT_FOLDER` | `BETTER_AUTH_URL` |
|---|---|---|---|
| Production | `recetas_prod` | `prod` | `https://recetario-36ok.vercel.app` |
| Preview | `recetas_dev` | `dev` | `https://recetario-git-develop-barrechee.vercel.app` |
| Development | `recetas_dev` | `dev` | `http://localhost:3000` |

Reglas de esas variables:

- Las tres URLs van **completas, con `https://`**: una `BETTER_AUTH_URL` sin
  esquema no parsea y tumba el build al prerenderizar `/login`.
- La de Preview es la URL fija de rama de `develop`, no la de un despliegue
  concreto (esa cambia en cada push).
- `MONGODB_URI` y `BETTER_AUTH_SECRET` deben ser distintos entre desarrollo y
  producción. No cambiar el secreto de producción sin planificar la revocación
  de sesiones y la compatibilidad del cifrado TOTP existente. Separar también
  permisos de ImageKit; una carpeta no es una frontera de autorización.
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

El formato 2 incluye EJSON canónico de todas las colecciones, índices y los
originales de ImageKit con hash SHA-256. Solo escribe `completo: true` al terminar.
Ensayar con `npm run restaurar:ensayo -- --carpeta backups/… --base
recetas_restauracion_ensayo`: rechaza una base existente con colecciones y no
puede apuntar a dev/prod. Comprueba documentos y bytes; no vuelve a subir las
fotos al proveedor. No es una instantánea transaccional: hacerlo sin ediciones
concurrentes. Retención, copia externa protegida y recuperación del proveedor
completo siguen pendientes de definir.

---

## 13. El diseño

El sistema visual **«Mi libro de recetas»** aprobado está implementado en Next.js.
Los prototipos de `docs/diseno` se retiraron del árbol activo; se conservan en
el historial de Git (commit `2cf725e`). Estas reglas y los componentes reales
son la referencia vigente, no las maquetas ni el antiguo lienzo de Claude Design.

### Reglas de base

**Base aprobada e implementada:**
cubierta ilustrada con scroll, fotos con margen blanco y marco fino,
título y datos al pie, marcador de guardar en la imagen y contenido blanco.
Sin botón «Abrir el cuaderno», sin rótulo visible «El cuaderno» ni declaración
personal destacada. El logo es **circular**, con ancho y alto iguales.
No se reinicia el diseño. Los cambios de cierre corrigen seguridad, fiabilidad
y coherencia del recorrido. Volver desde una ficha mediante el icono del catálogo
recupera filtros y posición del recorrido público; una recarga reinicia esa memoria.

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

**Nombre: «Mi libro de recetas»**, firmado «Alejandro» en la cubierta. No se
repite como texto en la cabecera ni en el pie.

**Tipografías** (Google Fonts, vía `next/font`): Instrument Sans para toda la
interfaz, incluidos títulos y números; Pinyon Script únicamente para el rótulo
de la cubierta. Son las únicas dos familias cargadas. Las variables heredadas
`--font-bricolage` y `--font-dm-mono` son alias de Instrument, no otras fuentes.

**Paleta** (tokens en `globals.css`, y solo ahí): papel `#DEE6E9`, tinta
`#0F1418`, superficie `#FFFFFF`, lateral `#CFD9DD`, rayas `#C0CCD1`/`#CCD7DB`,
acento `oklch(0.55 0.19 30)` (rojo anaranjado, ÚNICO acento) y
`oklch(0.8 0.16 34)` para la selección. Los apagados no son tokens: son
`tinta` con opacidad (`text-tinta/60`).

**Solo existe el estilo claro.** El modo oscuro se retiró a propósito: un
único `themeColor` y ninguna media query de `prefers-color-scheme`.

**La cabecera**: logo circular que lleva a inicio y tres SVG uniformes:
cuadrícula (`/recetas`), lupa y perfil (`/cuenta`, que reenvía al login sin
sesión). Sin rótulos visibles permanentes, con nombres accesibles, ayuda al
enfocar/pasar el cursor y controles de 44 px. Guardadas vive dentro de cuenta,
no se disfraza el acceso al perfil como una lista de guardadas.

**La portada**: conserva la cubierta ilustrada original (`Portada.jpg` /
`Portada-V.jpg`), aproximadamente una pantalla, parallax y rótulo. Después de
la banda muestra la última receta publicada y las dos anteriores que el rol
puede ver. Mongo aplica visibilidad, `estado: publicada`, orden por
`publicadaEn` e `_id` descendentes y límite tres; no se recorta un listado en
el cliente. No entran borradores ni siquiera para admins. La selección es
automática, no se fijan recetas manualmente. No hay buscador inline, filtros,
numeración ni manifiesto personal en inicio. Una tarjeta de continuación al
final enlaza al catálogo completo, con flecha y fondo decorativo desenfocado
(no fotografías ocultas). Indica cuántas recetas publicadas visibles quedan
fuera de la selección; si no quedan más, muestra «Explorar recetas». El recuento
aplica el mismo filtro de visibilidad que el listado. Sin recetas no se muestra.

**El catálogo** (`/recetas`): todas las publicadas visibles, con categorías y
búsqueda por plato o ingrediente combinables mediante `q` y `categoria`.
La tira visual aprobada muestra ilustraciones SVG con nombres, selección
subrayada en acento y desplazamiento horizontal en móvil. Las categorías salen
de las recetas visibles, no de una lista de muestra; las desconocidas usan una
ilustración genérica. Los enlaces conservan la búsqueda, funcionan sin JavaScript
y mantienen la selección visible. El recuento acompaña al título; los filtros
activos y su limpieza aparecen solo cuando se están usando.
También excluye borradores para admins; estos permanecen en administración.
Las búsquedas antiguas en `/?q=…` o `/?categoria=…` redirigen al catálogo.
La lupa abre un diálogo nativo con foco inicial y cierre mediante Escape;
envía con `next/form` sin recargar el documento. El enlace alternativo
`/recetas?buscar=1` muestra un formulario funcional incluso sin JavaScript.

**Tarjeta de receta** (`tarjeta-receta.tsx`): componente común de inicio,
catálogo y guardadas, con fotografía 4:3 enmarcada, título, resumen breve, fecha secundaria
y datos visuales de tiempo, raciones y dificultad (`datos-receta.tsx`). La
dificultad se representa por niveles y su nombre, no solo por color. Guardar
es hermano del enlace, nunca está anidado en él. Sin flechas ni «Ver receta».
Las tarjetas de un listado tienen la misma altura, también en guardadas.
Reservan una línea para la fecha aunque falte y dos para título y resumen;
ambos textos se limitan visualmente a dos líneas, con el texto completo en la ficha.
Sin foto conservan la información tipográfica y se igualan en altura a las
demás del listado, sin simular una imagen. No se filtran ni retocan los colores
de la comida.

**Anchuras**: inicio y catálogo usan márgenes fluidos y hasta 1920 px; tres
columnas en el inicio de escritorio, hasta cuatro en catálogo y una en móvil.
Los 720 px quedan para lectura, no para encerrar el listado en un monitor grande.

**La ficha actual**: cabecera pública compartida con navegación por iconos.
Título compacto, marcador y entrada a cocina en la introducción. Los datos
reutilizan los SVG de las tarjetas: tiempo total, personas y dificultad;
preparación y cocción tienen un desglose secundario. Las raciones de la
cabecera reflejan el escalador. La propuesta 04 aprobada organiza el escritorio
en hasta 1600 px: introducción e ingredientes a la izquierda, foto enmarcada a
la derecha y pasos debajo en una columna centrada de hasta 980 px, sobre blanco.
En móvil se apilan introducción, foto, ingredientes y pasos. La lista de
ingredientes aprovecha todo el ancho de la columna izquierda en escritorio,
con el escalador junto al título
y controles de 44 px también en móvil. Cantidad y nombre se alinean en cada
fila; en escritorio, la columna compartida de cantidad y unidad se ajusta a la
medida más larga, sin saltos de línea, y los nombres quedan alineados a su
derecha. Con notas secundarias, sin casillas,
tachados, contadores ni «Desmarcar», tampoco en modo cocina. Se mantiene
`medida()` con su redondeo a cuartos para piezas y medios para otras unidades.
Sin explicación de escalado ni enlace «Ingredientes y pasos». Pasos con
número y título opcional real, sin rótulo visible «Preparación» ni separadores
entre ingredientes y pasos o entre pasos. Se conservan las fotos intercaladas;
la portada no lleva pie. Se muestra completa, con su proporción original y
altura limitada al espacio disponible de la pantalla (hasta 760 px). En escritorio
acompaña el desplazamiento bajo la cabecera y se detiene antes de los pasos;
en móvil permanece en el flujo normal. Las fotos de pasos también limitan su
altura a la pantalla. Esto afecta a la presentación, no a los originales subidos.
La nota del autor cierra más abajo, centrada y en
cursiva, sin caja, título ni firma. Otras recetas visibles al final. Sin foto
se elimina la segunda columna y no se reserva un hueco vacío.

**El modo cocina** («Cocinar paso a paso»): overlay a pantalla completa (en
portal sobre `body`: el backdrop-blur de la cabecera crearía un contexto de
contención que atraparía el `fixed`), un paso cada vez en cuerpo gigante con
su foto si la tiene, barra de progreso en acento, los ingredientes a mano en
un panel propio, y página con botones, deslizando el dedo o con las flechas
(Escape sale). Pide wake lock para que el móvil no se apague cocinando. Es la
respuesta a «se lee en la cocina». Comparte raciones y
paso actual con la ficha; salir y volver no reinicia. Terminar y reiniciar
son acciones explícitas. Las cantidades escritas dentro de los pasos no se
reescriben al escalar; los tiempos tampoco se recalculan.

**Continuidad de preparación**: un proveedor en `(public)/layout.tsx` conserva
solo identificadores, cantidades y progreso en memoria. La portada ofrece
retomar la última receta interactuada si está entre sus tres resultados;
el catálogo también puede ofrecer retomar una receta de sus resultados actuales.
Se invalida al cambiar la versión de receta o la identidad/rol de sesión.
No utiliza almacenamiento persistente: recargar o salir del grupo público
(por ejemplo, hacia `/cuenta`, `/login` o administración) pierde el progreso.
Decisión cerrada: no conservar el progreso entre esos recorridos ni recargas.
Se mantiene únicamente la continuidad en memoria dentro del recorrido público;
salir del modo cocina y volver a abrirlo ahí permite retomarlo.

**El panel**: editor sobre la receta tal como se ve. contentEditable sin
control de React para título, resumen, pasos y nota; autoguardado con debounce
y rótulo «Guardado hace Xs»; barra lateral con visibilidad, ficha, categorías
y etiquetas como chips, y la descripción SEO; fotos con subida directa a
ImageKit; reordenado por arrastre. El alta (`/admin/recetas/nueva`) pide solo
el título y salta al editor. Todo valida con el MISMO Zod que la API.

**Las guardadas**: un marcador vacío junto a cada receta (en la introducción
de la ficha y sobre la foto destacada o junto a la fila) que se rellena al tocarlo
(`corazon-guardar.tsx`, estado optimista). Sin sesión no alterna: lleva a
`/login?volver=` a donde estabas. La API (`/api/guardadas/[recetaId]`)
comprueba la sesión por su cuenta y trata una receta no visible para el rol
como inexistente (404), también al guardarla.

**La cuenta** (`/cuenta`): página de servidor con identidad compacta (iniciales
circulares, nombre y correo), sin saludo explicativo. Las guardadas siguen
siendo el contenido principal: tarjetas compartidas y recuento inmediato al
quitar, en hasta tres columnas y una en móvil. Usa hasta 1500 px en escritorio;
en móvil el nombre va debajo del avatar y el engranaje queda arriba a la derecha.
El engranaje abre un diálogo lateral nativo con Perfil y Seguridad: nombre,
contraseña, segundo factor y cierre de sesión. Los formularios se despliegan
al elegir la acción; Escape cierra y devuelve el foco al engranaje. No se
cierra durante una operación pendiente. Al cerrar se limpian contraseñas y
confirmaciones; una configuración TOTP iniciada conserva temporalmente sus
códigos mientras el componente siga montado. El estado vacío lleva al catálogo.
**El rol no se enseña nunca, se nota**: si eres admin aparece «Panel» junto a
Guardadas; la eliminación de cuenta queda separada dentro de los ajustes y
solo está disponible para lectores. Sin sesión reenvía a `/login?volver=/cuenta`.
`/login` solo contiene
entrar y crear cuenta; con sesión reenvía a `/cuenta` (lo que además corta el
bucle del guard de `/admin` para quien no es admin). «Salir» responde al
toque («Saliendo...») y aterriza siempre en la portada, ya como público. La
entrada de perfil de la cabecera lleva a `/cuenta`. El marcador usa estado
optimista y refresca los datos de servidor tras guardar o quitar. Al quitar
una tarjeta enfocada, el foco pasa a la siguiente, a la anterior o a Explorar.
Si la petición falla se restituye la tarjeta en su orden original.

**Movimiento**: entradas en cascada (`Revelado`), parallax (`CapaParallax`) y
banda de frases continua y compacta, sin grandes huecos entre ellas. La banda
no tiene controles ni se detiene al pasar el cursor. Todo
respeta `prefers-reduced-motion`; el contenido no depende de la animación.

**Ausencia de foto**: las vistas públicas son tipográficas cuando no existe
imagen; no simulan fotografía ni añaden un bloque de relleno. Los patrones de
rayas existentes pueden seguir usándose como controles de carga en el editor.

**El pie**, compartido por páginas públicas y acceso/cuenta: enlace discreto a
Contacto, sin repetir nombre ni lema ni usar otra tipografía. No enlaza ayuda
o políticas inexistentes. Añadir contenido de ayuda y publicar la política
validada siguen pendientes. Sin redes ni newsletter.

**Estados vacíos y 404**: «La primera está al fuego.», «De eso aún no
tenemos.», «Esta página se nos ha quemado.» — el 404 deliberadamente ambiguo
(es lo que ve un visitante ante una receta de solo registrados).

Los botones del escalador tienen un área de 44 px y límites de raciones;
su valor se anuncia con `output`. Las filas de ingredientes son texto de
lectura, no controles interactivos.

### Subida de imágenes

La subida va **del navegador directo a ImageKit** con una firma de un solo uso
de `/api/imagenes/firma` (las funciones de Vercel tienen un límite de petición
de ~4 MB; los bytes no pasan por ellas). Esa ruta comprueba sesión y rol
`admin` antes de firmar: sin eso, cualquiera podría subir a nuestra cuenta.

---

## 14. Decisiones aún abiertas

No darlas por cerradas sin querer.

- **Ampliación del pie**: definir contenido útil de ayuda y finalizar privacidad,
  sin enlaces vacíos. Extender la tarjeta común a relacionadas; guardadas ya
  reutiliza el componente de inicio y catálogo.

- **Dónde se decide la autorización**: reglas en la base de datos frente a
  comprobaciones en las rutas de API. De momento, todo pasa por el servidor.
- **Formato del texto de cada paso**: string plano por ahora; como el texto
  plano ya es Markdown válido, renderizarlo como Markdown más adelante no
  exigiría migrar nada.
- **Dominio propio**: por ahora, el subdominio gratuito de Vercel.
- **Transiciones de página suaves** (View Transitions): decidido NO hacerlas
  todavía — primero que el mapa de saltos asiente. Si algún día se hacen,
  respetando `prefers-reduced-motion`.

(Las **recetas guardadas** — pedidas el 25 de agosto — están hechas: ver la
sección 4, colección `saves`, y la sección 13, «Las guardadas».)

Y cuatro que se cerraron el 26 de agosto de 2026, para no reabrirlas:

- **El login aterriza siempre como lector**: portada, o la ruta interna de
  `?volver=` si el login interceptó la navegación (el guard de `/admin`, la
  persona sin sesión). El panel es el enlace «Ir al panel» de `/cuenta`,
  nunca un destino forzado por rol.
- **No existe ningún «← Volver»**: la vuelta es siempre el logo.
- **La cuenta vive en `/cuenta`**: las guardadas son su contenido principal.
  La revisión aprobada de catálogo y cuenta añade identidad arriba y traslada
  lo administrativo al engranaje. `/login` solo entra y crea cuentas.
- **El rol no se enseña, se nota**: quien puede hacer algo ve el botón para
  hacerlo; quien no, no ve nada. Y **cada toque responde al instante**: el
  estado cambia al momento (corazón, Salir) y la red se resuelve por detrás.

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
│  │  │  ├─ layout.tsx               # añade el pie a las páginas públicas
│  │  │  ├─ page.tsx                 # cubierta + tres últimas publicadas visibles
│  │  │  ├─ recetas/page.tsx         # catálogo y filtros (?q, ?categoria)
│  │  │  └─ recetas/[slug]/page.tsx  # ficha con escalador de raciones
│  │  ├─ (auth)/
│  │  │  ├─ login/page.tsx           # entrar y crear cuenta; con sesión → /cuenta
│  │  │  ├─ recuperar/page.tsx       # solicitud y cambio por enlace de correo
│  │  │  └─ cuenta/page.tsx          # guardadas, panel (admin), salir
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
│  │     ├─ guardadas/[recetaId]/route.ts  # POST guarda, DELETE quita
│  │     ├─ imagenes/route.ts        # POST metadatos tras subir a ImageKit
│  │     ├─ imagenes/[id]/route.ts   # DELETE: solo fotos sin referencias
│  │     ├─ imagenes/firma/route.ts  # firma de subida (solo admin)
│  │     └─ salud/route.ts           # ping a la base; ver sección 8
│  ├─ lib/
│  │  ├─ mongo.ts                    # cliente cacheado + índices
│  │  ├─ auth.ts
│  │  ├─ auth-client.ts
│  │  ├─ sesion.ts                   # sesión y rol de la petición, en servidor
│  │  ├─ recetas.ts                  # doc ↔ receta (ObjectId ↔ hex) y publicadaEn
│  │  ├─ guardadas.ts                # las guardadas de un usuario, con miniatura
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
│     ├─ lista-guardadas.tsx         # la lista de /cuenta, con quitar
│     ├─ persona-cuenta.tsx          # la figura de persona → /cuenta
│     ├─ pie-de-pagina.tsx           # pie mínimo de las páginas públicas
│     ├─ cabecera-panel.tsx
│     ├─ ingredientes-escalables.tsx # lista de lectura + escalador de raciones
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
