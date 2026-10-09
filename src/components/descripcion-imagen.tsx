"use client";

import { useId, useState } from "react";

export function DescripcionImagen({ id, inicial, onGuardada }: { id: string; inicial: string; onGuardada: (alt: string) => void }) {
  const campoId = useId();
  const [texto, setTexto] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  async function guardar() {
    setEnviando(true); setMensaje("");
    try {
      const respuesta = await fetch(`/api/imagenes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt: texto }) });
      if (!respuesta.ok) throw new Error();
      const datos: { alt: string } = await respuesta.json();
      onGuardada(datos.alt); setMensaje("Descripción guardada.");
    } catch { setMensaje("No se pudo guardar la descripción. Vuelve a intentarlo."); }
    finally { setEnviando(false); }
  }
  return <div className="descripcion-imagen">
    <label htmlFor={campoId}>Descripción de la foto</label>
    <textarea id={campoId} rows={2} maxLength={1000} value={texto} onChange={e => setTexto(e.target.value)} className="campo-panel" />
    <p className="editor-ayuda">Describe lo que aporta la imagen para quien no puede verla.</p>
    <button type="button" disabled={enviando} onClick={() => void guardar()} className="boton-panel boton-panel-secundario">{enviando ? "Guardando…" : "Guardar descripción"}</button>
    <p role="status">{mensaje}</p>
  </div>;
}
