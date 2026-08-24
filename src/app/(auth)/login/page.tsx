"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

// No hay registro abierto: las cuentas las da de alta el admin (por ahora con
// scripts/crear-usuario.ts). Por eso aqui solo hay login.
export default function PaginaLogin() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    const { data, error: fallo } = await signIn.email({
      email: correo,
      password: contrasena,
    });

    if (fallo) {
      // Mensaje unico a proposito: distinguir "no existe" de "contrasena mal"
      // le diria a un desconocido que correos tienen cuenta.
      setError("No se pudo entrar. Revisa el correo y la contrasena.");
      setEnviando(false);
      return;
    }

    const rol = (data?.user as { role?: string | null } | undefined)?.role;
    router.push(rol === "admin" ? "/admin" : "/");
    // Refresca el arbol de servidor para que se pinte ya con la sesion nueva.
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Entrar</h1>

      <form className="flex flex-col gap-3" onSubmit={entrar}>
        <label className="flex flex-col gap-1 text-sm">
          Correo
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            className="rounded border px-3 py-2 text-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Contrasena
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            className="rounded border px-3 py-2 text-base"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="rounded border px-3 py-2 font-medium disabled:opacity-50"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
