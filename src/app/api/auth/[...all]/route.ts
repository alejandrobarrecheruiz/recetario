import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Atiende todo /api/auth/* (login, registro, logout, sesion y los endpoints
// del plugin `admin`). La configuracion vive en src/lib/auth.ts.
export const { GET, POST } = toNextJsHandler(auth);
