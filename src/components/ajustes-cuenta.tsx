"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { BotonSalir } from "@/components/boton-salir";

export function AjustesCuenta({ nombreInicial, correo, esAdmin, segundoFactorInicial }: {
  nombreInicial: string; correo: string; esAdmin: boolean; segundoFactorInicial: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const id = useId();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(nombreInicial);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [segundoFactor, setSegundoFactor] = useState(segundoFactorInicial);
  const [configuracion, setConfiguracion] = useState<{ secreto: string; codigos: string[] } | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const campo = "cuenta-campo";
  const boton = "cuenta-boton";

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, [abierto]);

  async function ejecutar(accion: () => Promise<void>) {
    if (ocupado) return;
    setOcupado(true); setMensaje("");
    try { await accion(); } catch { setMensaje("No se pudo completar. Comprueba los datos y la conexión."); }
    finally { setOcupado(false); }
  }

  async function cambiarContrasena(evento: FormEvent) {
    evento.preventDefault();
    if (nueva !== repetida) { setMensaje("Las contraseñas nuevas no coinciden."); return; }
    await ejecutar(async () => {
      const resultado = await authClient.changePassword({ currentPassword: actual, newPassword: nueva, revokeOtherSessions: true });
      if (resultado.error) throw new Error("contraseña");
      setActual(""); setNueva(""); setRepetida("");
      setMensaje("Contraseña cambiada. Se han cerrado las demás sesiones.");
    });
  }

  return (
    <>
      <button ref={disparador} type="button" className="icono-cabecera cuenta-ajustes-disparador" aria-label="Ajustes de cuenta" title="Ajustes de cuenta" aria-haspopup="dialog" aria-controls={id} aria-expanded={abierto} onClick={() => { dialogo.current?.showModal(); setAbierto(true); }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l2-3 3-1 2-3-2-2 1-3-3-2-1-3Z" /><circle cx="10.5" cy="11.5" r="3" /></svg>
      </button>
      <dialog ref={dialogo} id={id} className="cuenta-ajustes" aria-labelledby={`${id}-titulo`} onCancel={evento => { if (ocupado) evento.preventDefault(); }} onClose={() => {
        setAbierto(false); setActual(""); setNueva(""); setRepetida(""); setCodigo(""); setConfirmacion(""); setMensaje("");
        disparador.current?.focus();
      }}>
        <div className="cuenta-ajustes-cabecera"><h2 id={`${id}-titulo`}>Tu cuenta</h2><button type="button" className="icono-cabecera" disabled={ocupado} aria-label="Cerrar ajustes" onClick={() => dialogo.current?.close()}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div>
      <div className="cuenta-ajustes-contenido" aria-busy={ocupado}>
        <section className="cuenta-ajustes-grupo"><h3>Perfil</h3><p>{nombreInicial}</p><p className="cuenta-correo">{correo}</p>
        <details className="cuenta-editar"><summary>Editar nombre</summary>
        <form className="flex flex-col gap-3" onSubmit={(evento) => { evento.preventDefault(); void ejecutar(async () => {
          const resultado = await authClient.updateUser({ name: nombre.trim() });
          if (resultado.error) throw new Error("nombre");
          setMensaje("Nombre actualizado."); router.refresh();
        }); }}>
          <label>Tu nombre<input className={campo} required maxLength={100} autoComplete="name" value={nombre} onChange={(evento) => setNombre(evento.target.value)} /></label>
          <button disabled={ocupado} className={boton}>Guardar nombre</button>
        </form>
        </details></section>
        <section className="cuenta-ajustes-grupo"><h3>Seguridad</h3>
        <details className="cuenta-ajuste-desplegable"><summary>Contraseña<span>Cambiar contraseña</span></summary>
        <form className="flex flex-col gap-3" onSubmit={cambiarContrasena}>
          <label>Contraseña actual<input className={campo} type="password" required autoComplete="current-password" value={actual} onChange={(evento) => setActual(evento.target.value)} /></label>
          <label>Contraseña nueva<input className={campo} type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={nueva} onChange={(evento) => setNueva(evento.target.value)} /></label>
          <label>Repítela<input className={campo} type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={repetida} onChange={(evento) => setRepetida(evento.target.value)} /></label>
          <button disabled={ocupado} className={boton}>Cambiar y cerrar otras sesiones</button>
        </form>
        </details>
        <details className="cuenta-ajuste-desplegable"><summary>Verificación en dos pasos<span>{segundoFactor ? "Activada" : "Sin activar"}</span></summary>
        <div className="flex flex-col gap-3">
          <p>{segundoFactor ? "Activada. Al entrar te pediremos el código de tu aplicación." : "Protege tu cuenta con un código de una aplicación de autenticación."}</p>
          {!segundoFactor && <>
            <label>Contraseña actual<input className={campo} type="password" autoComplete="current-password" value={actual} onChange={(evento) => setActual(evento.target.value)} /></label>
            {!configuracion && <button disabled={ocupado || !actual} className={boton} onClick={() => void ejecutar(async () => {
              const resultado = await authClient.twoFactor.enable({ password: actual, method: "totp" });
              if (resultado.error || !resultado.data || resultado.data.method !== "totp") throw new Error("segundo factor");
              setConfiguracion({ secreto: new URL(resultado.data.totpURI).searchParams.get("secret") ?? "", codigos: resultado.data.backupCodes });
              setActual("");
            })}>Preparar verificación</button>}
            {configuracion && <>
              <p>Añade una cuenta por clave manual en tu aplicación, con códigos basados en tiempo. Esta clave solo debe quedar en tu aplicación:</p>
              <code className="break-all select-all">{configuracion.secreto}</code>
              <p>Guarda estos códigos de recuperación en un lugar seguro. Cada uno sirve una vez si pierdes el móvil:</p>
              <pre className="whitespace-pre-wrap select-all">{configuracion.codigos.join("\n")}</pre>
              <label>Código de seis cifras<input className={campo} autoComplete="one-time-code" inputMode="numeric" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} /></label>
              <button disabled={ocupado || !codigo} className={boton} onClick={() => void ejecutar(async () => {
                const resultado = await authClient.twoFactor.verifyTotp({ code: codigo.trim() });
                if (resultado.error) throw new Error("código");
                setSegundoFactor(true); setConfiguracion(null); setCodigo("");
                setMensaje("Verificación en dos pasos activada.");
              })}>He guardado los códigos: activar</button>
            </>}
          </>}
          {segundoFactor && <>
            <label>Contraseña actual<input className={campo} type="password" autoComplete="current-password" value={actual} onChange={(evento) => setActual(evento.target.value)} /></label>
            <button disabled={ocupado || !actual} className={boton} onClick={() => void ejecutar(async () => {
              const resultado = await authClient.twoFactor.disable({ password: actual });
              if (resultado.error) throw new Error("segundo factor");
              setSegundoFactor(false); setActual(""); setMensaje("Verificación en dos pasos desactivada.");
            })}>Desactivar verificación en dos pasos</button>
          </>}
        </div></details></section>
        <div className="cuenta-salir"><BotonSalir className="cuenta-enlace-salir" disabled={ocupado} /></div>
        {!esAdmin && <details className="cuenta-eliminar"><summary>Eliminar cuenta</summary><form className="flex flex-col gap-3" onSubmit={(evento) => { evento.preventDefault(); void ejecutar(async () => {
          if (confirmacion !== "ELIMINAR") return;
          const resultado = await authClient.deleteUser({ password: actual });
          if (resultado.error) throw new Error("eliminar");
          window.location.replace("/");
        }); }}>
          <p>Se borrarán tu cuenta y tus recetas guardadas. No se puede deshacer.</p>
          <label>Contraseña actual<input className={campo} type="password" required autoComplete="current-password" value={actual} onChange={(evento) => setActual(evento.target.value)} /></label>
          <label>Escribe ELIMINAR<input className={campo} required pattern="ELIMINAR" value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} /></label>
          <button disabled={ocupado || confirmacion !== "ELIMINAR"} className={`${boton} text-acento`}>Eliminar mi cuenta y mis guardadas</button>
        </form></details>}
      </div>
        <p role="status" className="cuenta-mensaje">{ocupado ? "Guardando…" : mensaje}</p>
      </dialog>
    </>
  );
}
