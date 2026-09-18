/** Prueba optativa del servidor local con cuentas temporales; nunca producción. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHmac } from "node:crypto";
import { ObjectId } from "mongodb";
import { obtenerCliente, obtenerColecciones, obtenerDb } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";

function codigoTotp(uri: string) {
  const secreto = new URL(uri).searchParams.get("secret")!;
  const bits = [...secreto.replace(/=+$/, "")].map(letra => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(letra).toString(2).padStart(5, "0")).join("");
  const clave = Buffer.from((bits.match(/.{8}/g) ?? []).map(byte => parseInt(byte, 2)));
  const contador = Buffer.alloc(8); contador.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const firma = createHmac("sha1", clave).update(contador).digest(); const offset = firma[firma.length - 1] & 15;
  return String((firma.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}

test("HTTP: acceso, contraseña, TOTP, borrado, fotos, CSRF y conflicto entre pestañas", { skip: process.env.PROBAR_HTTP !== "1" }, async t => {
  assert.equal(process.env.MONGODB_DB, "recetas_dev");
  const origen = process.env.BETTER_AUTH_URL!;
  assert.ok(["http://localhost:3000", "http://127.0.0.1:3000"].includes(origen));
  const { auth } = await import("@/lib/auth");
  const db = await obtenerDb();
  const { recetas, imagenes, guardadas } = await obtenerColecciones();
  const marca = randomBytes(8).toString("hex");
  const usuarios: ObjectId[] = [];
  const recetaId = new ObjectId();
  const imagenId = new ObjectId();
  const atributosCookies = new Set<string>();
  const cookies = (respuesta: Response) => {
    for (const cookie of respuesta.headers.getSetCookie()) {
      const [nombreValor, ...atributos] = cookie.split(";");
      atributosCookies.add(`${nombreValor.split("=")[0]}: ${atributos.filter(a => !a.trim().startsWith("Expires=")).join(";")}`);
    }
    return respuesta.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  };
  const llamada = (ruta: string, cookie = "", method = "GET", body?: unknown, extra: Record<string, string> = {}) => fetch(`${origen}${ruta}`, {
    method, headers: { origin: origen, cookie, ...(body ? { "Content-Type": "application/json" } : {}), ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: "manual", signal: AbortSignal.timeout(30000),
  });
  try {
    const sesiones: Record<string, string> = {};
    const claves: Record<string, string> = {};
    for (const rol of ["registrado", "admin"] as const) {
      const email = `prueba-${marca}-${rol}@example.invalid`;
      const password = randomBytes(24).toString("hex");
      claves[rol] = password;
      const { user } = await auth.api.createUser({ body: { name: "Prueba temporal HTTP", email, password, role: rol } });
      usuarios.push(new ObjectId(user.id));
      await db.collection("user").updateOne({ _id: new ObjectId(user.id) }, { $set: { emailVerified: true } });
      const acceso = await llamada("/api/auth/sign-in/email", "", "POST", { email, password });
      assert.equal(acceso.status, 200, `acceso ${rol}`);
      sesiones[rol] = cookies(acceso);
      assert.ok(sesiones[rol]);
    }
    const foto = await imagenes.findOne({});
    assert.ok(foto, "Hace falta una fotografía en desarrollo para comprobar entrega real.");
    await imagenes.insertOne({ ...foto, _id: imagenId, recetaId, subidaPor: usuarios[1] });
    const receta = {
      _id: recetaId, autorId: usuarios[1], slug: `prueba-http-${marca}`, titulo: "Receta de prueba HTTP", resumen: "",
      estado: "publicada" as const, visibilidad: "registrada" as const, publicadaEn: new Date(), actualizadaEn: new Date(),
      raciones: 2, tiempo: { preparacion: 1, coccion: 0, total: 1 }, dificultad: "facil" as const, categorias: [], etiquetas: [],
      ingredientes: [{ id: "ingrediente", cantidad: 1, unidad: "", nombre: "Prueba" }],
      pasos: [{ id: "paso", orden: 0, texto: "Preparar.", imagenId: null }], portadaId: imagenId, seo: { descripcion: "" },
    };
    await recetas.insertOne(receta);
    const ruta = `/api/recetas/${recetaId}`;
    const rutaFoto = `/api/imagenes/${imagenId}?ancho=240`;
    assert.equal((await llamada(ruta)).status, 404);
    assert.equal((await llamada(rutaFoto)).status, 404);
    assert.equal((await llamada(`/recetas/${receta.slug}`)).status, 404);
    assert.equal((await llamada(ruta, sesiones.registrado)).status, 200);
    const descarga = await llamada(rutaFoto, sesiones.registrado);
    assert.equal(descarga.status, 200);
    assert.match(descarga.headers.get("content-type")!, /^image\//);
    assert.match(descarga.headers.get("cache-control")!, /no-store/);
    assert.ok((await descarga.arrayBuffer()).byteLength > 0);
    assert.equal((await llamada(`/api/imagenes/${imagenId}?ancho=999999`, sesiones.admin)).status, 400);
    const guardar = `/api/guardadas/${recetaId}`;
    assert.equal((await llamada(guardar, "", "POST")).status, 401);
    assert.equal((await llamada(guardar, sesiones.registrado, "POST", undefined, { origin: "https://ajeno.test" })).status, 403);
    assert.equal((await llamada(guardar, sesiones.registrado, "POST")).status, 200);
    assert.equal((await llamada(guardar, sesiones.registrado, "POST")).status, 200);
    assert.equal(await guardadas.countDocuments({ recetaId, usuarioId: usuarios[0] }), 1);
    const entrada = { ...receta, _id: undefined, autorId: undefined, actualizadaEn: undefined, portadaId: imagenId.toHexString(), titulo: "Cambio de la primera pestaña" };
    assert.equal((await llamada(ruta, sesiones.admin, "PUT", entrada, { "If-Match": receta.actualizadaEn.toISOString() })).status, 200);
    assert.equal((await llamada(ruta, sesiones.admin, "PUT", { ...entrada, titulo: "Cambio de la segunda pestaña" }, { "If-Match": receta.actualizadaEn.toISOString() })).status, 412);
    assert.equal((await recetas.findOne(conVisibilidad("admin", { _id: recetaId })))?.titulo, entrada.titulo);
    const antigua = sesiones.registrado;
    const nuevaClave = randomBytes(24).toString("hex");
    const cambio = await llamada("/api/auth/change-password", antigua, "POST", { currentPassword: claves.registrado, newPassword: nuevaClave, revokeOtherSessions: true });
    assert.equal(cambio.status, 200, "Cambio autenticado de contraseña");
    claves.registrado = nuevaClave; sesiones.registrado = cookies(cambio);
    assert.equal((await llamada(rutaFoto, antigua)).status, 404, "La sesión anterior queda revocada");
    const segundoFactor = await llamada("/api/auth/two-factor/enable", sesiones.registrado, "POST", { password: nuevaClave });
    assert.equal(segundoFactor.status, 200);
    const configuracion = await segundoFactor.json();
    const verificacion = await llamada("/api/auth/two-factor/verify-totp", sesiones.registrado, "POST", { code: codigoTotp(configuracion.totpURI) });
    assert.equal(verificacion.status, 200, "Activación con código TOTP válido");
    if (verificacion.headers.getSetCookie().length) sesiones.registrado = cookies(verificacion);
    await db.collection("session").updateMany({ userId: usuarios[0] }, { $set: { expiresAt: new Date(0) } });
    assert.equal((await llamada(rutaFoto, sesiones.registrado)).status, 404, "La foto deja de verse con sesión caducada");
    const reto = await llamada("/api/auth/sign-in/email", "", "POST", { email: `prueba-${marca}-registrado@example.invalid`, password: nuevaClave });
    assert.equal(reto.status, 200);
    assert.equal((await reto.json()).twoFactorRedirect, true);
    const cookieReto = cookies(reto);
    assert.equal((await llamada(rutaFoto, cookieReto)).status, 404, "La contraseña sola no abre la foto con TOTP activo");
    const recuperar = await llamada("/api/auth/two-factor/verify-backup-code", cookieReto, "POST", { code: configuracion.backupCodes[0] });
    assert.equal(recuperar.status, 200, "Código de recuperación de un solo uso");
    sesiones.registrado = cookies(recuperar);
    assert.equal((await llamada(rutaFoto, sesiones.registrado)).status, 200);
    const reutilizar = await llamada("/api/auth/two-factor/verify-backup-code", sesiones.registrado, "POST", { code: configuracion.backupCodes[0] });
    assert.ok([400, 401].includes(reutilizar.status), "Un código de recuperación no puede reutilizarse");
    assert.equal((await llamada("/api/auth/delete-user", sesiones.admin, "POST", { password: claves.admin })).status, 403, "No se permite borrar un administrador desde cuenta");
    const borrado = await llamada("/api/auth/delete-user", sesiones.registrado, "POST", { password: nuevaClave });
    assert.equal(borrado.status, 200);
    assert.equal(await db.collection("user").countDocuments({ _id: usuarios[0] }), 0);
    assert.equal(await guardadas.countDocuments({ usuarioId: usuarios[0] }), 0);
    assert.equal(await db.collection("twoFactor").countDocuments({ userId: usuarios[0] }), 0);
    t.diagnostic(`Cookies locales observadas (sin valores): ${[...atributosCookies].join(" | ")}`);
  } finally {
    await guardadas.deleteMany({ recetaId });
    await recetas.deleteOne(conVisibilidad("admin", { _id: recetaId }));
    await imagenes.deleteOne({ _id: imagenId });
    for (const nombre of ["account", "session", "twoFactor"]) await db.collection(nombre).deleteMany({ userId: { $in: usuarios } });
    await db.collection("user").deleteMany({ _id: { $in: usuarios } });
    await db.collection("verification").deleteMany({ value: { $in: usuarios.map(id => id.toHexString()) } });
    await (await obtenerCliente()).close();
  }
});
