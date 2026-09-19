import { test } from "node:test";
import assert from "node:assert/strict";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { minimizarNuevaSesion } from "../../src/lib/privacidad-sesion";

test("las nuevas sesiones no almacenan IP ni navegador y conservan el acceso", async () => {
  const datos = { user: [], account: [], session: [] };
  const auth = betterAuth({
    baseURL: "https://recetario.test",
    secret: "secreto-ficticio-solo-prueba-local-de-privacidad-123456",
    database: memoryAdapter(datos),
    emailAndPassword: { enabled: true },
    databaseHooks: { session: { create: { before: minimizarNuevaSesion } } },
    logger: { disabled: true },
  });
  const respuesta = await auth.api.signUpEmail({
    body: { name: "Prueba", email: "privacidad@example.invalid", password: "Clave-ficticia-prueba-123" },
    headers: new Headers({ "x-forwarded-for": "192.0.2.1", "user-agent": "Navegador de prueba" }),
    asResponse: true,
  });
  assert.equal(respuesta.status, 200);
  const contexto = await auth.$context;
  const sesiones = await contexto.adapter.findMany<{ ipAddress: string | null; userAgent: string | null; userId: string; token: string }>({ model: "session" });
  assert.equal(sesiones.length, 1);
  assert.equal(sesiones[0].ipAddress, null);
  assert.equal(sesiones[0].userAgent, null);
  assert.ok(sesiones[0].userId);
  assert.ok(sesiones[0].token);
  const cookie = respuesta.headers.getSetCookie().map(valor => valor.split(";")[0]).join("; ");
  const sesion = await auth.api.getSession({ headers: new Headers({ cookie }) });
  assert.equal(sesion?.user.email, "privacidad@example.invalid");
});

test("minimizar sesiones no desactiva los límites ni agrupa IP distintas", async () => {
  const auth = betterAuth({
    baseURL: "https://recetario.test",
    secret: "secreto-ficticio-solo-prueba-local-de-privacidad-123456",
    database: memoryAdapter({ user: [], account: [], session: [], rateLimit: [] }),
    databaseHooks: { session: { create: { before: minimizarNuevaSesion } } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 2 },
    logger: { disabled: true },
  });
  const consultar = (ip: string) => auth.handler(new Request("https://recetario.test/api/auth/get-session", {
    headers: { "x-forwarded-for": ip },
  }));
  assert.equal((await consultar("192.0.2.10")).status, 200);
  assert.equal((await consultar("192.0.2.10")).status, 200);
  assert.equal((await consultar("192.0.2.10")).status, 429);
  assert.equal((await consultar("192.0.2.11")).status, 200);
});
