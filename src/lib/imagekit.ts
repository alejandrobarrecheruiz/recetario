// TODO(fase 6): integracion con ImageKit.
//
// Paquetes ya instalados y verificados contra la documentacion oficial
// (agosto de 2026):
//
//   @imagekit/next    -> cliente (upload, <Image>, ImageKitProvider) y el helper
//                        de servidor `getUploadAuthParams`.
//   @imagekit/nodejs  -> SDK de servidor para gestionar ficheros ya subidos
//                        (sobre todo BORRARLOS por fileId).
//
// --- Firma de subida (la emite /api/imagenes/firma) ---
//
//   import { getUploadAuthParams } from "@imagekit/next/server";
//
//   const { token, expire, signature } = getUploadAuthParams({
//     privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
//     publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY as string,
//   });
//
// Es sincrona y devuelve { token, signature, expire }. El navegador necesita
// ademas `publicKey`, que ya es publica.
//
// OJO: `@imagekit/next/server` SOLO se puede importar desde dentro de Next. El
// paquete declara ese subpath con las claves "main" y "module" dentro de
// "exports", y esas no son condiciones que Node entienda, asi que desde Node
// plano (los scripts de scripts/ y las pruebas de tests/) el import revienta con
// ERR_PACKAGE_PATH_NOT_EXPORTED. Dentro de Next lo resuelve el empaquetador:
// verificado con un build y una peticion real (agosto de 2026).
//
// Si alguna vez hace falta firmar fuera de Next, el equivalente esta en el otro
// paquete y calcula el mismo HMAC-SHA1:
//
//   new ImageKit({ privateKey }).helper.getAuthenticationParameters()
//
// --- Subida desde el navegador ---
//
//   import { upload } from "@imagekit/next";
//   await upload({ file, fileName, token, signature, expire, publicKey, folder });
//
// POR QUE DIRECTA DESDE EL NAVEGADOR: las funciones de Vercel tienen un limite
// de tamano de peticion de unos 4 MB. Una foto de movil sin comprimir puede no
// pasar. Subiendo del navegador a ImageKit con una firma emitida por nuestra API
// se esquiva el limite y no se gastan invocaciones. Ver CLAUDE.md.
//
// --- Cliente de servidor (borrado y mantenimiento) ---
//
//   import ImageKit from "@imagekit/nodejs";
//
//   export const imagekit = new ImageKit({
//     privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
//   });
//
//   await imagekit.files.delete(fileId);
//
// Por eso `fileId` es obligatorio en el modelo `imagen`: sin el, al borrar una
// receta la foto se queda ocupando espacio en ImageKit para siempre.
//
// --- Carpetas ---
//
// IMAGEKIT_FOLDER separa dev de prod dentro de la misma cuenta ("dev" / "prod").

export {};
