"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp, signOut, useSession } from "@/lib/auth-client";
import { rolDeSesion } from "@/models/usuario";
import { Logo } from "@/components/logo";

/**
 * El panel de cuenta: iniciar sesión, crear cuenta (el registro está abierto)
 * y, con sesión, ver la cuenta y salir. La figura de persona de la cabecera
 * trae siempre aquí.
 *
 * Tras entrar se aterriza SIEMPRE como lector, sea cual sea el rol: la
 * portada, o la ruta interna de `?volver=` si el login interceptó la
 * navegación (el guard de /admin). El panel nunca es un destino forzado:
 * es el enlace «Ir al panel» de la vista de cuenta.
 */

const claseEtiqueta =
  "flex flex-col gap-2 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.2em] text-tinta/50";
const claseCampo =
  "border-b border-tinta/25 bg-transparent pb-2.5 font-[family-name:var(--font-cuerpo)] text-base normal-case tracking-normal text-tinta outline-none focus:border-tinta";
const claseBotonPrincipal =
  "mt-2 self-start rounded-full bg-tinta px-7 py-3.5 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.14em] text-papel hover:bg-acento disabled:opacity-50";

/** Los fallos de Better Auth llegan en inglés; se cuentan en el idioma de la casa. */
function traducirFallo(mensaje: string | undefined, creando: boolean): string {
  const texto = (mensaje ?? "").toLowerCase();
  if (texto.includes("password") && (texto.includes("short") || texto.includes("length"))) {
    return "La contraseña necesita al menos 8 caracteres.";
  }
  if (texto.includes("already") || texto.includes("exist")) {
    return "Ya hay una cuenta con ese correo.";
  }
  return creando
    ? "No se pudo crear la cuenta. Revisa los datos."
    : // Mensaje único a propósito: distinguir "no existe" de "contraseña mal"
      // le diría a un desconocido qué correos tienen cuenta.
      "No se pudo entrar. Revisa el correo y la contraseña.";
}

/** Solo rutas internas: un `?volver=` con URL absoluta o `//` no redirige fuera. */
function destinoTrasEntrar(): string {
  const volver = new URLSearchParams(window.location.search).get("volver");
  if (volver !== null && volver.startsWith("/") && !volver.startsWith("//")) return volver;
  return "/";
}

export default function PaginaCuenta() {
  const router = useRouter();
  const { data: sesion, isPending } = useSession();

  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    if (modo === "entrar") {
      const { error: fallo } = await signIn.email({
        email: correo,
        password: contrasena,
      });
      if (fallo) {
        setError(traducirFallo(fallo.message, false));
        setEnviando(false);
        return;
      }
      router.push(destinoTrasEntrar());
      router.refresh();
      return;
    }

    const { error: fallo } = await signUp.email({
      name: nombre.trim() === "" ? correo : nombre.trim(),
      email: correo,
      password: contrasena,
    });
    if (fallo) {
      setError(traducirFallo(fallo.message, true));
      setEnviando(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (isPending) {
    return <main className="min-h-svh" />;
  }

  // --- Con sesión: tu cuenta. ---
  if (sesion) {
    const rol = rolDeSesion((sesion.user as { role?: string | null }).role);
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-8 py-16">
        <div className="flex items-center gap-4">
          <Logo tamano={56} />
          <div className="flex flex-col gap-1">
            <span className="font-[family-name:var(--font-pinyon)] text-[26px] leading-[0.9]">
              Mi libro de recetas
            </span>
            <h1 className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.3em] text-tinta/50">
              Tu cuenta
            </h1>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-baseline justify-between gap-4 border-t border-tinta/10 py-3">
            <span className="text-sm text-tinta/60">Nombre</span>
            <span className="text-[15px]">{sesion.user.name}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-tinta/10 py-3">
            <span className="text-sm text-tinta/60">Correo</span>
            <span className="text-[15px]">{sesion.user.email}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-y border-tinta/10 py-3">
            <span className="text-sm text-tinta/60">Cuenta</span>
            <span className="rounded-full border border-tinta/25 px-2.5 py-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.14em] text-tinta/60">
              {rol}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {rol === "admin" && (
            <Link
              href="/admin"
              className="rounded-full bg-tinta px-6 py-3 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.14em] text-papel hover:bg-acento hover:text-papel"
            >
              Ir al panel
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="rounded-full border border-tinta/25 px-6 py-3 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.14em] text-tinta/70 hover:border-tinta hover:text-tinta"
          >
            Salir
          </button>
        </div>
      </main>
    );
  }

  // --- Sin sesión: entrar o crear cuenta. ---
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-8 py-16">
      <div className="flex items-center gap-4">
        <Logo tamano={56} />
        <div className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-pinyon)] text-[26px] leading-[0.9]">
            Mi libro de recetas
          </span>
          <h1 className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.3em] text-tinta/50">
            {modo === "entrar" ? "Entrar" : "Crear cuenta"}
          </h1>
        </div>
      </div>

      <div className="flex gap-0.5 self-start rounded-full bg-tinta/10 p-[3px]">
        {(
          [
            ["entrar", "Entrar"],
            ["crear", "Crear cuenta"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => {
              setModo(valor);
              setError(null);
            }}
            className={`rounded-full px-4 py-2 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.12em] ${
              modo === valor ? "bg-acento text-[#f1f6f8]" : "text-tinta/60 hover:text-tinta"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <form className="flex flex-col gap-6" onSubmit={enviar}>
        {modo === "crear" && (
          <label className={claseEtiqueta}>
            Nombre
            <input
              name="name"
              autoComplete="name"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className={claseCampo}
            />
          </label>
        )}

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
            autoComplete={modo === "crear" ? "new-password" : "current-password"}
            required
            minLength={modo === "crear" ? 8 : undefined}
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            className={claseCampo}
          />
        </label>

        {modo === "crear" && (
          <p className="text-[13px] leading-relaxed text-tinta/55">
            Con cuenta puedes ver también las recetas que no son públicas.
          </p>
        )}
        {error && <p className="text-sm text-acento">{error}</p>}

        <button type="submit" disabled={enviando} className={claseBotonPrincipal}>
          {enviando
            ? modo === "entrar"
              ? "Entrando..."
              : "Creando..."
            : modo === "entrar"
              ? "Entrar"
              : "Crear cuenta"}
        </button>
      </form>
    </main>
  );
}
