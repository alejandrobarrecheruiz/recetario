import { redirect } from "next/navigation";
import { rolActual } from "@/lib/sesion";

// Guard de rol admin. La sesion se resuelve EN EL SERVIDOR y cubre todas las
// rutas de /admin de una vez.
//
// Protege la NAVEGACION, no los datos: un layout no se ejecuta cuando alguien
// llama a /api/recetas a pelo, asi que cada handler de la API comprueba el rol
// por su cuenta.
//
// El layout no pinta cromo: el editor ocupa la pantalla entera con su propia
// barra, y el listado y el alta traen su cabecera (CabeceraPanel).
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  // `volver` es la excepcion a "el login aterriza en la portada": quien tecleo
  // /admin a proposito vuelve aqui tras identificarse.
  if ((await rolActual()) !== "admin") redirect("/login?volver=/admin");

  return <>{children}</>;
}
