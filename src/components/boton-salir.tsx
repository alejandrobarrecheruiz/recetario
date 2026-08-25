"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

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
