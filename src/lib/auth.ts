// TODO(fase 3): instancia de servidor de Better Auth.
//
// Aqui va el `betterAuth({...})` con el adaptador de MongoDB y el plugin `admin`.
// La API de abajo esta verificada contra la documentacion oficial de Better Auth
// 1.7.x (agosto de 2026); no hay que volver a investigarla.
//
//   import { betterAuth } from "better-auth";
//   import { mongodbAdapter } from "better-auth/adapters/mongodb";
//   import { admin } from "better-auth/plugins";
//   import { obtenerCliente, obtenerDb } from "@/lib/mongo";
//
//   const cliente = await obtenerCliente();
//   const db = await obtenerDb();
//
//   export const auth = betterAuth({
//     database: mongodbAdapter(db, { client: cliente }), // `client` habilita transacciones
//     emailAndPassword: { enabled: true },
//     plugins: [admin()],
//   });
//
// Notas:
//   - El adaptador recibe el `Db`, no el `MongoClient`.
//   - En MongoDB no hay que generar ni migrar esquema: Better Auth crea las
//     colecciones `user`, `session`, `account` y `verification` al vuelo.
//   - El plugin `admin` anade a `user`: role, banned, banReason, banExpires; y a
//     `session`: impersonatedBy.
//   - Lee BETTER_AUTH_SECRET y BETTER_AUTH_URL del entorno.
//   - El usuario admin se crea a mano (fase 3): registrarse por la web y luego
//     poner `role: "admin"` en el documento de `user`.
//   - NO usar NextAuth. El equipo de Auth.js se integro en Better Auth en
//     septiembre de 2025. Ver CLAUDE.md.

export {};
