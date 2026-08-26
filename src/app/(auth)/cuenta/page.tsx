import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/sesion";
import { recetasGuardadasDe } from "@/lib/guardadas";
import { rolDeSesion } from "@/models/usuario";
import { BotonSalir } from "@/components/boton-salir";
import { ListaGuardadas } from "@/components/lista-guardadas";
import { Logo } from "@/components/logo";

/**
 * Tu cuaderno. Las guardadas abren la pagina: es a lo que se viene. Los datos
 * administrativos (correo, Salir) son el pie, y el rol no se ensena nunca: si
 * eres admin existe «Ir al panel», y esa es toda la senal.
 *
 * Pagina de servidor: la sesion y las guardadas se resuelven aqui, con el rol
 * de la sesion, y no contiene ningun formulario (entrar vive en /login).
 */

export const metadata: Metadata = { title: "Tu cuaderno" };

export default async function PaginaCuenta() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login?volver=/cuenta");

  const rol = rolDeSesion(sesion.user.role);
  const guardadas = await recetasGuardadasDe(sesion.user.id, rol);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-9 px-8 py-16">
      <div className="flex items-center gap-4">
        <Logo tamano={56} />
        <div className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.3em] text-tinta/50">
            Tu cuaderno
          </span>
          <h1 className="font-[family-name:var(--font-bricolage)] text-[27px] font-extrabold leading-none tracking-[-0.03em]">
            Hola, {sesion.user.name}
          </h1>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.24em] text-acento">
          Tus recetas guardadas
        </h2>
        <ListaGuardadas iniciales={guardadas} />
      </section>

      {rol === "admin" && (
        <Link
          href="/admin"
          className="self-start rounded-full bg-tinta px-6 py-3 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.14em] text-papel hover:bg-acento hover:text-papel"
        >
          Ir al panel
        </Link>
      )}

      <div className="flex items-baseline justify-between gap-4 border-t border-tinta/15 pt-4">
        <span className="min-w-0 truncate text-[13px] text-tinta/55">{sesion.user.email}</span>
        <BotonSalir className="shrink-0 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.14em] text-acento hover:text-tinta disabled:opacity-60" />
      </div>
    </main>
  );
}
