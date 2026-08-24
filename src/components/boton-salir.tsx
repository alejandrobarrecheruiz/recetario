"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function BotonSalir() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-sm underline opacity-70 hover:opacity-100"
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
