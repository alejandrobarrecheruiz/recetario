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

/** Solo para peticiones servidor a servidor; la firma no sale al navegador. */
export function urlFirmadaDeImagen(path: string, ancho?: number): string {
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  const carpeta = process.env.IMAGEKIT_FOLDER?.replace(/^\/+|\/+$/g, "");
  if (!urlEndpoint || !carpeta || !path.startsWith(`/${carpeta}/`) || /[?#\\]/.test(path) || path.split("/").some((parte) => parte === ".." || parte === ".")) {
    throw new Error("La imagen no pertenece al entorno.");
  }
  return clienteImageKit().helper.buildSrc({
    urlEndpoint, src: path, signed: true, expiresIn: 60,
    ...(ancho ? { transformation: [{ width: ancho, height: 1600, crop: "at_max" as const, quality: 80, format: "webp" as const }] } : {}),
  });
}

export async function detallesDeImageKit(fileId: string) {
  return clienteImageKit().files.get(fileId);
}

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
