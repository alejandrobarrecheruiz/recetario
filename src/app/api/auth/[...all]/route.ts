import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Atiende todo /api/auth/* (login, logout, sesion y los endpoints del plugin
// `admin`). El registro (/api/auth/sign-up/email) responde error: esta cerrado
// con `disableSignUp` en src/lib/auth.ts.
export const { GET, POST } = toNextJsHandler(auth);
