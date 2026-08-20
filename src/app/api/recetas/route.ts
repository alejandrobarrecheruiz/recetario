// TODO(fase 5): API de recetas.
//
// GET  -> listado. Resuelve la sesion, saca el rol con `rolDeSesion` y consulta
//         con `conVisibilidad(rol, filtro)`. El rol NUNCA llega por query string
//         ni por cabecera del cliente: se saca de la sesion en el servidor.
//
// POST -> alta. Solo admin. Valida el cuerpo con `recetaEntradaSchema` y
//         completa `_id`, `autorId` y `actualizadaEn` en el servidor.
//
// Recordatorio: el guard de /admin/layout.tsx no cubre esta ruta. Cada handler
// comprueba el rol por su cuenta.

const noImplementado = () =>
  Response.json(
    { error: "La API de recetas se implementa en la fase 5." },
    { status: 501 },
  );

export const GET = noImplementado;
export const POST = noImplementado;
