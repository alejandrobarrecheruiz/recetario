"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function RecuperarAcceso({ token, enlaceInvalido }: { token?: string; enlaceInvalido: boolean }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    if (token && contrasena !== repetida) { setError("Las contraseñas no coinciden."); return; }
    setEnviando(true);
    try {
      const resultado = token
        ? await authClient.resetPassword({ token, newPassword: contrasena })
        : await authClient.requestPasswordReset({ email: correo, redirectTo: "/recuperar" });
      if (resultado.error) {
        setError(resultado.error.status === 429 ? "Espera un minuto antes de volver a intentarlo." : token ? "El enlace ha caducado o ya se ha usado. Pide uno nuevo." : "No se pudo enviar la solicitud. Inténtalo más tarde.");
        return;
      }
      setTerminado(true);
      setContrasena("");
      setRepetida("");
      setMensaje(token ? "Contraseña cambiada. Ya puedes entrar; las sesiones anteriores se han cerrado." : "Si hay una cuenta con ese correo, recibirás un enlace. Revisa también el spam.");
    } catch {
      setError("No hay conexión. Inténtalo de nuevo en un momento.");
    } finally { setEnviando(false); }
  }

  const campo = "rounded border border-tinta/25 bg-transparent p-3";
  return <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-8 py-16">
    <h1 className="text-3xl">{token ? "Una contraseña nueva" : "Recuperar el acceso"}</h1>
    {enlaceInvalido && <p role="alert">El enlace no es válido o ha caducado. Puedes pedir otro aquí.</p>}
    {!terminado && <form className="flex flex-col gap-5" onSubmit={enviar}>
      {token ? <>
        <label className="flex flex-col gap-2">Nueva contraseña<input className={campo} type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={contrasena} onChange={(e) => setContrasena(e.target.value)} /></label>
        <label className="flex flex-col gap-2">Repite la contraseña<input className={campo} type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={repetida} onChange={(e) => setRepetida(e.target.value)} /></label>
      </> : <label className="flex flex-col gap-2">Correo<input className={campo} type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>}
      <button className="rounded-full bg-tinta px-6 py-3 text-papel disabled:opacity-50" disabled={enviando}>{enviando ? "Un momento…" : token ? "Cambiar contraseña" : "Enviar enlace"}</button>
    </form>}
    {error && <p role="alert" className="text-acento">{error}</p>}
    {mensaje && <p role="status">{mensaje}</p>}
    {token && <Link className="underline" href="/recuperar">Pedir otro enlace</Link>}
    <Link className="underline" href="/login">Volver a entrar</Link>
  </main>;
}
