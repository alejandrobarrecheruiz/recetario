// TODO(fase 3): cliente de Better Auth para el navegador.
//
// Lo consumen el formulario de login y el panel. API verificada contra la
// documentacion oficial de Better Auth 1.7.x (agosto de 2026).
//
//   "use client";
//
//   import { createAuthClient } from "better-auth/react";
//   import { adminClient } from "better-auth/client/plugins";
//
//   export const authClient = createAuthClient({
//     baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
//     plugins: [adminClient()],
//   });
//
//   export const { signIn, signOut, signUp, useSession } = authClient;
//
// Aviso: si se necesita la URL base en el cliente hace falta una variable con
// prefijo NEXT_PUBLIC_. BETTER_AUTH_URL (sin prefijo) no llega al navegador, y
// BETTER_AUTH_SECRET no debe llegar NUNCA. Si el cliente y la API viven en el
// mismo origen, se puede omitir `baseURL` y no hace falta variable ninguna.
//
// RECORDATORIO: lo que se vea o no se vea en el panel segun el rol es cosmetica.
// La proteccion real esta en el servidor, con `filtroVisibilidad`. Ver
// src/lib/visibilidad.ts.

export {};
