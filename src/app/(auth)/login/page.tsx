"use client";

import { useEffect, useState, type FormEvent } from "react";
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

/** Lo que devuelve GET /api/guardadas para cada receta guardada. */
type RecetaGuardada = {
  recetaId: string;
  slug: string;
  titulo: string;
  categoria: string;
  tiempo: string;
};

export default function PaginaCuenta() {
  const router = useRouter();
  const { data: sesion, isPending } = useSession();

  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Con sesión, la cuenta enseña las recetas guardadas (null = cargando).
  const [recetasGuardadas, setRecetasGuardadas] = useState<RecetaGuardada[] | null>(null);
  const usuarioId = sesion?.user.id;
  useEffect(() => {
    if (!usuarioId) return;
    let cancelado = false;
    fetch("/api/guardadas")
      .then((respuesta) => (respuesta.ok ? respuesta.json() : []))
      .then((lista: RecetaGuardada[]) => {
        if (!cancelado) setRecetasGuardadas(lista);
      })
      .catch(() => {
        if (!cancelado) setRecetasGuardadas([]);
      });
    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  async function quitarGuardada(recetaId: string) {
    const respuesta = await fetch(`/api/guardadas/${recetaId}`, { method: "DELETE" });
    if (respuesta.ok) {
      setRecetasGuardadas((lista) =>
        lista === null ? null : lista.filter((receta) => receta.recetaId !== recetaId),
      );
    }
  }

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

        <div className="flex flex-col gap-1">
          <h2 className="mb-2 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.24em] text-acento">
            Tus recetas guardadas
          </h2>
          {recetasGuardadas === null ? (
            <p className="text-sm text-tinta/50">Un momento...</p>
          ) : recetasGuardadas.length === 0 ? (
            <p className="max-w-[36ch] text-[14px] leading-relaxed text-tinta/55">
              Aún no has guardado ninguna. El corazón que hay junto a cada receta
              las trae aquí.
            </p>
          ) : (
            <ul className="flex flex-col">
              {recetasGuardadas.map((receta) => (
                <li
                  key={receta.recetaId}
                  className="flex items-center gap-3 border-t border-tinta/10 py-2"
                >
                  <Link href={`/recetas/${receta.slug}`} className="min-w-0 flex-1 py-1">
                    <span className="block truncate text-[15px]">{receta.titulo}</span>
                    <span className="block font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.16em] text-tinta/45">
                      {receta.categoria} · {receta.tiempo}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => quitarGuardada(receta.recetaId)}
                    aria-label={`Quitar «${receta.titulo}» de guardadas`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-acento hover:text-tinta"
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20.5C7.2 16.7 3.5 13.5 3.5 9.8 3.5 7.1 5.5 5 8 5c1.6 0 3.1.9 4 2.2C12.9 5.9 14.4 5 16 5c2.5 0 4.5 2.1 4.5 4.8 0 3.7-3.7 6.9-8.5 10.7Z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
