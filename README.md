# Recetario

Blog personal de recetas de cocina. Una receta por semana. Es un regalo, no tiene
fin comercial.

Next.js (App Router) + TypeScript + Tailwind, MongoDB Atlas, Better Auth e
ImageKit. Desplegado en Vercel.

> El contexto completo del proyecto — modelo de datos, reglas de visibilidad,
> convenciones y decisiones cerradas — está en **[CLAUDE.md](./CLAUDE.md)**.
> Este README es solo el arranque rápido.

## Arranque

El proyecto usa un entorno conda para fijar la versión de Node. **Hay que
activarlo en cada terminal nueva.**

```bash
conda env create -f environment.yml   # solo la primera vez
conda activate recetario

npm install
cp .env.example .env.local            # y rellenar los valores
npm run dev                           # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Pruebas puras (visibilidad y esquemas), sin red |
| `npm run test:entorno` | Comprueba `.env.local` contra Atlas e ImageKit de verdad |
| `npm run test:todo` | Las dos anteriores |
| `npm run indices` | Crea los índices de MongoDB (idempotente) |
| `npm run crear-usuario` | Alta de usuario (`-- --rol admin` para el admin) |
| `npm run seed:dev` | Datos de ejemplo (solo `recetas_dev`) |
| `npm run backup` | Copia de documentos, índices y originales de fotografías |
| `npm run restaurar:ensayo -- --carpeta backups/… --base recetas_restauracion_ensayo` | Restauración en una base nueva y aislada; verifica las fotos sin subirlas |

## Entornos

### Acceso y correo

El contacto público está en `/contacto`; sus datos se mantienen en
`src/lib/sitio.ts`. No configura el remitente automático. El texto de privacidad
pendiente de aprobación está en [PRIVACIDAD.md](./PRIVACIDAD.md), fuera de la web.

Sin `RESEND_API_KEY` y `CORREO_REMITENTE`, el registro está cerrado; las cuentas
existentes pueden entrar. Para habilitar verificación y recuperación:

1. Verificar un dominio y remitente en Resend y configurar ambas variables
   exclusivamente en servidor, en el entorno que corresponda.
2. Comprobar `BETTER_AUTH_URL`, completar privacidad/contacto y desplegar en
   Preview antes de abrir el registro en producción.
3. Probar alta, confirmación, acceso, recuperación, caducidad y reutilización
   del enlace. Las cuentas antiguas no verificadas también deben confirmar su
   correo al habilitar esta función. No compartir claves por chat ni guardarlas
   en Git.
4. Activar el segundo factor desde `/cuenta` y guardar los códigos de recuperación.

`npm run build -- --webpack` permite validar la compilación cuando el entorno
de ejecución impide a Turbopack abrir sus puertos internos. El build necesita
acceso a las fuentes y la configuración de desarrollo de MongoDB.

### Bases de datos

Un clúster de Atlas con dos bases: `recetas_dev` en local y Preview,
`recetas_prod` solo en Production. Cada entorno necesita un usuario limitado
a su base y secretos de autenticación distintos. La revisión local encontró
una credencial `atlasAdmin`: la separación de permisos todavía no está cerrada.

El seed rechaza producción siempre. Índices, backup y alta de usuario requieren
`--permitir-prod` explícito y configuración del entorno correcto.

Producción: https://recetario-36ok.vercel.app. Preview de `develop`:
https://recetario-git-develop-barrechee.vercel.app. Usar estos dominios canónicos
en `BETTER_AUTH_URL`, no las URLs temporales de cada despliegue.

La secuencia para proteger las fotos sin romperlas, las pruebas HTTP y el
procedimiento de recuperación están en [docs/OPERACION.md](./docs/OPERACION.md).

## Ramas

```
feature/*  →  develop  →  PR  →  main
```

`main` está protegida y despliega a producción. `develop` despliega a un preview
fijo.

GitHub Actions comprueba lint, tipos y pruebas unitarias en PRs y en las ramas
principales, sin secretos. El workflow de disponibilidad comprueba la portada
y `/api/salud` cada media hora una vez integrado en la rama predeterminada;
hay que habilitar y verificar las notificaciones de fallos de Actions.

## Estado

La iteración visual puede revisarse directamente con `npm run dev` en
`http://localhost:3000`: portada, `/recetas`, `/recetas/[slug]`, modo cocina y `/cuenta`.
Usa los datos de `recetas_dev`, que pueden diferir de producción. No carga datos
de demostración automáticamente ni modifica producción.

El inicio muestra la última publicación visible y las dos anteriores. La
cuadrícula de la cabecera abre el catálogo completo, la lupa abre la búsqueda
y el perfil lleva a la cuenta. Los borradores solo aparecen en administración.
`/recetas?buscar=1` permite buscar sin JavaScript. El catálogo y el inicio
comparten tarjetas y márgenes adaptados a pantallas grandes.
Las categorías del catálogo usan una tira ilustrada deslizable, conservando
los nombres reales y la búsqueda. La cuenta muestra identidad y guardadas con
las mismas tarjetas; el engranaje abre perfil, seguridad y cierre de sesión.

La ficha implementa la propuesta 04: introducción e ingredientes a la izquierda,
foto a la derecha y pasos debajo; en móvil se apilan. Sin foto no queda una
columna vacía. La nota final va centrada y en cursiva, sin recuadro. La lista no
tiene casillas; conserva el redondeo de cantidades y el escalador junto al título.
Raciones y paso se comparten mientras se navega entre las páginas
públicas. El progreso es temporal: recargar o entrar en cuenta/acceso/panel lo
reinicia. Las guardadas sí usan la cuenta y la base de datos habituales.

El blog está estrenado y en producción desde el 24 de agosto de 2026. El ritmo
es semanal: escribir la receta en el panel, publicarla y `npm run backup`. Los
pendientes de seguridad, contenido y puesta en marcha están en
[AUDITORIA.md](./AUDITORIA.md), junto con su estado de validación. Las decisiones
de arquitectura permanecen en [CLAUDE.md](./CLAUDE.md).
