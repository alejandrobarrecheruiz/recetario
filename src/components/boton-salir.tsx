"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

/**
 * Salir responde al toque: el boton pasa a «Saliendo...» al momento y se
 * aterriza SIEMPRE en la portada, ya como publico. Igual que entrar: la
 * portada es donde se cae, el resto son enlaces que se eligen.
 */
export function BotonSalir({ className }: { className?: string }) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  return (
    <button
      type="button"
      disabled={saliendo}
      className={
        className ??
        "rounded-full border border-tinta/25 px-4 py-2 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.14em] text-tinta/70 hover:border-tinta hover:text-tinta disabled:opacity-60"
      }
      onClick={async () => {
        setSaliendo(true);
        await signOut();
        router.push("/");
        // Sin refresh, el arbol de servidor cacheado seguiria pintado como si
        // hubiera sesion.
        router.refresh();
      }}
    >
      {saliendo ? "Saliendo..." : "Salir"}
    </button>
  );
}
