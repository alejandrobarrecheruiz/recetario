"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { alimentoEntradaSchema, alimentoSchema, type Alimento, type AlimentoEntrada, type LugarCompra } from "@/models/alimento";
import type { Imagen } from "@/models/imagen";
import { subirImagen, quitarImagen } from "@/lib/subir-imagen";
import { fechaDePublicacion, urlConAncho } from "@/lib/formato";
import { DescripcionImagen } from "@/components/descripcion-imagen";
import { Logo } from "@/components/logo";

export function EditorAlimento({ alimento, imagen }: { alimento?: Alimento; imagen?: Imagen }) {
  const router = useRouter();
  const [actual, setActual] = useState(alimento);
  const [datos, setDatos] = useState<AlimentoEntrada>(() => ({
    nombre: alimento?.nombre ?? "", recomendacion: alimento?.recomendacion ?? "", estado: alimento?.estado ?? "borrador",
    indispensable: alimento?.indispensable ?? false, fotoId: alimento?.fotoId ?? null, compras: alimento?.compras ?? [],
  }));
  const [foto, setFoto] = useState(imagen);
  const [pendiente, setPendiente] = useState(false);
  const [trabajo, setTrabajo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [conflicto, setConflicto] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const enCurso = useRef(false);
  const fotosDescartadas = useRef(new Set<string>());

  useEffect(() => {
    if (!pendiente && !trabajo) return;
    const cerrar = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = ""; };
    const navegar = (evento: MouseEvent) => {
      const enlace = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (!enlace || enlace.hasAttribute("download") || enlace.getAttribute("target") === "_blank" || evento.metaKey || evento.ctrlKey) return;
      if (!window.confirm("Hay cambios sin guardar. ¿Quieres salir? Puedes guardar o descargar una copia antes.")) {
        evento.preventDefault(); evento.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", cerrar);
    document.addEventListener("click", navegar, true);
    return () => { window.removeEventListener("beforeunload", cerrar); document.removeEventListener("click", navegar, true); };
  }, [pendiente, trabajo]);

  function cambiar(cambios: Partial<AlimentoEntrada>) {
    if (cambios.fotoId !== undefined && datos.fotoId && datos.fotoId !== cambios.fotoId) fotosDescartadas.current.add(datos.fotoId);
    setDatos(anteriores => ({ ...anteriores, ...cambios }));
    setPendiente(true); setMensaje(""); setError(""); setConfirmarBorrado(false);
  }

  function cambiarCompra(id: string, cambios: Partial<LugarCompra>) {
    cambiar({ compras: datos.compras.map(compra => compra.id === id ? { ...compra, ...cambios,
      ...(cambios.url !== undefined || cambios.tienda !== undefined ? { revisadoEn: null } : {}) } : compra) });
  }

  async function guardar(estado = datos.estado) {
    if (enCurso.current || conflicto) return;
    const entrada = alimentoEntradaSchema.safeParse({ ...datos, estado });
    if (!entrada.success) { setError(entrada.error.issues[0].message); return; }
    enCurso.current = true; setTrabajo("Guardando…"); setError(""); setMensaje("");
    try {
      const respuesta = await fetch(actual ? `/api/alimentos/${actual._id}` : "/api/alimentos", {
        method: actual ? "PUT" : "POST", headers: { "Content-Type": "application/json", ...(actual ? { "If-Match": new Date(actual.actualizadaEn).toISOString() } : {}) },
        body: JSON.stringify(entrada.data),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        if (respuesta.status === 412) setConflicto(true);
        throw new Error(cuerpo?.error ?? "No se pudo guardar. Tus cambios siguen en el formulario.");
      }
      const guardado = alimentoSchema.parse(cuerpo.alimento);
      setActual(guardado);
      setDatos(alimentoEntradaSchema.parse(guardado));
      setPendiente(false);
      // Incluye subidas descartadas antes de guardar, sin tocar subidas de otra pestaña.
      for (const id of fotosDescartadas.current) {
        if (id === guardado.fotoId) { fotosDescartadas.current.delete(id); continue; }
        try { await quitarImagen(id); fotosDescartadas.current.delete(id); } catch { /* Conservar el ID para reintentar. */ }
      }
      setMensaje(fotosDescartadas.current.size ? "Guardado. Alguna foto anterior no pudo limpiarse; pulsa Guardar para reintentarlo." : "Guardado.");
      if (!actual) router.replace(`/admin/despensa/${guardado._id}/editar`);
      router.refresh();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo confirmar el guardado. Consulta el listado antes de repetir un alta.");
    } finally { enCurso.current = false; setTrabajo(""); }
  }

  async function subir(fichero: File) {
    if (!actual || enCurso.current) return;
    enCurso.current = true; setTrabajo("Subiendo foto…"); setError("");
    try {
      const nueva = await subirImagen({ fichero, alimentoId: actual._id, tipo: "portada", alt: datos.nombre });
      setFoto(nueva); cambiar({ fotoId: nueva._id });
    } catch (fallo) { setError(fallo instanceof Error ? fallo.message : "La subida no se pudo completar."); }
    finally { enCurso.current = false; setTrabajo(""); }
  }

  function descargar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ alimento: datos, fotosDescartadas: [...fotosDescartadas.current] }, null, 2)], { type: "application/json" }));
    const enlace = document.createElement("a"); enlace.href = url; enlace.download = `despensa-${actual?._id ?? "nuevo"}.json`; enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function eliminar() {
    if (!actual || enCurso.current) return;
    if (!confirmarBorrado) { setConfirmarBorrado(true); return; }
    enCurso.current = true; setTrabajo("Eliminando…"); setError("");
    try {
      const respuesta = await fetch(`/api/alimentos/${actual._id}`, { method: "DELETE", headers: { "If-Match": new Date(actual.actualizadaEn).toISOString() } });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) throw new Error(cuerpo?.error ?? "No se pudo eliminar el alimento.");
      setPendiente(false);
      router.push(cuerpo.imagenesConFallo ? "/admin/despensa?limpieza=pendiente" : "/admin/despensa");
      router.refresh();
    } catch (fallo) { setError(fallo instanceof Error ? fallo.message : "No se pudo confirmar el borrado."); }
    finally { enCurso.current = false; setTrabajo(""); }
  }

  function enviar(evento: FormEvent) { evento.preventDefault(); void guardar(); }

  return <main className="pagina-amplia min-h-svh py-8">
    <header className="mb-8 flex flex-wrap items-center gap-5 border-b border-raya-oscura pb-5">
      <Logo tamano={44} />
      <Link href="/admin/despensa" className="min-h-11 py-3 text-lg font-medium">Panel · Despensa</Link>
      <p className="ml-auto text-sm text-tinta/65" role="status">{trabajo || (pendiente ? "Sin guardar" : actual ? "Guardado" : "Nuevo alimento")}</p>
    </header>
    <h1 className="mb-8 text-3xl font-semibold tracking-tight">{actual ? "Editar alimento" : "Añadir alimento"}</h1>
    <form onSubmit={enviar} className="editor-alimento">
      <fieldset disabled={Boolean(trabajo)} className="min-w-0 space-y-8">
        <legend className="sr-only">Recomendación</legend>
        <label className="block">Nombre<input className="campo-panel" required maxLength={160} value={datos.nombre} onChange={e => cambiar({ nombre: e.target.value })} /></label>
        <label className="block">Por qué lo recomiendo<textarea className="campo-panel" rows={7} maxLength={5000} value={datos.recomendacion} onChange={e => cambiar({ recomendacion: e.target.value })} /></label>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={datos.indispensable} onChange={e => cambiar({ indispensable: e.target.checked })} className="h-5 w-5 accent-acento" />Indispensable en mi despensa</label>
        <section aria-labelledby="lugares-compra">
          <h2 id="lugares-compra" className="mb-4 text-xl font-semibold">Dónde comprarlo</h2>
          <div className="space-y-6">
            {datos.compras.map((compra, posicion) => <fieldset key={compra.id} className="compra-editor">
              <legend className="px-2 text-sm text-tinta/65">Lugar {posicion + 1}</legend>
              <label className="block">Tienda<input className="campo-panel" required maxLength={160} value={compra.tienda} onChange={e => cambiarCompra(compra.id, { tienda: e.target.value })} /></label>
              <label className="block">Enlace (opcional)<input type="url" placeholder="https://…" className="campo-panel" maxLength={2000} value={compra.url} onChange={e => cambiarCompra(compra.id, { url: e.target.value })} /></label>
              <label className="block">Nota (opcional)<textarea className="campo-panel" rows={2} maxLength={500} value={compra.nota} onChange={e => cambiarCompra(compra.id, { nota: e.target.value })} /></label>
              <p className="text-sm text-tinta/65">{compra.revisadoEn ? `Revisado el ${fechaDePublicacion(new Date(compra.revisadoEn))}` : "Pendiente de revisión"}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {compra.url.startsWith("https://") && <a href={compra.url} target="_blank" rel="noopener noreferrer" className="enlace-compra">Abrir enlace<span className="sr-only"> (otra pestaña)</span></a>}
                <button type="button" className="accion-panel" onClick={() => cambiarCompra(compra.id, { revisadoEn: new Date() })}>Comprobado hoy</button>
                <button type="button" className="accion-panel text-acento" onClick={() => cambiar({ compras: datos.compras.filter(otra => otra.id !== compra.id) })}>Quitar lugar</button>
              </div>
            </fieldset>)}
          </div>
          <button type="button" className="accion-panel mt-3" disabled={datos.compras.length >= 12} onClick={() => cambiar({ compras: [...datos.compras, { id: crypto.randomUUID(), tienda: "", url: "", nota: "", revisadoEn: null }] })}>Añadir lugar de compra</button>
        </section>
      </fieldset>
      <fieldset disabled={Boolean(trabajo)} className="min-w-0 space-y-5">
        <legend className="mb-4 text-xl font-semibold">Foto (opcional)</legend>
        {foto && datos.fotoId && <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlConAncho(foto.url, 640)} alt={foto.alt} width={foto.ancho} height={foto.alto} className="w-full border border-raya-clara bg-superficie p-2" />
          <DescripcionImagen key={foto._id} id={foto._id} inicial={foto.alt} onGuardada={alt => setFoto({ ...foto, alt })} />
          <button type="button" className="accion-panel text-acento" onClick={() => { cambiar({ fotoId: null }); setFoto(undefined); }}>Quitar foto</button>
        </>}
        <label className="block">{foto ? "Cambiar foto" : "Añadir foto"}<input type="file" accept="image/*" className="campo-panel" disabled={!actual} onChange={e => { const fichero = e.target.files?.[0]; e.target.value = ""; if (fichero) void subir(fichero); }} /></label>
        {!actual && <p className="text-sm text-tinta/65">Guarda el alimento para añadir una foto.</p>}
        {actual?.estado === "publicado" && <Link href={`/despensa#alimento-${actual._id}`} target="_blank" className="enlace-compra">Ver en Despensa<span className="sr-only"> (otra pestaña)</span></Link>}
      </fieldset>
      <div className="editor-alimento-acciones">
        {error && <p role="alert" className="w-full text-acento">{error}</p>}
        {mensaje && <p role="status" className="w-full">{mensaje}</p>}
        {conflicto && <p className="w-full text-sm">Descarga tus cambios y recarga para consultar la versión del servidor.</p>}
        <button type="submit" className="cuenta-boton" disabled={Boolean(trabajo) || conflicto}>{trabajo || (datos.estado === "publicado" ? "Guardar cambios" : "Guardar borrador")}</button>
        <button type="button" className="accion-panel" disabled={Boolean(trabajo) || conflicto} onClick={() => void guardar(datos.estado === "publicado" ? "borrador" : "publicado")}>{datos.estado === "publicado" ? "Retirar de la despensa" : "Publicar"}</button>
        <button type="button" className="accion-panel" onClick={descargar}>Descargar copia</button>
        {actual && <button type="button" className="accion-panel text-acento sm:ml-auto" disabled={Boolean(trabajo)} onClick={() => void eliminar()}>{confirmarBorrado ? "Confirmar eliminación" : "Eliminar alimento"}</button>}
      </div>
    </form>
  </main>;
}
