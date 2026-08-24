"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  generarSlug,
  recetaEntradaSchema,
  type Ingrediente,
  type Paso,
  type Receta,
  type RecetaEntrada,
} from "@/models/receta";
import type { Imagen } from "@/models/imagen";
import { SelectorImagen } from "@/components/selector-imagen";

/**
 * Formulario de creacion y edicion de recetas. Valida con
 * `recetaEntradaSchema`, el MISMO esquema que usa /api/recetas: un solo Zod
 * para los dos lados.
 *
 * Ingredientes y pasos usan su campo `id` como key de React, nunca el indice
 * del array: al reordenar, las keys por indice hacen que React reutilice el
 * nodo equivocado y el texto salta de fila.
 *
 * Las fotos (portada y pasos) solo se pueden anadir EDITANDO una receta que ya
 * existe: la subida necesita `recetaId` para que la imagen quede ligada a su
 * receta y la limpieza al borrar funcione. Crear primero, fotos despues.
 */

function ingredienteVacio(): Ingrediente {
  return { id: crypto.randomUUID(), cantidad: 0, unidad: "", nombre: "" };
}

function pasoVacio(): Paso {
  return { id: crypto.randomUUID(), orden: 0, texto: "", imagenId: null };
}

function separarLista(texto: string): string[] {
  return texto
    .split(",")
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);
}

/** Mueve el elemento `desde` a `hasta` devolviendo un array nuevo. */
function mover<T>(lista: T[], desde: number, hasta: number): T[] {
  if (hasta < 0 || hasta >= lista.length) return lista;
  const copia = [...lista];
  const [elemento] = copia.splice(desde, 1);
  copia.splice(hasta, 0, elemento);
  return copia;
}

const claseCampo = "rounded border px-3 py-2 text-base";
const claseEtiqueta = "flex flex-col gap-1 text-sm";
const claseBotonFila = "rounded border px-2 py-1 text-xs disabled:opacity-30";

export function FormularioReceta({
  receta,
  imagenes = [],
}: {
  receta?: Receta;
  imagenes?: Imagen[];
}) {
  const router = useRouter();
  const editando = receta !== undefined;

  const [titulo, setTitulo] = useState(receta?.titulo ?? "");
  const [slug, setSlug] = useState(receta?.slug ?? "");
  const [slugTocado, setSlugTocado] = useState(editando);
  const [resumen, setResumen] = useState(receta?.resumen ?? "");
  const [estado, setEstado] = useState<RecetaEntrada["estado"]>(receta?.estado ?? "borrador");
  const [visibilidad, setVisibilidad] = useState<RecetaEntrada["visibilidad"]>(
    receta?.visibilidad ?? "publica",
  );
  const [raciones, setRaciones] = useState(receta?.raciones ?? 4);
  const [preparacion, setPreparacion] = useState(receta?.tiempo.preparacion ?? 0);
  const [coccion, setCoccion] = useState(receta?.tiempo.coccion ?? 0);
  const [total, setTotal] = useState(receta?.tiempo.total ?? 0);
  const [dificultad, setDificultad] = useState<RecetaEntrada["dificultad"]>(
    receta?.dificultad ?? "media",
  );
  const [categorias, setCategorias] = useState(receta?.categorias.join(", ") ?? "");
  const [etiquetas, setEtiquetas] = useState(receta?.etiquetas.join(", ") ?? "");
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>(
    receta?.ingredientes ?? [ingredienteVacio()],
  );
  const [pasos, setPasos] = useState<Paso[]>(receta?.pasos ?? [pasoVacio()]);
  const [notas, setNotas] = useState(receta?.notas ?? "");
  const [seoDescripcion, setSeoDescripcion] = useState(receta?.seo.descripcion ?? "");
  const [portadaId, setPortadaId] = useState(receta?.portadaId ?? null);
  const [imagenesPorId, setImagenesPorId] = useState<Record<string, Imagen>>(() =>
    Object.fromEntries(imagenes.map((imagen) => [imagen._id, imagen])),
  );

  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  function cambiarTitulo(valor: string) {
    setTitulo(valor);
    // Mientras el slug no se haya tocado a mano, se propone desde el titulo.
    if (!slugTocado) setSlug(generarSlug(valor));
  }

  function cambiarTiempos(prep: number, cocc: number) {
    setPreparacion(prep);
    setCoccion(cocc);
    // El total se propone como suma; se puede corregir a mano despues (reposos).
    setTotal(prep + cocc);
  }

  function actualizarIngrediente(id: string, cambios: Partial<Ingrediente>) {
    setIngredientes((lista) =>
      lista.map((ing) => (ing.id === id ? { ...ing, ...cambios } : ing)),
    );
  }

  function actualizarPaso(id: string, texto: string) {
    setPasos((lista) => lista.map((paso) => (paso.id === id ? { ...paso, texto } : paso)));
  }

  function registrarImagen(imagen: Imagen | null) {
    if (imagen) setImagenesPorId((mapa) => ({ ...mapa, [imagen._id]: imagen }));
  }

  function cambiarFotoDePaso(idPaso: string, imagen: Imagen | null) {
    registrarImagen(imagen);
    setPasos((lista) =>
      lista.map((paso) =>
        paso.id === idPaso ? { ...paso, imagenId: imagen?._id ?? null } : paso,
      ),
    );
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    setErrores([]);

    const entrada = recetaEntradaSchema.safeParse({
      slug,
      titulo,
      resumen,
      estado,
      visibilidad,
      // La fecha de publicacion la decide el servidor al publicar.
      publicadaEn: receta?.publicadaEn ?? null,
      raciones,
      tiempo: { preparacion, coccion, total },
      dificultad,
      categorias: separarLista(categorias),
      etiquetas: separarLista(etiquetas),
      ingredientes,
      // El orden se recalcula desde la posicion actual en el formulario.
      pasos: pasos.map((paso, indice) => ({ ...paso, orden: indice })),
      portadaId,
      notas: notas.trim() === "" ? undefined : notas,
      seo: { descripcion: seoDescripcion },
    } satisfies Record<keyof RecetaEntrada, unknown>);

    if (!entrada.success) {
      setErrores(
        entrada.error.issues.map((problema) => `${problema.path.join(".")}: ${problema.message}`),
      );
      return;
    }

    setEnviando(true);
    const respuesta = await fetch(editando ? `/api/recetas/${receta._id}` : "/api/recetas", {
      method: editando ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entrada.data),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      setErrores([cuerpo?.error ?? `Error ${respuesta.status} al guardar.`]);
      setEnviando(false);
      return;
    }

    if (editando) {
      setMensaje("Guardado.");
      setEnviando(false);
      router.refresh();
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  async function borrar() {
    if (!editando) return;
    if (!confirmandoBorrado) {
      // Doble pulsacion en vez de confirm(): sin modales del navegador.
      setConfirmandoBorrado(true);
      return;
    }
    setEnviando(true);
    const respuesta = await fetch(`/api/recetas/${receta._id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      setErrores([cuerpo?.error ?? `Error ${respuesta.status} al borrar.`]);
      setEnviando(false);
      setConfirmandoBorrado(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={guardar}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Titulo
          <input
            className={claseCampo}
            value={titulo}
            onChange={(e) => cambiarTitulo(e.target.value)}
          />
        </label>
        <label className={claseEtiqueta}>
          Slug (la URL)
          <input
            className={claseCampo}
            value={slug}
            onChange={(e) => {
              setSlugTocado(true);
              setSlug(e.target.value);
            }}
          />
        </label>
      </div>

      <label className={claseEtiqueta}>
        Resumen
        <textarea
          className={claseCampo}
          rows={2}
          value={resumen}
          onChange={(e) => setResumen(e.target.value)}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={claseEtiqueta}>
          Estado
          <select
            className={claseCampo}
            value={estado}
            onChange={(e) => setEstado(e.target.value as RecetaEntrada["estado"])}
          >
            <option value="borrador">borrador</option>
            <option value="publicada">publicada</option>
          </select>
        </label>
        <label className={claseEtiqueta}>
          Visibilidad
          <select
            className={claseCampo}
            value={visibilidad}
            onChange={(e) => setVisibilidad(e.target.value as RecetaEntrada["visibilidad"])}
          >
            <option value="publica">publica</option>
            <option value="registrada">registrada</option>
          </select>
        </label>
        <label className={claseEtiqueta}>
          Dificultad
          <select
            className={claseCampo}
            value={dificultad}
            onChange={(e) => setDificultad(e.target.value as RecetaEntrada["dificultad"])}
          >
            <option value="facil">facil</option>
            <option value="media">media</option>
            <option value="dificil">dificil</option>
          </select>
        </label>
      </div>

      {receta?.publicadaEn && (
        <p className="text-sm opacity-70">
          Publicada el {new Date(receta.publicadaEn).toLocaleDateString("es-ES")}. La fecha se
          conserva aunque vuelva a borrador.
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Portada</legend>
        {editando ? (
          <SelectorImagen
            recetaId={receta._id}
            tipo="portada"
            altPorDefecto={titulo || "Portada"}
            imagen={portadaId ? (imagenesPorId[portadaId] ?? null) : null}
            onCambio={(imagen) => {
              registrarImagen(imagen);
              setPortadaId(imagen?._id ?? null);
            }}
          />
        ) : (
          <p className="text-sm opacity-70">Guarda la receta para poder anadir fotos.</p>
        )}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className={claseEtiqueta}>
          Raciones
          <input
            type="number"
            min={1}
            className={claseCampo}
            value={raciones}
            onChange={(e) => setRaciones(e.target.valueAsNumber || 0)}
          />
        </label>
        <label className={claseEtiqueta}>
          Preparacion (min)
          <input
            type="number"
            min={0}
            className={claseCampo}
            value={preparacion}
            onChange={(e) => cambiarTiempos(e.target.valueAsNumber || 0, coccion)}
          />
        </label>
        <label className={claseEtiqueta}>
          Coccion (min)
          <input
            type="number"
            min={0}
            className={claseCampo}
            value={coccion}
            onChange={(e) => cambiarTiempos(preparacion, e.target.valueAsNumber || 0)}
          />
        </label>
        <label className={claseEtiqueta}>
          Total (min)
          <input
            type="number"
            min={0}
            className={claseCampo}
            value={total}
            onChange={(e) => setTotal(e.target.valueAsNumber || 0)}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Categorias (separadas por comas)
          <input
            className={claseCampo}
            value={categorias}
            onChange={(e) => setCategorias(e.target.value)}
          />
        </label>
        <label className={claseEtiqueta}>
          Etiquetas (separadas por comas)
          <input
            className={claseCampo}
            value={etiquetas}
            onChange={(e) => setEtiquetas(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Ingredientes</legend>
        {ingredientes.map((ingrediente, indice) => (
          <div key={ingrediente.id} className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              step="any"
              className={`${claseCampo} w-24`}
              aria-label="Cantidad"
              value={ingrediente.cantidad}
              onChange={(e) =>
                actualizarIngrediente(ingrediente.id, { cantidad: e.target.valueAsNumber || 0 })
              }
            />
            <input
              className={`${claseCampo} w-28`}
              aria-label="Unidad"
              placeholder="unidad"
              value={ingrediente.unidad}
              onChange={(e) => actualizarIngrediente(ingrediente.id, { unidad: e.target.value })}
            />
            <input
              className={`${claseCampo} min-w-40 flex-1`}
              aria-label="Nombre"
              placeholder="ingrediente"
              value={ingrediente.nombre}
              onChange={(e) => actualizarIngrediente(ingrediente.id, { nombre: e.target.value })}
            />
            <input
              className={`${claseCampo} w-36`}
              aria-label="Nota"
              placeholder="nota (opcional)"
              value={ingrediente.nota ?? ""}
              onChange={(e) =>
                actualizarIngrediente(ingrediente.id, {
                  nota: e.target.value === "" ? undefined : e.target.value,
                })
              }
            />
            <button
              type="button"
              className={claseBotonFila}
              disabled={indice === 0}
              onClick={() => setIngredientes((lista) => mover(lista, indice, indice - 1))}
            >
              ↑
            </button>
            <button
              type="button"
              className={claseBotonFila}
              disabled={indice === ingredientes.length - 1}
              onClick={() => setIngredientes((lista) => mover(lista, indice, indice + 1))}
            >
              ↓
            </button>
            <button
              type="button"
              className={claseBotonFila}
              onClick={() => setIngredientes((lista) => lista.filter((i) => i.id !== ingrediente.id))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="self-start rounded border px-3 py-1 text-sm"
          onClick={() => setIngredientes((lista) => [...lista, ingredienteVacio()])}
        >
          Anadir ingrediente
        </button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">
          Pasos
          {!editando && (
            <span className="text-sm font-normal opacity-60">
              {" "}
              (guarda la receta para poder anadir fotos)
            </span>
          )}
        </legend>
        {pasos.map((paso, indice) => (
          <div key={paso.id} className="flex items-start gap-2">
            <span className="w-6 pt-2 text-right text-sm opacity-60">{indice + 1}.</span>
            <div className="flex flex-1 flex-col gap-2">
              <textarea
                className={claseCampo}
                rows={2}
                aria-label={`Paso ${indice + 1}`}
                value={paso.texto}
                onChange={(e) => actualizarPaso(paso.id, e.target.value)}
              />
              {editando && (
                <SelectorImagen
                  recetaId={receta._id}
                  tipo="paso"
                  altPorDefecto={`${titulo || "Receta"}: paso ${indice + 1}`}
                  imagen={paso.imagenId ? (imagenesPorId[paso.imagenId] ?? null) : null}
                  onCambio={(imagen) => cambiarFotoDePaso(paso.id, imagen)}
                />
              )}
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <button
                type="button"
                className={claseBotonFila}
                disabled={indice === 0}
                onClick={() => setPasos((lista) => mover(lista, indice, indice - 1))}
              >
                ↑
              </button>
              <button
                type="button"
                className={claseBotonFila}
                disabled={indice === pasos.length - 1}
                onClick={() => setPasos((lista) => mover(lista, indice, indice + 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className={claseBotonFila}
                onClick={() => setPasos((lista) => lista.filter((p) => p.id !== paso.id))}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="self-start rounded border px-3 py-1 text-sm"
          onClick={() => setPasos((lista) => [...lista, pasoVacio()])}
        >
          Anadir paso
        </button>
      </fieldset>

      <label className={claseEtiqueta}>
        Notas (opcional)
        <textarea
          className={claseCampo}
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </label>

      <label className={claseEtiqueta}>
        Descripcion para buscadores (SEO)
        <textarea
          className={claseCampo}
          rows={2}
          value={seoDescripcion}
          onChange={(e) => setSeoDescripcion(e.target.value)}
        />
      </label>

      {errores.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-red-600">
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}

      <div className="flex items-center gap-3 border-t pt-4">
        <button
          type="submit"
          disabled={enviando}
          className="rounded border px-4 py-2 font-medium disabled:opacity-50"
        >
          {enviando ? "Guardando..." : editando ? "Guardar" : "Crear receta"}
        </button>
        {editando && (
          <button
            type="button"
            disabled={enviando}
            onClick={borrar}
            className="rounded border border-red-300 px-4 py-2 text-red-700 disabled:opacity-50"
          >
            {confirmandoBorrado ? "Seguro? Pulsa otra vez" : "Borrar"}
          </button>
        )}
      </div>
    </form>
  );
}
