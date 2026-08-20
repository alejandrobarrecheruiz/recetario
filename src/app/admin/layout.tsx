// TODO(fase 3): guard de rol admin.
//
// Se resuelve la sesion EN EL SERVIDOR y, si `rolDeSesion(...)` no es "admin",
// se redirige a /login. El guard va aqui, en el layout, para que cubra todas las
// rutas de /admin de una vez.
//
//   import { redirect } from "next/navigation";
//   import { headers } from "next/headers";
//   import { auth } from "@/lib/auth";
//   import { rolDeSesion } from "@/models/usuario";
//
//   const sesion = await auth.api.getSession({ headers: await headers() });
//   if (rolDeSesion(sesion?.user.role) !== "admin") redirect("/login");
//
// Este guard protege la NAVEGACION. No protege los datos: cada ruta de
// /api/recetas tiene que comprobar el rol por su cuenta. Un layout no se ejecuta
// cuando alguien llama a la API a pelo.

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="border-b pb-4">
        <h1 className="text-xl font-semibold">Panel</h1>
      </header>
      {children}
    </div>
  );
}
