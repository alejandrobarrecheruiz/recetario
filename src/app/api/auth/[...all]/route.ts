// TODO(fase 3): handler de Better Auth.
//
// Sustituir todo este fichero por:
//
//   import { toNextJsHandler } from "better-auth/next-js";
//   import { auth } from "@/lib/auth";
//
//   export const { GET, POST } = toNextJsHandler(auth);
//
// Esta ruta atiende todo /api/auth/* (login, logout, sesion, y los endpoints que
// anade el plugin `admin`).

const noImplementado = () =>
  Response.json(
    { error: "Better Auth se conecta en la fase 3." },
    { status: 501 },
  );

export const GET = noImplementado;
export const POST = noImplementado;
