/**
 * Da de alta un usuario. Es la unica via de alta: el registro publico esta
 * cerrado (`disableSignUp` en src/lib/auth.ts).
 *
 *   npm run crear-usuario                  # rol "registrado"
 *   npm run crear-usuario -- --rol admin   # el admin de la fase 3
 *
 * Usa `auth.api.createUser` del plugin `admin` de Better Auth, que llamado en
 * servidor y sin cabeceras no exige sesion (verificado en 1.7.1: solo lanza
 * UNAUTHORIZED si la llamada trae request o headers). Asi el hash de la
 * contrasena y la forma de `user` y `account` los pone Better Auth, no nosotros.
 */
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

import { esBaseDeProduccion, obtenerCliente } from "../src/lib/mongo";
import { rolAlmacenadoSchema } from "../src/models/usuario";

// Una UNICA interfaz de readline con cola de lineas, en vez de `rl.question`
// por pregunta. `question` solo captura la SIGUIENTE linea tras llamarlo; si la
// entrada llega por tuberia, readline emite todas las lineas de golpe y las que
// no tienen pregunta pendiente se pierden. La cola las guarda todas.
let silenciado = false;
const salida = new Writable({
  write(trozo, _codificacion, seguir) {
    if (!silenciado) process.stdout.write(trozo);
    seguir();
  },
});
const rl = createInterface({
  input: process.stdin,
  output: salida,
  terminal: process.stdin.isTTY,
});

const lineas: string[] = [];
const pendientes: {
  cumplir: (linea: string) => void;
  fallar: (motivo: Error) => void;
}[] = [];
let entradaCerrada = false;

rl.on("line", (linea) => {
  const pendiente = pendientes.shift();
  if (pendiente) pendiente.cumplir(linea);
  else lineas.push(linea);
});
rl.on("close", () => {
  entradaCerrada = true;
  for (const pendiente of pendientes.splice(0)) {
    pendiente.fallar(new Error("La entrada se acabo antes de contestar todo."));
  }
});

function siguienteLinea(): Promise<string> {
  const enCola = lineas.shift();
  if (enCola !== undefined) return Promise.resolve(enCola);
  if (entradaCerrada) {
    return Promise.reject(new Error("La entrada se acabo antes de contestar todo."));
  }
  return new Promise((cumplir, fallar) => pendientes.push({ cumplir, fallar }));
}

async function preguntar(texto: string): Promise<string> {
  process.stdout.write(texto);
  return (await siguienteLinea()).trim();
}

/** Como `preguntar`, pero sin eco: la contrasena no se queda en la pantalla. */
async function preguntarOculto(texto: string): Promise<string> {
  process.stdout.write(texto);
  silenciado = true;
  try {
    return await siguienteLinea();
  } finally {
    silenciado = false;
    process.stdout.write("\n");
  }
}

async function principal() {
  const base = process.env.MONGODB_DB;

  // Dar de alta en prod es legitimo (el admin real vive alli), pero que ocurra
  // por accidente no. Mismo guard que scripts/indices.ts.
  if (esBaseDeProduccion() && !process.argv.includes("--permitir-prod")) {
    console.error(
      `Este script apunta a "${base}". Si de verdad quieres tocar produccion, ` +
        "vuelve a lanzarlo con --permitir-prod.",
    );
    process.exit(1);
  }

  const indiceRol = process.argv.indexOf("--rol");
  const rol = rolAlmacenadoSchema.parse(
    indiceRol === -1 ? "registrado" : process.argv[indiceRol + 1],
  );

  console.log(`Alta de usuario con rol "${rol}" en la base "${base}".`);

  const email = await preguntar("Correo: ");
  const nombre = await preguntar("Nombre: ");
  const contrasena = await preguntarOculto("Contrasena (no se muestra): ");

  if (contrasena.length < 8) {
    console.error("La contrasena necesita al menos 8 caracteres.");
    process.exit(1);
  }
  if (contrasena !== (await preguntarOculto("Repitela: "))) {
    console.error("No coinciden.");
    process.exit(1);
  }

  // Importar aqui y no arriba: src/lib/auth.ts conecta con Mongo al cargarse, y
  // los guards de antes tienen que poder correr (y abortar) sin tocar la red.
  const { auth } = await import("../src/lib/auth");

  const { user } = await auth.api.createUser({
    body: { email, password: contrasena, name: nombre, role: rol },
  });

  console.log(`Listo: ${user.email} (id ${user.id}, rol "${rol}").`);
  rl.close();
  await (await obtenerCliente()).close();
}

principal().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
