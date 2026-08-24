import ImageKit, { NotFoundError } from "@imagekit/nodejs";

/**
 * Cliente de servidor de ImageKit. Se usa para gestionar ficheros ya subidos:
 * sobre todo BORRARLOS por `fileId`, que para eso es obligatorio en el modelo.
 *
 * La subida NO pasa por aqui: va del navegador directo a ImageKit con la firma
 * de un solo uso que emite /api/imagenes/firma (las funciones de Vercel tienen
 * un limite de peticion de ~4 MB y una foto de movil puede no pasar).
 *
 * Solo de servidor: usa IMAGEKIT_PRIVATE_KEY.
 */

let cliente: ImageKit | undefined;

function clienteImageKit(): ImageKit {
  if (!cliente) {
    const clave = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!clave) {
      throw new Error("Falta IMAGEKIT_PRIVATE_KEY. Revisa .env.local.");
    }
    cliente = new ImageKit({ privateKey: clave });
  }
  return cliente;
}

/**
 * Borra un fichero de ImageKit. Que ya no exista alli no es un fallo: el
 * objetivo ("ese fichero no ocupa espacio") esta cumplido igual.
 */
export async function borrarDeImageKit(
  fileId: string,
): Promise<"borrada" | "no-estaba"> {
  try {
    await clienteImageKit().files.delete(fileId);
    return "borrada";
  } catch (error) {
    if (error instanceof NotFoundError) return "no-estaba";
    throw error;
  }
}
