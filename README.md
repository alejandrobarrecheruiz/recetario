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
| `npm run backup` | Volcado manual de la base |

## Entornos

Un solo clúster de Atlas con dos bases. `MONGODB_URI` es la misma en todas
partes; lo único que cambia es `MONGODB_DB`: `recetas_dev` en local y en Preview,
`recetas_prod` solo en Production.

Los scripts se niegan a arrancar contra `recetas_prod` desde local.

## Ramas

```
feature/*  →  develop  →  PR  →  main
```

`main` está protegida y despliega a producción. `develop` despliega a un preview
fijo.

## Estado

El blog está estrenado y en producción desde el 24 de agosto de 2026. El ritmo
es semanal: escribir la receta en el panel, publicarla y `npm run backup`. Los
pendientes viven en la sección de decisiones abiertas de
[CLAUDE.md](./CLAUDE.md).
