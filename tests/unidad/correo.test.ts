import { test } from "node:test";
import assert from "node:assert/strict";
import { correoConfigurado, enviarCorreoAcceso } from "../../src/lib/correo";

test("el correo exige configuración completa y no expone errores del proveedor", async () => {
  const anteriores = { clave: process.env.RESEND_API_KEY, remitente: process.env.CORREO_REMITENTE };
  const fetchAnterior = globalThis.fetch;
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.CORREO_REMITENTE;
    assert.equal(correoConfigurado(), false);
    await assert.rejects(enviarCorreoAcceso("lectora@example.com", "https://example.com/token", "verificar"), /sin configurar/);
    process.env.RESEND_API_KEY = "clave-de-prueba";
    assert.equal(correoConfigurado(), false);
    process.env.CORREO_REMITENTE = "Cuaderno <acceso@example.com>";
    assert.equal(correoConfigurado(), true);
    globalThis.fetch = async (_url, opciones) => {
      assert.equal(JSON.parse(String(opciones?.body)).to[0], "lectora@example.com");
      return new Response("Detalle confidencial del proveedor", { status: 500 });
    };
    await assert.rejects(enviarCorreoAcceso("lectora@example.com", "https://example.com/token", "recuperar"), { message: "No se pudo enviar el correo de acceso." });
  } finally {
    globalThis.fetch = fetchAnterior;
    if (anteriores.clave === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = anteriores.clave;
    if (anteriores.remitente === undefined) delete process.env.CORREO_REMITENTE; else process.env.CORREO_REMITENTE = anteriores.remitente;
  }
});
