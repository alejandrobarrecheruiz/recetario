import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/sesion";
import { recetasGuardadasDe } from "@/lib/guardadas";
import { rolDeSesion } from "@/models/usuario";
import { inicialesDelNombre } from "@/lib/presentacion-cuenta";
import { ListaGuardadas } from "@/components/lista-guardadas";
import { CabeceraPublica } from "@/components/cabecera-publica";
import { AjustesCuenta } from "@/components/ajustes-cuenta";

export const metadata: Metadata = { title: "Tu cuenta", robots: { index: false, follow: false } };

/** Identidad y guardadas, resueltas con la sesión del servidor. */
export default async function PaginaCuenta() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login?volver=/cuenta");
  const rol = rolDeSesion(sesion.user.role);
  const guardadas = await recetasGuardadasDe(sesion.user.id, rol);

  return <>
    <CabeceraPublica />
    <main className="flex-1 bg-superficie">
      <div className="pagina-cuenta">
        <section className="cuenta-identidad" aria-label="Tu cuenta">
          <div className="cuenta-avatar" aria-hidden="true">{inicialesDelNombre(sesion.user.name)}</div>
          <div className="cuenta-nombre"><h1>{sesion.user.name}</h1><p>{sesion.user.email}</p></div>
          <AjustesCuenta nombreInicial={sesion.user.name} correo={sesion.user.email} esAdmin={rol === "admin"} segundoFactorInicial={Boolean(sesion.user.twoFactorEnabled)} />
        </section>
        <ListaGuardadas iniciales={guardadas} esAdmin={rol === "admin"} />
      </div>
    </main>
  </>;
}
