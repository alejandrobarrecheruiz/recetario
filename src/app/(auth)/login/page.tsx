"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import { Logo } from "@/components/logo";

/**
 * Entrar y crear cuenta, y solo eso: tu cuenta vive en /cuenta (con sesión,
 * esta página reenvía allí, lo que además corta el bucle del guard de /admin
 * para quien no es admin).
 *
 * Tras entrar se aterriza SIEMPRE como lector, sea cual sea el rol: la
 * portada, o la ruta interna de `?volver=` si el login interceptó la
 * navegación (el guard de /admin, la figura de persona sin sesión). El panel
 * nunca es un destino forzado: es el enlace «Ir al panel» de /cuenta.
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

export default function PaginaLogin() {
  const router = useRouter();
  const { data: sesion, isPending } = useSession();

  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Con sesión no hay nada que hacer aquí: tu cuenta es /cuenta.
  const conSesion = Boolean(sesion);
  useEffect(() => {
    if (conSesion) router.replace("/cuenta");
  }, [conSesion, router]);

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
    router.push(destinoTrasEntrar());
    router.refresh();
  }

  if (isPending || conSesion) {
    return <main className="min-h-svh" />;
  }

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
