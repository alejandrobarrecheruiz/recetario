import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";
import { obtenerCliente, obtenerDb } from "@/lib/mongo";
import { ROL_POR_DEFECTO } from "@/models/usuario";

/**
 * Instancia de servidor de Better Auth.
 *
 * Solo de servidor: lee BETTER_AUTH_SECRET y BETTER_AUTH_URL del entorno y
 * recibe el cliente de Mongo. El navegador usa src/lib/auth-client.ts.
 *
 * Las colecciones `user`, `session`, `account` y `verification` las crea el
 * adaptador al vuelo; no se declaran ni se migran esquemas.
 */

// El adaptador recibe el `Db`; pasarle tambien el cliente habilita transacciones.
// El await de nivel de modulo reutiliza la promesa cacheada de mongo.ts, asi que
// no abre conexiones de mas.
const cliente = await obtenerCliente();
const db = await obtenerDb();

// Los roles del plugin, declarados con el vocabulario del dominio: "registrado"
// en vez del "user" que trae por defecto. Los permisos son los estandar del
// plugin; lo unico que cambia es el nombre. Con esto `createUser` acepta (y
// tipa) exactamente los valores de rolAlmacenadoSchema y rechaza el resto.
const control = createAccessControl(defaultStatements);
const roles = {
  admin: control.newRole(adminAc.statements),
  registrado: control.newRole(userAc.statements),
};

export const auth = betterAuth({
  database: mongodbAdapter(db, { client: cliente }),

  emailAndPassword: {
    enabled: true,
    // Registro abierto: cualquiera crea cuenta en /login y entra como
    // "registrado". El rol admin solo se da por scripts/crear-usuario.ts.
    disableSignUp: false,
  },

  plugins: [
    admin({
      ac: control,
      roles,
      // Sin esto el plugin pondria `role: "user"`, que no es un rol del dominio.
      defaultRole: ROL_POR_DEFECTO,
    }),
  ],
});
