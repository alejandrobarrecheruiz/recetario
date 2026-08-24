import { getUploadAuthParams } from "@imagekit/next/server";
import { rolActual } from "@/lib/sesion";

// Emite las credenciales de un solo uso para que el NAVEGADOR suba el fichero
// directamente a ImageKit. Los bytes no pasan por esta funcion: las funciones
// de Vercel tienen un limite de peticion de unos 4 MB y una foto de movil sin
// comprimir puede no pasar.
//
// IMAGEKIT_PRIVATE_KEY se queda aqui, en el servidor. No lleva prefijo
// NEXT_PUBLIC_ y no debe llevarlo nunca.
export async function GET() {
  // Sin esto, cualquiera puede pedir firmas y subir a nuestra cuenta.
  if ((await rolActual()) !== "admin") {
    return Response.json({ error: "Solo el admin sube imagenes." }, { status: 403 });
  }

  const { token, expire, signature } = getUploadAuthParams({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY as string,
  });

  return Response.json({
    token,
    expire,
    signature,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    folder: process.env.IMAGEKIT_FOLDER,
  });
}
