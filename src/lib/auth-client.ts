"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/**
 * Cliente de Better Auth para el navegador. Lo consumen el formulario de login
 * y el panel.
 *
 * Sin `baseURL`: el cliente y /api/auth/* viven en el mismo origen, asi que no
 * hace falta ninguna variable NEXT_PUBLIC_ (y BETTER_AUTH_SECRET no debe llegar
 * NUNCA al navegador).
 *
 * RECORDATORIO: lo que se vea o no se vea en el panel segun el rol es cosmetica.
 * La proteccion real esta en el servidor, con `filtroVisibilidad`. Ver
 * src/lib/visibilidad.ts.
 */
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
