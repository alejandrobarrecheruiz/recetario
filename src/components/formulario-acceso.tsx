"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient, signIn, signUp, useSession } from "@/lib/auth-client";
import { destinoInterno } from "@/lib/navegacion";
import { Logo } from "@/components/logo";
import { guardadoPendiente, olvidarGuardado } from "@/lib/guardado-pendiente";

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
    return "Si este correo puede registrarse, recibirás un enlace de confirmación. Si ya tienes cuenta, entra o recupera tu acceso.";
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
  return destinoInterno(volver, window.location.origin);
}

export function FormularioAcceso({ permiteRegistro }: { permiteRegistro: boolean }) {
  const router = useRouter();
  const { data: sesion, isPending } = useSession();

  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const entrando = useRef(false);
  const [segundoFactor, setSegundoFactor] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [usarRecuperacion, setUsarRecuperacion] = useState(false);
  const [falloGuardado, setFalloGuardado] = useState(false);

  const finalizarEntrada = useCallback(async (destinoPorDefecto = "/") => {
    entrando.current = true;
    setEnviando(true);
    setFalloGuardado(false);
    let pendiente: string | null = null;
    const destino = destinoTrasEntrar();
    try { pendiente = guardadoPendiente(window.sessionStorage, destino, window.location.origin); }
    catch { /* Acceso funcional también sin almacenamiento. */ }
    try {
      if (pendiente) {
        const respuesta = await fetch(`/api/guardadas/${pendiente}`, { method: "POST" });
        if (!respuesta.ok) {
          setError(respuesta.status === 404 ? "Esta receta ya no está disponible para guardar." : "Has entrado, pero no se pudo guardar la receta. Puedes reintentarlo.");
          setFalloGuardado(true);
          return;
        }
        olvidarGuardado(window.sessionStorage);
      }
      router.replace(pendiente || new URLSearchParams(window.location.search).has("volver") ? destino : destinoPorDefecto);
      router.refresh();
    } catch {
      setError("Has entrado, pero se perdió la conexión al guardar. Puedes reintentarlo.");
      setFalloGuardado(true);
    } finally { setEnviando(false); }
  }, [router]);

  // Con sesión no hay nada que hacer aquí: tu cuenta es /cuenta.
  const conSesion = Boolean(sesion);
  useEffect(() => {
    if (conSesion && !entrando.current) {
      entrando.current = true;
      void Promise.resolve().then(() => finalizarEntrada("/cuenta"));
    }
  }, [conSesion, finalizarEntrada]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);
    entrando.current = true;

    try {
    if (segundoFactor) {
      const resultado = usarRecuperacion
        ? await authClient.twoFactor.verifyBackupCode({ code: codigo.trim() })
        : await authClient.twoFactor.verifyTotp({ code: codigo.trim() });
      if (resultado.error) {
        setError("No se pudo verificar el código. Compruébalo y vuelve a intentarlo.");
        return;
      }
      await finalizarEntrada();
      return;
    }

    if (modo === "entrar") {
      const { data, error: fallo } = await signIn.email({
        email: correo,
        password: contrasena,
      });
      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
        setSegundoFactor(true);
        setContrasena("");
        return;
      }
      if (fallo) {
        setError(fallo.status === 429 ? "Demasiados intentos. Espera un minuto antes de volver a entrar." : fallo.code === "EMAIL_NOT_VERIFIED" ? "Confirma tu correo antes de entrar. Te hemos enviado un enlace; revisa también el spam." : traducirFallo(fallo.message, false));
        setEnviando(false);
        return;
      }
      await finalizarEntrada();
      return;
    }

    const { error: fallo } = await signUp.email({
      name: nombre.trim() === "" ? correo : nombre.trim(),
      email: correo,
      password: contrasena,
      callbackURL: `/login?verificado=1&volver=${encodeURIComponent(destinoTrasEntrar())}`,
    });
    if (fallo) {
      setError(traducirFallo(fallo.message, true));
      setEnviando(false);
      return;
    }
    setAviso("Si este correo puede registrarse, recibirás un enlace de confirmación. Revisa tu bandeja y el spam antes de entrar.");
    setContrasena("");
    setModo("entrar");
    entrando.current = false;
    } catch {
      setError("No hay conexión. Vuelve a intentarlo en un momento.");
    } finally {
      setEnviando(false);
    }
  }

  if (falloGuardado) {
    return <main className="pagina-lectura flex flex-1 flex-col justify-center gap-6 py-16">
      <h1 className="text-2xl">Tu receta guardada</h1>
      <p role="alert">{error}</p>
      <button type="button" disabled={enviando} className={claseBotonPrincipal} onClick={() => void finalizarEntrada()}>Reintentar guardado</button>
      <button type="button" onClick={() => {
        try { olvidarGuardado(window.sessionStorage); } catch { /* Almacenamiento bloqueado. */ }
        router.replace(destinoTrasEntrar()); router.refresh();
      }}>Continuar sin guardar</button>
    </main>;
  }

  if (isPending || conSesion) {
    return <main className="min-h-svh" />;
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-8 py-16">
      <div className="flex items-center gap-4">
        <Logo tamano={56} />
        <div className="flex flex-col gap-1">
          <span className="font-display text-xl font-medium leading-tight tracking-tight">
            Mi libro de recetas
          </span>
          <h1 className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.3em] text-tinta/50">
            {modo === "entrar" ? "Entrar" : "Crear cuenta"}
          </h1>
        </div>
      </div>

      {!segundoFactor && permiteRegistro && <div className="flex gap-0.5 self-start rounded-full bg-tinta/10 p-[3px]">
        {(
          [
            ["entrar", "Entrar"],
            ["crear", "Crear cuenta"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            disabled={enviando}
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
      </div>}

      <form className="flex flex-col gap-6" onSubmit={enviar}>
        {segundoFactor ? <>
          <label className={claseEtiqueta}>{usarRecuperacion ? "Código de recuperación" : "Código de tu aplicación"}
            <input className={claseCampo} autoComplete="one-time-code" inputMode={usarRecuperacion ? "text" : "numeric"} required value={codigo} onChange={(evento) => setCodigo(evento.target.value)} />
          </label>
          <button type="button" onClick={() => { setUsarRecuperacion(!usarRecuperacion); setCodigo(""); }}>
            {usarRecuperacion ? "Usar la aplicación" : "Usar un código de recuperación"}
          </button>
        </> : <>
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
          Contraseña
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
        </>}
        {error && <p role="alert" className="text-sm text-acento">{error}</p>}
        {aviso && <p role="status" className="text-sm">{aviso}</p>}
        {!segundoFactor && modo === "entrar" && permiteRegistro && <Link className="text-sm underline" href="/recuperar">He olvidado la contraseña</Link>}
        {!permiteRegistro && <p className="text-sm text-tinta/60">Las nuevas cuentas están temporalmente cerradas. Puedes entrar si ya tienes una.</p>}

        <button type="submit" disabled={enviando} className={claseBotonPrincipal}>
          {segundoFactor ? (enviando ? "Verificando…" : "Verificar") : enviando
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
