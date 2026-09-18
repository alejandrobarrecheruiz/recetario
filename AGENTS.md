# AGENTS.md — Guía de trabajo

Este archivo define cómo trabajar en el repositorio. `CLAUDE.md` conserva el
contexto completo, las decisiones de producto y la arquitectura; es la fuente
de verdad cuando este resumen no sea suficiente.

## Antes de cambiar código

1. Leer `CLAUDE.md` completo al empezar una sesión nueva.
2. Consultar `README.md`, `package.json` y la configuración relacionada con la
   tarea.
3. Localizar los archivos afectados con búsquedas dirigidas. No hace falta
   recorrer todo `src/` para realizar un cambio acotado.
4. Para cambios de Next.js, leer primero la guía pertinente de
   `node_modules/next/dist/docs/`. El proyecto usa Next.js 16 y algunas APIs o
   convenciones pueden diferir de versiones anteriores.
5. Revisar `git status` antes de editar y conservar los cambios ajenos a la
   tarea.

## Producto y límites

Recetario es un blog personal que publica una receta por semana. Es un regalo,
sin objetivos comerciales: no se añaden anuncios, pagos, freemium, analítica de
conversión ni captación por newsletter.

La aplicación incluye la portada y las fichas públicas, cuentas de lectores,
recetas guardadas y un panel de administración para crear y editar recetas. Las
recetas viven como documentos JSON en MongoDB; el proyecto no usa MDX.

El stack está decidido: Next.js App Router, React, TypeScript, Tailwind CSS,
MongoDB con el driver oficial, Better Auth, ImageKit y Zod. No se incorpora
NextAuth, un ORM, Mongoose, otro framework de pruebas ni nuevas dependencias sin
consultarlo antes.

## Invariantes de seguridad y datos

- Toda consulta a `recipes` aplica `filtroVisibilidad` o `conVisibilidad` desde
  `src/lib/visibilidad.ts`.
- El rol procede de la sesión del servidor. No se acepta desde parámetros,
  cabeceras ni datos enviados por el cliente.
- Una receta no visible se trata como inexistente: se devuelve 404 o se llama a
  `notFound()`. No se revela con un 403, un candado o contenido oculto en JSX.
- El guard de `src/app/admin/layout.tsx` protege la navegación. Cada ruta de API
  protege sus datos y operaciones por separado.
- `publico` representa la ausencia de sesión; los roles almacenados son
  `registrado` y `admin`.
- `estado` y `visibilidad` son conceptos distintos y se mantienen en campos
  separados.
- Cada ingrediente conserva `cantidad`, `unidad` y `nombre` por separado.
- Ingredientes y pasos tienen identificadores estables propios; los índices de
  arrays no se usan como claves de React.
- Los pasos referencian imágenes mediante `imagenId`, no mediante una URL.
- Los esquemas Zod de `src/models/` son la fuente de verdad. Los tipos se
  derivan con `z.infer`.
- Los identificadores de los esquemas compartidos con el cliente se validan
  como cadenas hexadecimales de 24 caracteres. `ObjectId` queda en los tipos y
  módulos exclusivos del servidor.
- `src/lib/mongo.ts`, `src/lib/imagekit.ts` y cualquier secreto permanecen en
  código de servidor.
- Solo las claves públicas de ImageKit llevan el prefijo `NEXT_PUBLIC_`.

## Convenciones de implementación

- Los nombres del dominio se escriben en español: `titulo`, `raciones`,
  `publicadaEn`, `filtroVisibilidad`. Se mantienen en inglés únicamente las
  APIs externas, las variables de entorno y los nombres heredados de
  colecciones.
- Los tokens visuales se definen en `src/app/globals.css` y se reutilizan desde
  los componentes. No se dispersan colores, tipografías o escalas nuevas.
- La interfaz solo tiene tema claro. El rojo anaranjado es el único color de
  acento.
- Las interacciones esenciales funcionan sin depender de `hover`, respetan
  `prefers-reduced-motion` y dan respuesta visual inmediata.
- El contenido restringido se excluye en la consulta; no se envía al navegador
  para ocultarlo después.
- Las rutas y componentes de servidor se prefieren mientras no haga falta
  estado, efectos o APIs del navegador.
- Los errores y textos de interfaz siguen el tono y las decisiones descritas en
  `CLAUDE.md`.

## Mapa del repositorio

- `src/app/(public)/`: portada y fichas de recetas.
- `src/app/(auth)/`: acceso y cuenta del lector.
- `src/app/admin/`: listado, alta y edición para administradores.
- `src/app/api/`: autenticación, recetas, guardadas, imágenes y salud.
- `src/components/`: interfaz reutilizable y componentes interactivos.
- `src/lib/`: sesión, acceso a datos, visibilidad, conversión de documentos e
  integraciones.
- `src/models/`: esquemas Zod y tipos del dominio.
- `scripts/`: índices, usuarios, datos de desarrollo y copias de seguridad.
- `tests/unidad/`: pruebas puras sin red.
- `tests/entorno/`: comprobaciones reales de MongoDB e ImageKit.

Para cambiar el modelo de receta hay que empezar por
`src/models/receta.ts`, revisar las conversiones de `src/lib/recetas.ts`, la
API, el editor y las pruebas del modelo. Para cambiar visibilidad hay que
empezar por `src/lib/visibilidad.ts` y comprobar todos los consumidores,
incluidos guardadas y sitemap. Para cambiar imágenes hay que revisar en
conjunto la firma, la subida directa, los metadatos, el borrado en ImageKit y
la limpieza de referencias.

## Entorno y comandos

El runtime local es el entorno conda `recetario`; hay que activarlo en cada
terminal nueva:

```bash
conda activate recetario
```

Comandos habituales:

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run test` ejecuta las pruebas puras. `npm run test:entorno` usa
`.env.local`, accede a servicios reales y puede escribir datos temporales en
la base de desarrollo. `npm run test:todo` ejecuta ambas suites.

Los scripts cargan `.env.local` y se protegen frente a producción. `seed:dev`
no se ejecuta nunca contra `recetas_prod`. `indices`, `backup` y
`crear-usuario` solo pueden apuntar a producción con `--permitir-prod` escrito
de forma explícita. Para añadir un índice hay que actualizar
`crearIndices()` y aplicarlo en producción antes de integrar el cambio en
`main`.

## Validación de cambios

Aplicar la comprobación más pequeña que cubra el cambio y ampliar según el
riesgo:

- Documentación: revisar enlaces, comandos y coherencia con `CLAUDE.md`.
- Utilidades, esquemas o visibilidad: `npm run test` y `npm run typecheck`.
- Componentes y rutas: `npm run lint`, `npm run typecheck` y las pruebas
  relacionadas.
- Cambios transversales o de configuración de Next.js: añadir
  `npm run build`.
- MongoDB, ImageKit o variables de entorno: ejecutar `npm run test:entorno`
  solo cuando exista un `.env.local` válido y la tarea requiera probar las
  integraciones reales.

No se corrigen fallos ajenos a la tarea sin identificarlos primero. Si una
validación no puede ejecutarse, se deja constancia de la causa al entregar el
cambio.

## Git y producción

El flujo de ramas es `feature/*` → `develop` → PR → `main`. `main` está
protegida y despliega a producción; `develop` despliega al entorno Preview.
No se hace push directo a `main`.

`recetas_dev` se usa en local y Preview. `recetas_prod` se usa exclusivamente
en Production. La publicación semanal termina con `npm run backup`; los
volcados contienen datos reales, permanecen en `backups/` y no se versionan.

## Mantenimiento de la documentación

- Actualizar `CLAUDE.md` cuando cambie una decisión de producto, arquitectura,
  modelo de datos, seguridad, diseño o despliegue.
- Actualizar `README.md` cuando cambie la puesta en marcha o un comando que deba
  conocer quien abre el repositorio.
- Actualizar `AGENTS.md` cuando cambie el procedimiento para trabajar, validar
  o localizar responsabilidades en el código.
- Describir siempre el estado vigente y las acciones reproducibles. No añadir
  transcripciones, instrucciones temporales de una sesión ni razonamientos que
  no ayuden a mantener el proyecto.
- Mantener explícitas las decisiones todavía abiertas; no presentarlas como
  acuerdos cerrados.
