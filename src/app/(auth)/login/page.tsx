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

  const claseEtiqueta =
    "flex flex-col gap-2 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.2em] text-tinta/50";
  const claseCampo =
    "border-b border-tinta/25 bg-transparent pb-2.5 font-[family-name:var(--font-cuerpo)] text-base normal-case tracking-normal text-tinta outline-none focus:border-tinta";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-8 py-16">
      <div className="flex flex-col gap-1.5">
        <span className="font-[family-name:var(--font-pinyon)] text-[29px] leading-[0.9]">
          Mi libro de recetas
        </span>
        <h1 className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.3em] text-tinta/50">
          Entrar
        </h1>
      </div>

      <form className="flex flex-col gap-6" onSubmit={entrar}>
        <label className={claseEtiqueta}>
          Correo
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            className={claseCampo}
          />
        </label>

        <label className={claseEtiqueta}>
          Contrasena
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            className={claseCampo}
          />
        </label>

        {error && <p className="text-sm text-acento">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 self-start rounded-full bg-tinta px-7 py-3.5 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.14em] text-papel hover:bg-acento disabled:opacity-50"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
