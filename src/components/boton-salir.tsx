"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

/**
 * El «Salir» de la navegación pública: mismo aspecto que los enlaces de la
 * barra (icono en el móvil, palabra en pantalla ancha). Tras cerrar sesión
 * vuelve a la portada, ya como público.
 */
export function SalirNavegacion() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Cerrar sesión"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full sm:h-auto sm:w-auto sm:px-3.5 sm:py-2"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sm:hidden"
        aria-hidden="true"
      >
        <path d="M10 4H5v16h5" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </svg>
      <span className="hidden sm:inline">Salir</span>
    </button>
  );
}

export function BotonSalir() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-full border border-tinta/25 px-4 py-2 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.14em] text-tinta/70 hover:border-tinta hover:text-tinta"
      onClick={async () => {
        await signOut();
        router.push("/login");
        // Sin refresh, el arbol de servidor cacheado seguiria pintado como si
        // hubiera sesion.
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
