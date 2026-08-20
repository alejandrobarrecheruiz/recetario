// TODO(fase 6): firma de subida a ImageKit.
//
// Emite las credenciales de un solo uso para que el NAVEGADOR suba el fichero
// directamente a ImageKit. Los bytes no pasan por esta funcion: las funciones de
// Vercel tienen un limite de peticion de unos 4 MB y una foto de movil sin
// comprimir puede no pasar.
//
//   import { getUploadAuthParams } from "@imagekit/next/server";
//
//   export async function GET() {
//     // 1) Comprobar que hay sesion y que el rol es admin. Sin esto, cualquiera
//     //    puede pedir firmas y subir a nuestra cuenta de ImageKit.
//     const { token, expire, signature } = getUploadAuthParams({
//       privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
//       publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY as string,
//     });
//     return Response.json({
//       token,
//       expire,
//       signature,
//       publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
//       folder: process.env.IMAGEKIT_FOLDER,
//     });
//   }
//
// IMAGEKIT_PRIVATE_KEY se queda aqui, en el servidor. No lleva prefijo
// NEXT_PUBLIC_ y no debe llevarlo nunca.

export function GET() {
  return Response.json(
    { error: "La firma de subida se implementa en la fase 6." },
    { status: 501 },
  );
}
