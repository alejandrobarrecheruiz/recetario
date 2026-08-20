# Recetario

Blog personal de recetas de cocina. Una receta por semana. Es un regalo, no tiene
fin comercial.

Next.js (App Router) + TypeScript + Tailwind, MongoDB Atlas, Better Auth e
ImageKit. Desplegado en Vercel.

> El contexto completo del proyecto — modelo de datos, reglas de visibilidad,
> convenciones y orden de construcción — está en **[CLAUDE.md](./CLAUDE.md)**.
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
| `npm run indices` | Crea los índices de MongoDB (idempotente) |
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

Fase 1 de 8: andamiaje. Todavía no hay funcionalidad. Los ficheros marcados con
`// TODO(fase N)` indican qué va en cada sitio y cuándo. Ver el orden de
construcción en [CLAUDE.md](./CLAUDE.md).
