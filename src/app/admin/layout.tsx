import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { rolDeSesion } from "@/models/usuario";
import { BotonSalir } from "@/components/boton-salir";

// Guard de rol admin. La sesion se resuelve EN EL SERVIDOR y cubre todas las
// rutas de /admin de una vez.
//
// Protege la NAVEGACION, no los datos: un layout no se ejecuta cuando alguien
// llama a /api/recetas a pelo, asi que cada handler de la API comprueba el rol
// por su cuenta.
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const sesion = await auth.api.getSession({ headers: await headers() });
  if (rolDeSesion(sesion?.user.role) !== "admin") redirect("/login");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-semibold">Panel</h1>
        <BotonSalir />
      </header>
      {children}
    </div>
  );
}
