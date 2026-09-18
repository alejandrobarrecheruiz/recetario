import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin, twoFactor } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { ObjectId } from "mongodb";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";
import { obtenerCliente, obtenerDb } from "@/lib/mongo";
import { ROL_POR_DEFECTO } from "@/models/usuario";
import { after } from "next/server";
import { correoConfigurado, enviarCorreoAcceso } from "@/lib/correo";

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
  appName: "Mi libro de recetas",
  database: mongodbAdapter(db, { client: cliente }),
  advanced: {
    backgroundTasks: { handler: (tarea) => { after(async () => { await tarea; }); } },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },

  emailAndPassword: {
    enabled: true,
    // No crear cuentas sin un medio de verificar y recuperar el acceso.
    disableSignUp: !correoConfigurado(),
    autoSignIn: false,
    requireEmailVerification: correoConfigurado(),
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      await enviarCorreoAcceso(user.email, url, "recuperar");
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: correoConfigurado(),
    autoSignInAfterVerification: false,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) => {
      await enviarCorreoAcceso(user.email, url, "verificar");
    },
  },

  plugins: [
    twoFactor(),
    admin({
      ac: control,
      roles,
      // Sin esto el plugin pondria `role: "user"`, que no es un rol del dominio.
      defaultRole: ROL_POR_DEFECTO,
    }),
  ],
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (usuario) => {
        const almacenado = await db.collection("user").findOne({ _id: new ObjectId(usuario.id) });
        if (almacenado?.role === "admin") {
          throw new APIError("FORBIDDEN", { message: "La cuenta que mantiene el cuaderno no se puede eliminar desde aquí." });
        }
        await db.collection("saves").deleteMany({ usuarioId: new ObjectId(usuario.id) });
      },
      afterDelete: async (usuario) => {
        await db.collection("twoFactor").deleteMany({ userId: new ObjectId(usuario.id) });
      },
    },
  },
});
