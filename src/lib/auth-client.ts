"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/**
 * Cliente de Better Auth para el navegador. Sin `baseURL`: el cliente y
 * /api/auth/* viven en el mismo origen, asi que no hace falta ninguna variable
 * NEXT_PUBLIC_ (y BETTER_AUTH_SECRET no debe llegar NUNCA al navegador).
 */
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
