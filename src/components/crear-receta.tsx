"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { generarSlug, recetaEntradaSchema, type Receta } from "@/models/receta";

/**
 * Alta mínima: solo pide el título. Crea la receta como borrador con valores
 * por defecto vía POST /api/recetas (que es quien comprueba el rol de verdad)
 * y salta directamente al editor, que es donde se escribe todo lo demás.
 */
export function CrearReceta() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    const entrada = recetaEntradaSchema.safeParse({
      slug: generarSlug(titulo),
      titulo: titulo.trim(),
      resumen: "",
      estado: "borrador",
      visibilidad: "publica",
      publicadaEn: null,
      raciones: 4,
      tiempo: { preparacion: 0, coccion: 0, total: 0 },
      dificultad: "media",
      categorias: [],
      etiquetas: [],
      ingredientes: [],
      pasos: [],
      portadaId: null,
      seo: { descripcion: "" },
    });
    if (!entrada.success) {
      setError("Ponle un título para empezar.");
      return;
    }

    setEnviando(true);
    const respuesta = await fetch("/api/recetas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entrada.data),
    });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      setError(cuerpo?.error ?? `Error ${respuesta.status} al crear la receta.`);
      setEnviando(false);
      return;
    }

    const receta: Receta = await respuesta.json();
    router.push(`/admin/recetas/${receta._id}/editar`);
  }

  return (
    <form onSubmit={crear} className="flex flex-col gap-6">
      <label className="flex flex-col gap-3">
        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.2em] text-tinta/50">
          Título
        </span>
        <input
          autoFocus
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          placeholder="Arroz con costra, sin prisa"
          className="border-b border-tinta/25 bg-transparent pb-3 font-[family-name:var(--font-bricolage)] text-[clamp(26px,3.4vw,44px)] font-extrabold tracking-[-0.04em] outline-none placeholder:text-tinta/25 focus:border-tinta"
        />
      </label>
      {error && <p className="text-sm text-acento">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="self-start rounded-full bg-tinta px-6 py-3.5 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.14em] text-papel hover:bg-acento disabled:opacity-50"
      >
        {enviando ? "Creando…" : "Crear y abrir el editor"}
      </button>
    </form>
  );
}
