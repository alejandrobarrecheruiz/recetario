"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import Form from "next/form";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Mejora un enlace funcional: sin JS lleva al formulario del catálogo. */
export function BuscadorCabecera() {
  const ruta = usePathname();
  const parametros = useSearchParams();
  const consulta = parametros.toString();
  const categoria = ruta === "/recetas" ? parametros.get("categoria")?.trim() ?? "" : "";
  const q = ruta === "/recetas" ? parametros.get("q")?.trim() ?? "" : "";
  const respaldo = new URLSearchParams({ buscar: "1" });
  if (q) respaldo.set("q", q);
  if (categoria) respaldo.set("categoria", categoria);
  const id = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const disparador = useRef<HTMLAnchorElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    dialogo.current?.close();
  }, [ruta, consulta]);

  useEffect(() => {
    // También cierra al usar Atrás/Adelante entre filtros de la misma ruta.
    const cerrar = () => dialogo.current?.close();
    window.addEventListener("popstate", cerrar);
    return () => window.removeEventListener("popstate", cerrar);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, [abierto]);

  function abrir(evento: MouseEvent<HTMLAnchorElement>) {
    // Abrir en otra pestaña conserva el enlace de respaldo.
    if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || !dialogo.current?.showModal) return;
    evento.preventDefault();
    if (campo.current) campo.current.value = q;
    dialogo.current.showModal();
    setAbierto(true);
    campo.current?.focus();
    campo.current?.select();
  }

  return <>
    <Link ref={disparador} href={`/recetas?${respaldo}`} prefetch={false} onClick={abrir} aria-label="Buscar recetas" aria-haspopup="dialog" aria-controls={id} aria-expanded={abierto} className="icono-cabecera">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
      <span aria-hidden="true" className="ayuda-cabecera">Buscar recetas</span>
    </Link>
    <dialog ref={dialogo} id={id} aria-labelledby={`${id}-titulo`} className="buscador-dialogo" onClose={() => {
      setAbierto(false);
      if (disparador.current?.isConnected) disparador.current.focus();
    }}>
      <div className="buscador-encabezado">
        <h2 id={`${id}-titulo`}>Buscar recetas</h2>
        <button type="button" aria-label="Cerrar búsqueda" className="icono-cabecera" onClick={() => dialogo.current?.close()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <Form action="/recetas" className="buscador-formulario" onSubmit={() => dialogo.current?.close()}>
        <label htmlFor={`${id}-q`} className="buscador-etiqueta">¿Qué te apetece cocinar?</label>
        <input ref={campo} id={`${id}-q`} name="q" type="search" placeholder="Receta o ingrediente" maxLength={120} className="buscador-campo" />
        {categoria && <><input type="hidden" name="categoria" value={categoria} /><p className="buscador-categoria">Dentro de «{categoria}»</p></>}
        <button type="submit" className="buscador-enviar">Buscar</button>
      </Form>
    </dialog>
  </>;
}
