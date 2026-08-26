"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as TeclaReact,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";
import {
  recetaEntradaSchema,
  type Dificultad,
  type Estado,
  type Ingrediente,
  type Paso,
  type Receta,
  type Tiempo,
  type Visibilidad,
} from "@/models/receta";
import type { Imagen } from "@/models/imagen";
import { subirImagen, quitarImagen } from "@/lib/subir-imagen";
import { urlConAncho } from "@/lib/formato";
import { Logo } from "@/components/logo";

/**
 * El editor del panel: se escribe sobre la receta tal como se va a
 * ver, con guardado automático. Valida con `recetaEntradaSchema`, el MISMO
 * esquema que usa /api/recetas: un solo Zod para los dos lados.
 *
 * Ingredientes y pasos usan su campo `id` como key de React, nunca el índice
 * del array: al reordenar, las keys por índice hacen que React reutilice el
 * nodo equivocado y el texto salta de fila.
 *
 * Los campos de texto grandes son contentEditable SIN control de React: el
 * contenido inicial se pinta una vez al montar y a partir de ahí manda el DOM
 * (onInput actualiza el estado para el autoguardado, nunca al revés; así el
 * cursor no salta).
 */

type DatosEditor = {
  slug: string;
  titulo: string;
  resumen: string;
  estado: Estado;
  visibilidad: Visibilidad;
  publicadaEn: Date | string | null;
  raciones: number;
  tiempo: Tiempo;
  dificultad: Dificultad;
  categorias: string[];
  etiquetas: string[];
  ingredientes: Ingrediente[];
  pasos: Paso[];
  portadaId: string | null;
  notas: string;
  seoDescripcion: string;
};

type FaseGuardado = "limpio" | "pendiente" | "guardando" | "invalido" | "fallo";

function ingredienteVacio(): Ingrediente {
  return { id: crypto.randomUUID(), cantidad: 0, unidad: "", nombre: "" };
}

function pasoVacio(): Paso {
  return { id: crypto.randomUUID(), orden: 0, texto: "", imagenId: null };
}

/** Mueve el elemento `desde` a `hasta` devolviendo un array nuevo. */
function mover<T>(lista: T[], desde: number, hasta: number): T[] {
  if (hasta < 0 || hasta >= lista.length) return lista;
  const copia = [...lista];
  const [elemento] = copia.splice(desde, 1);
  copia.splice(hasta, 0, elemento);
  return copia;
}

/** El primer problema de Zod, contado en cristiano para la barra superior. */
function describirProblema(error: ZodError): string {
  const problema = error.issues[0];
  const ruta = problema.path.join(".");
  if (ruta === "titulo") return "el título está vacío";
  if (ruta === "slug") return "la URL no vale (minúsculas y guiones)";
  if (ruta.startsWith("pasos.")) return `el paso ${Number(problema.path[1]) + 1} está sin texto`;
  if (ruta.startsWith("ingredientes."))
    return `el ingrediente ${Number(problema.path[1]) + 1} está sin nombre`;
  return `${ruta}: ${problema.message}`;
}

/** Texto editable en el sitio. Sin control de React: ver nota de cabecera. */
function CampoEditable({
  inicial,
  onCambio,
  className,
  placeholder,
  multilinea = false,
}: {
  inicial: string;
  onCambio: (valor: string) => void;
  className?: string;
  placeholder?: string;
  multilinea?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText.trim() !== inicial.trim()) {
      ref.current.innerText = inicial;
    }
    // Solo al montar: a partir de ahi manda el DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multilinea}
      aria-label={placeholder}
      data-placeholder={placeholder}
      onKeyDown={(evento: TeclaReact<HTMLDivElement>) => {
        if (!multilinea && evento.key === "Enter") evento.preventDefault();
      }}
      onInput={(evento) =>
        onCambio((evento.currentTarget as HTMLDivElement).innerText.replace(/\n+$/, ""))
      }
      className={`whitespace-pre-wrap rounded-[3px] outline-none focus:bg-tinta/5 empty:before:pointer-events-none empty:before:text-tinta/30 empty:before:content-[attr(data-placeholder)] ${className ?? ""}`}
    />
  );
}

/** Rotulillo de grupo de la barra lateral. */
function RotuloLateral({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[0.2em] text-tinta/50">
      {children}
    </div>
  );
}

/** Chips editables de etiquetas y categorías: tocar una la quita. */
function GrupoChips({
  rotulo,
  valores,
  onCambio,
}: {
  rotulo: string;
  valores: string[];
  onCambio: (valores: string[]) => void;
}) {
  const [anadiendo, setAnadiendo] = useState(false);
  const [texto, setTexto] = useState("");

  function anadir() {
    const limpio = texto.trim();
    if (limpio !== "" && !valores.includes(limpio)) onCambio([...valores, limpio]);
    setTexto("");
    setAnadiendo(false);
  }

  return (
    <div>
      <RotuloLateral>{rotulo}</RotuloLateral>
      <div className="flex flex-wrap items-center gap-1.5">
        {valores.map((valor) => (
          <button
            key={valor}
            type="button"
            title="Quitar"
            onClick={() => onCambio(valores.filter((otro) => otro !== valor))}
            className="rounded-full bg-tinta/10 px-3 py-1.5 text-[12.5px] hover:bg-tinta/20"
          >
            {valor} <span className="text-tinta/45">×</span>
          </button>
        ))}
        {anadiendo ? (
          <input
            autoFocus
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onBlur={anadir}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                anadir();
              }
              if (evento.key === "Escape") {
                setTexto("");
                setAnadiendo(false);
              }
            }}
            className="w-28 border-b border-tinta/30 bg-transparent px-1 py-1 text-[12.5px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAnadiendo(true)}
            className="whitespace-nowrap rounded-full border border-dashed border-tinta/30 px-3 py-1.5 text-[12.5px] text-tinta/55 hover:border-tinta/60"
          >
            + añadir
          </button>
        )}
      </div>
    </div>
  );
}

export function EditorReceta({
  receta,
  imagenes,
}: {
  receta: Receta;
  imagenes: Imagen[];
}) {
  const router = useRouter();

  const [datos, setDatos] = useState<DatosEditor>(() => ({
    slug: receta.slug,
    titulo: receta.titulo,
    resumen: receta.resumen,
    estado: receta.estado,
    visibilidad: receta.visibilidad,
    publicadaEn: receta.publicadaEn,
    raciones: receta.raciones,
    tiempo: receta.tiempo,
    dificultad: receta.dificultad,
    categorias: receta.categorias,
    etiquetas: receta.etiquetas,
    ingredientes: receta.ingredientes,
    pasos: [...receta.pasos].sort((a, b) => a.orden - b.orden),
    portadaId: receta.portadaId,
    notas: receta.notas ?? "",
    seoDescripcion: receta.seo.descripcion,
  }));
  const [imagenesPorId, setImagenesPorId] = useState<Record<string, Imagen>>(() =>
    Object.fromEntries(imagenes.map((imagen) => [imagen._id, imagen])),
  );
  const [guardado, setGuardado] = useState<{ fase: FaseGuardado; problema?: string }>({
    fase: "limpio",
  });
  const [guardadoEn, setGuardadoEn] = useState<number>(() => Date.now());
  const [haceSegundos, setHaceSegundos] = useState(0);
  const [subiendo, setSubiendo] = useState<Record<string, boolean>>({});
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [arrastre, setArrastre] = useState<
    { lista: "ingredientes" | "pasos"; desde: number } | null
  >(null);

  const version = useRef(0);
  const guardarRef = useRef<() => void>(() => {});

  function tocar(cambios: Partial<DatosEditor>) {
    version.current += 1;
    setDatos((actuales) => ({ ...actuales, ...cambios }));
    setGuardado({ fase: "pendiente" });
  }

  async function guardar(publicando = false) {
    const enVersion = version.current;
    const entrada = recetaEntradaSchema.safeParse({
      slug: datos.slug,
      titulo: datos.titulo.trim(),
      resumen: datos.resumen,
      estado: publicando ? "publicada" : datos.estado,
      visibilidad: datos.visibilidad,
      publicadaEn: datos.publicadaEn,
      raciones: datos.raciones,
      tiempo: datos.tiempo,
      dificultad: datos.dificultad,
      categorias: datos.categorias,
      etiquetas: datos.etiquetas,
      ingredientes: datos.ingredientes,
      // El orden se recalcula desde la posicion actual en el editor.
      pasos: datos.pasos.map((paso, indice) => ({
        ...paso,
        orden: indice,
        titulo: paso.titulo && paso.titulo.trim() !== "" ? paso.titulo : undefined,
      })),
      portadaId: datos.portadaId,
      notas: datos.notas.trim() === "" ? undefined : datos.notas,
      seo: { descripcion: datos.seoDescripcion },
    });

    if (!entrada.success) {
      setGuardado({ fase: "invalido", problema: describirProblema(entrada.error) });
      return;
    }

    setGuardado({ fase: "guardando" });
    const respuesta = await fetch(`/api/recetas/${receta._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entrada.data),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      setGuardado({
        fase: "fallo",
        problema: cuerpo?.error ?? `error ${respuesta.status} al guardar`,
      });
      return;
    }

    // `publicadaEn` la decide el servidor al publicar: se recoge para no
    // mandarle null otra vez en el siguiente autoguardado.
    const guardada: Receta = await respuesta.json();
    setDatos((actuales) => ({
      ...actuales,
      estado: guardada.estado,
      publicadaEn: guardada.publicadaEn,
    }));
    setGuardadoEn(Date.now());
    setHaceSegundos(0);
    setGuardado(version.current === enVersion ? { fase: "limpio" } : { fase: "pendiente" });
  }

  // La referencia se refresca en cada render para que el debounce llame
  // siempre a la version con el estado al dia.
  useEffect(() => {
    guardarRef.current = () => void guardar();
  });

  // Autoguardado con debounce: cada cambio rearma el temporizador.
  useEffect(() => {
    if (guardado.fase !== "pendiente") return;
    const temporizador = setTimeout(() => guardarRef.current(), 1200);
    return () => clearTimeout(temporizador);
  }, [guardado.fase, datos]);

  // El "hace 12 s" de la barra: un tic por segundo.
  useEffect(() => {
    const temporizador = setInterval(
      () => setHaceSegundos(Math.max(0, Math.floor((Date.now() - guardadoEn) / 1000))),
      1000,
    );
    return () => clearInterval(temporizador);
  }, [guardadoEn]);

  function textoGuardado(): string {
    if (guardado.fase === "guardando") return "Guardando…";
    if (guardado.fase === "pendiente") return "Sin guardar";
    if (guardado.fase === "invalido" || guardado.fase === "fallo")
      return `No se guarda: ${guardado.problema}`;
    if (haceSegundos < 60) return `Guardado hace ${haceSegundos} s`;
    return `Guardado hace ${Math.floor(haceSegundos / 60)} min`;
  }

  const conProblema = guardado.fase === "invalido" || guardado.fase === "fallo";

  async function cambiarPortada(fichero: File) {
    setErrorSubida(null);
    setSubiendo((estado) => ({ ...estado, portada: true }));
    const anterior = datos.portadaId;
    try {
      const imagen = await subirImagen({
        fichero,
        recetaId: receta._id,
        tipo: "portada",
        alt: datos.titulo || "Portada",
      });
      setImagenesPorId((mapa) => ({ ...mapa, [imagen._id]: imagen }));
      tocar({ portadaId: imagen._id });
      if (anterior) await quitarImagen(anterior).catch(() => {});
    } catch (fallo) {
      setErrorSubida(fallo instanceof Error ? fallo.message : "La subida falló.");
    } finally {
      setSubiendo((estado) => ({ ...estado, portada: false }));
    }
  }

  async function quitarPortada() {
    if (!datos.portadaId) return;
    setErrorSubida(null);
    const id = datos.portadaId;
    tocar({ portadaId: null });
    await quitarImagen(id).catch(() => {});
  }

  async function cambiarFotoDePaso(paso: Paso, indice: number, fichero: File) {
    setErrorSubida(null);
    setSubiendo((estado) => ({ ...estado, [paso.id]: true }));
    const anterior = paso.imagenId;
    try {
      const imagen = await subirImagen({
        fichero,
        recetaId: receta._id,
        tipo: "paso",
        alt: `${datos.titulo || "Receta"}: paso ${indice + 1}`,
      });
      setImagenesPorId((mapa) => ({ ...mapa, [imagen._id]: imagen }));
      tocar({
        pasos: datos.pasos.map((otro) =>
          otro.id === paso.id ? { ...otro, imagenId: imagen._id } : otro,
        ),
      });
      if (anterior) await quitarImagen(anterior).catch(() => {});
    } catch (fallo) {
      setErrorSubida(fallo instanceof Error ? fallo.message : "La subida falló.");
    } finally {
      setSubiendo((estado) => ({ ...estado, [paso.id]: false }));
    }
  }

  async function quitarFotoDePaso(paso: Paso) {
    if (!paso.imagenId) return;
    const id = paso.imagenId;
    tocar({
      pasos: datos.pasos.map((otro) =>
        otro.id === paso.id ? { ...otro, imagenId: null } : otro,
      ),
    });
    await quitarImagen(id).catch(() => {});
  }

  async function borrarReceta() {
    if (!confirmandoBorrado) {
      // Doble pulsacion en vez de confirm(): sin modales del navegador.
      setConfirmandoBorrado(true);
      return;
    }
    const respuesta = await fetch(`/api/recetas/${receta._id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      setConfirmandoBorrado(false);
      const cuerpo = await respuesta.json().catch(() => null);
      setGuardado({ fase: "fallo", problema: cuerpo?.error ?? "no se pudo borrar" });
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  const portada = datos.portadaId ? imagenesPorId[datos.portadaId] : undefined;
  const clasePildoraEstado = (activa: boolean) =>
    `rounded-full px-3.75 py-2 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.12em] ${
      activa ? "bg-acento text-[#f1f6f8]" : "text-tinta/60 hover:text-tinta"
    }`;
  const claseFilaFicha =
    "flex items-baseline justify-between gap-3 border-b border-tinta/15 pb-2.25";
  const claseDatoFicha =
    "bg-transparent text-right font-[family-name:var(--font-dm-mono)] text-[13px] outline-none";

  return (
    <div className="flex min-h-svh flex-col">
      {/* ── Barra superior ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-tinta/15 bg-superficie px-[clamp(16px,3vw,28px)] py-3">
        <div className="flex min-w-0 items-center gap-5 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.14em]">
          <Logo tamano={36} />
          <Link href="/admin" className="whitespace-nowrap text-tinta/65">
            ← Panel
          </Link>
          <span className="flex min-w-0 items-center normal-case tracking-[0.06em] text-tinta/45">
            /recetas/
            <input
              value={datos.slug}
              onChange={(evento) =>
                tocar({ slug: evento.target.value.toLowerCase() })
              }
              aria-label="URL de la receta"
              className="w-[24ch] max-w-[40vw] bg-transparent lowercase text-tinta/70 outline-none focus:text-tinta"
            />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          <span
            className={`flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.12em] ${
              conProblema ? "text-acento" : "text-tinta/60"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full bg-acento ${
                guardado.fase === "limpio" ? "parpadea" : ""
              }`}
            />
            {textoGuardado()}
          </span>
          <div className="flex gap-0.5 rounded-full bg-tinta/10 p-[3px]">
            <button
              type="button"
              onClick={() => tocar({ estado: "borrador" })}
              className={clasePildoraEstado(datos.estado === "borrador")}
            >
              Borrador
            </button>
            <button
              type="button"
              onClick={() => tocar({ estado: "publicada" })}
              className={clasePildoraEstado(datos.estado === "publicada")}
            >
              Publicada
            </button>
          </div>
          <button
            type="button"
            onClick={() => void guardar(true)}
            className="rounded-full bg-tinta px-5.5 py-2.75 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.14em] text-papel hover:bg-acento"
          >
            Publicar
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-wrap items-stretch">
        {/* ── Barra lateral ──────────────────────────────────────── */}
        <aside className="flex max-w-[340px] flex-1 basis-[260px] flex-col gap-7 border-r border-tinta/15 bg-lateral px-6 py-6.5">
          <div>
            <RotuloLateral>Quién la ve</RotuloLateral>
            <div className="flex flex-col gap-2.25">
              {(
                [
                  ["publica", "Pública"],
                  ["registrada", "Solo registradas"],
                ] as const
              ).map(([valor, rotulo]) => {
                const activa = datos.visibilidad === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => tocar({ visibilidad: valor })}
                    className={`flex items-center gap-2.5 text-left text-[14.5px] ${
                      activa ? "text-tinta/90" : "text-tinta/55"
                    }`}
                  >
                    <span
                      className={`h-[13px] w-[13px] rounded-full ${
                        activa
                          ? "bg-acento shadow-[inset_0_0_0_3px_var(--lateral)]"
                          : "border border-tinta/35"
                      }`}
                    />
                    {rotulo}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <RotuloLateral>Ficha</RotuloLateral>
            <div className="flex flex-col gap-2.75">
              <label className={claseFilaFicha}>
                <span className="text-sm text-tinta/65">Raciones</span>
                <input
                  type="number"
                  min={1}
                  value={datos.raciones}
                  onChange={(evento) =>
                    tocar({ raciones: evento.target.valueAsNumber || 0 })
                  }
                  className={`${claseDatoFicha} w-12`}
                />
              </label>
              <div className={claseFilaFicha}>
                <span className="text-sm text-tinta/65">Prep · cocción</span>
                <span className="flex items-baseline gap-1">
                  <input
                    type="number"
                    min={0}
                    aria-label="Minutos de preparación"
                    value={datos.tiempo.preparacion}
                    onChange={(evento) => {
                      const preparacion = evento.target.valueAsNumber || 0;
                      tocar({
                        tiempo: {
                          preparacion,
                          coccion: datos.tiempo.coccion,
                          total: preparacion + datos.tiempo.coccion,
                        },
                      });
                    }}
                    className={`${claseDatoFicha} w-9`}
                  />
                  <span className="font-[family-name:var(--font-dm-mono)] text-[13px] text-tinta/45">
                    ·
                  </span>
                  <input
                    type="number"
                    min={0}
                    aria-label="Minutos de cocción"
                    value={datos.tiempo.coccion}
                    onChange={(evento) => {
                      const coccion = evento.target.valueAsNumber || 0;
                      tocar({
                        tiempo: {
                          preparacion: datos.tiempo.preparacion,
                          coccion,
                          total: datos.tiempo.preparacion + coccion,
                        },
                      });
                    }}
                    className={`${claseDatoFicha} w-9`}
                  />
                </span>
              </div>
              <label className={claseFilaFicha}>
                <span className="text-sm text-tinta/65">Total (min)</span>
                <input
                  type="number"
                  min={0}
                  value={datos.tiempo.total}
                  onChange={(evento) =>
                    tocar({
                      tiempo: { ...datos.tiempo, total: evento.target.valueAsNumber || 0 },
                    })
                  }
                  className={`${claseDatoFicha} w-12`}
                />
              </label>
              <label className={claseFilaFicha}>
                <span className="text-sm text-tinta/65">Dificultad</span>
                <select
                  value={datos.dificultad}
                  onChange={(evento) =>
                    tocar({ dificultad: evento.target.value as Dificultad })
                  }
                  className={claseDatoFicha}
                >
                  <option value="facil">fácil</option>
                  <option value="media">media</option>
                  <option value="dificil">difícil</option>
                </select>
              </label>
              {datos.publicadaEn && (
                <p className="pt-1 text-[12.5px] leading-relaxed text-tinta/50">
                  Publicada el {new Date(datos.publicadaEn).toLocaleDateString("es-ES")}. La
                  fecha se conserva aunque vuelva a borrador.
                </p>
              )}
            </div>
          </div>

          <GrupoChips
            rotulo="Categorías"
            valores={datos.categorias}
            onCambio={(categorias) => tocar({ categorias })}
          />
          <GrupoChips
            rotulo="Etiquetas"
            valores={datos.etiquetas}
            onCambio={(etiquetas) => tocar({ etiquetas })}
          />

          <div>
            <RotuloLateral>Para buscadores</RotuloLateral>
            <textarea
              rows={3}
              value={datos.seoDescripcion}
              onChange={(evento) => tocar({ seoDescripcion: evento.target.value })}
              placeholder="La descripción que sale en Google."
              className="w-full resize-y border-b border-tinta/20 bg-transparent pb-2 text-[13.5px] leading-relaxed outline-none placeholder:text-tinta/35 focus:border-tinta/50"
            />
          </div>

          <div className="mt-auto flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-tinta/50">
              Escribes sobre la receta tal como se va a ver. Pincha cualquier bloque para
              editarlo.
            </p>
            <button
              type="button"
              onClick={() => void borrarReceta()}
              className="self-start font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.14em] text-acento/80 hover:text-acento"
            >
              {confirmandoBorrado ? "¿Seguro? Pulsa otra vez" : "Borrar receta"}
            </button>
          </div>
        </aside>

        {/* ── La receta, tal como se ve ──────────────────────────── */}
        <div className="min-w-0 flex-1 basis-[520px] bg-papel pb-22">
          <div className="relative flex h-[44vh] min-h-[320px] items-end overflow-hidden">
            {portada ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlConAncho(portada.url, 1600)}
                alt={portada.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="rayas absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(222,230,233,0.95),rgba(222,230,233,0.3))]" />
            <div className="absolute right-4 top-4 flex gap-2 font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[0.12em]">
              <label className="cursor-pointer whitespace-nowrap rounded-full border border-tinta/20 bg-superficie/90 px-3.25 py-1.75 text-tinta hover:border-tinta/50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={subiendo.portada === true}
                  onChange={(evento) => {
                    const fichero = evento.target.files?.[0];
                    if (fichero) void cambiarPortada(fichero);
                    evento.target.value = "";
                  }}
                />
                {subiendo.portada === true
                  ? "Subiendo…"
                  : portada
                    ? "Cambiar foto"
                    : "Poner foto"}
              </label>
              {portada && (
                <button
                  type="button"
                  onClick={() => void quitarPortada()}
                  className="whitespace-nowrap rounded-full border border-tinta/20 bg-superficie/90 px-3.25 py-1.75 text-tinta hover:border-tinta/50"
                >
                  Quitar
                </button>
              )}
            </div>
            <div className="relative w-full px-[clamp(20px,4vw,44px)] pb-8">
              <div className="mb-2.75 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.2em] text-acento">
                Título
              </div>
              <CampoEditable
                inicial={receta.titulo}
                onCambio={(titulo) => tocar({ titulo })}
                placeholder="El nombre del plato"
                className="-ml-1.5 max-w-[18ch] px-1.5 py-0.5 font-[family-name:var(--font-bricolage)] text-[clamp(34px,4.8vw,66px)] font-extrabold leading-[0.92] tracking-[-0.045em]"
              />
            </div>
          </div>

          <div className="max-w-[900px] px-[clamp(20px,4vw,44px)] pt-10">
            {errorSubida && (
              <p className="mb-6 text-sm text-acento">{errorSubida}</p>
            )}

            <div className="mb-2.75 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.2em] text-tinta/50">
              Resumen
            </div>
            <CampoEditable
              inicial={receta.resumen}
              onCambio={(resumen) => tocar({ resumen })}
              multilinea
              placeholder="Dos líneas sobre por qué esta receta."
              className="-ml-1.5 px-1.5 py-1.5 font-[family-name:var(--font-bricolage)] text-2xl leading-[1.35] tracking-[-0.03em] text-tinta/90"
            />

            {/* Ingredientes */}
            <div className="mb-4 mt-11 flex items-center gap-3.5 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.2em]">
              <span className="text-tinta/50">Ingredientes</span>
              <span className="h-px flex-1 bg-tinta/15" />
              <button
                type="button"
                onClick={() =>
                  tocar({ ingredientes: [...datos.ingredientes, ingredienteVacio()] })
                }
                className="whitespace-nowrap uppercase tracking-[0.2em] text-acento"
              >
                + línea
              </button>
            </div>
            <div className="flex flex-col">
              {datos.ingredientes.map((ingrediente, indice) => (
                <div
                  key={ingrediente.id}
                  onDragOver={(evento) => {
                    if (
                      arrastre?.lista === "ingredientes" &&
                      arrastre.desde !== indice
                    ) {
                      evento.preventDefault();
                      tocar({
                        ingredientes: mover(datos.ingredientes, arrastre.desde, indice),
                      });
                      setArrastre({ lista: "ingredientes", desde: indice });
                    }
                  }}
                  onDrop={(evento) => evento.preventDefault()}
                  className="grid grid-cols-[22px_58px_68px_minmax(0,1fr)_minmax(60px,120px)_22px] items-baseline gap-3 rounded-[3px] border-t border-tinta/10 px-2 py-2.5 hover:bg-tinta/5"
                >
                  <span
                    draggable
                    onDragStart={() => setArrastre({ lista: "ingredientes", desde: indice })}
                    onDragEnd={() => setArrastre(null)}
                    title="Arrastra para reordenar"
                    className="cursor-grab font-[family-name:var(--font-dm-mono)] text-xs text-tinta/30"
                  >
                    ::
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    aria-label="Cantidad"
                    value={ingrediente.cantidad}
                    onChange={(evento) =>
                      tocar({
                        ingredientes: datos.ingredientes.map((otro) =>
                          otro.id === ingrediente.id
                            ? { ...otro, cantidad: evento.target.valueAsNumber || 0 }
                            : otro,
                        ),
                      })
                    }
                    className="bg-transparent font-[family-name:var(--font-dm-mono)] text-[13px] text-acento outline-none"
                  />
                  <input
                    aria-label="Unidad"
                    placeholder="unidad"
                    value={ingrediente.unidad}
                    onChange={(evento) =>
                      tocar({
                        ingredientes: datos.ingredientes.map((otro) =>
                          otro.id === ingrediente.id
                            ? { ...otro, unidad: evento.target.value }
                            : otro,
                        ),
                      })
                    }
                    className="bg-transparent font-[family-name:var(--font-dm-mono)] text-[13px] text-tinta/60 outline-none placeholder:text-tinta/30"
                  />
                  <input
                    aria-label="Nombre"
                    placeholder="ingrediente"
                    value={ingrediente.nombre}
                    onChange={(evento) =>
                      tocar({
                        ingredientes: datos.ingredientes.map((otro) =>
                          otro.id === ingrediente.id
                            ? { ...otro, nombre: evento.target.value }
                            : otro,
                        ),
                      })
                    }
                    className="min-w-0 bg-transparent text-base outline-none placeholder:text-tinta/30"
                  />
                  <input
                    aria-label="Nota"
                    placeholder="nota"
                    value={ingrediente.nota ?? ""}
                    onChange={(evento) =>
                      tocar({
                        ingredientes: datos.ingredientes.map((otro) =>
                          otro.id === ingrediente.id
                            ? {
                                ...otro,
                                nota:
                                  evento.target.value === ""
                                    ? undefined
                                    : evento.target.value,
                              }
                            : otro,
                        ),
                      })
                    }
                    className="min-w-0 bg-transparent text-[13.5px] text-tinta/55 outline-none placeholder:text-tinta/25"
                  />
                  <button
                    type="button"
                    title="Quitar línea"
                    onClick={() =>
                      tocar({
                        ingredientes: datos.ingredientes.filter(
                          (otro) => otro.id !== ingrediente.id,
                        ),
                      })
                    }
                    className="text-center text-[13px] text-tinta/30 hover:text-acento"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Pasos */}
            <div className="mb-5 mt-11 flex items-center gap-3.5 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.2em]">
              <span className="text-tinta/50">Pasos</span>
              <span className="h-px flex-1 bg-tinta/15" />
              <button
                type="button"
                onClick={() => tocar({ pasos: [...datos.pasos, pasoVacio()] })}
                className="whitespace-nowrap uppercase tracking-[0.2em] text-acento"
              >
                + paso
              </button>
            </div>
            <div className="flex flex-col gap-5.5">
              {datos.pasos.map((paso, indice) => {
                const foto = paso.imagenId ? imagenesPorId[paso.imagenId] : undefined;
                return (
                  <div
                    key={paso.id}
                    onDragOver={(evento) => {
                      if (arrastre?.lista === "pasos" && arrastre.desde !== indice) {
                        evento.preventDefault();
                        tocar({ pasos: mover(datos.pasos, arrastre.desde, indice) });
                        setArrastre({ lista: "pasos", desde: indice });
                      }
                    }}
                    onDrop={(evento) => evento.preventDefault()}
                    className="grid grid-cols-[40px_minmax(0,1fr)_92px] items-start gap-4.5 rounded-[4px] px-2.5 py-3.5 hover:bg-tinta/5"
                  >
                    <div
                      draggable
                      onDragStart={() => setArrastre({ lista: "pasos", desde: indice })}
                      onDragEnd={() => setArrastre(null)}
                      title="Arrastra para reordenar"
                      className="cursor-grab font-[family-name:var(--font-bricolage)] text-3xl font-extrabold leading-none tracking-[-0.045em] text-tinta/30"
                    >
                      {String(indice + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <CampoEditable
                        inicial={paso.titulo ?? ""}
                        onCambio={(titulo) =>
                          tocar({
                            pasos: datos.pasos.map((otro) =>
                              otro.id === paso.id ? { ...otro, titulo } : otro,
                            ),
                          })
                        }
                        placeholder="rotulillo (opcional)"
                        className="mb-2 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.18em] text-tinta/50"
                      />
                      <CampoEditable
                        inicial={paso.texto}
                        onCambio={(texto) =>
                          tocar({
                            pasos: datos.pasos.map((otro) =>
                              otro.id === paso.id ? { ...otro, texto } : otro,
                            ),
                          })
                        }
                        multilinea
                        placeholder="Qué se hace en este paso."
                        className="px-0.5 text-[17px] leading-[1.6]"
                      />
                    </div>
                    <div className="flex flex-col items-stretch gap-1.5">
                      <label className="relative block aspect-square cursor-pointer overflow-hidden bg-raya-clara">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={subiendo[paso.id] === true}
                          onChange={(evento) => {
                            const fichero = evento.target.files?.[0];
                            if (fichero) void cambiarFotoDePaso(paso, indice, fichero);
                            evento.target.value = "";
                          }}
                        />
                        {foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={urlConAncho(foto.url, 240)}
                            alt={foto.alt}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <span className="rayas-finas absolute inset-0 flex items-center justify-center text-center font-[family-name:var(--font-dm-mono)] text-[9.5px] uppercase tracking-[0.12em] text-tinta/50">
                            {subiendo[paso.id] === true ? "…" : "foto"}
                          </span>
                        )}
                      </label>
                      {foto && (
                        <button
                          type="button"
                          onClick={() => void quitarFotoDePaso(paso)}
                          className="font-[family-name:var(--font-dm-mono)] text-[9.5px] uppercase tracking-[0.12em] text-tinta/45 hover:text-acento"
                        >
                          quitar foto
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          tocar({
                            pasos: datos.pasos.filter((otro) => otro.id !== paso.id),
                          })
                        }
                        className="font-[family-name:var(--font-dm-mono)] text-[9.5px] uppercase tracking-[0.12em] text-tinta/45 hover:text-acento"
                      >
                        ✕ quitar paso
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nota personal */}
            <div className="mt-10 border-l-2 border-acento bg-superficie px-7 py-6.5">
              <div className="mb-2.75 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.2em] text-acento">
                Nota personal
              </div>
              <CampoEditable
                inicial={receta.notas ?? ""}
                onCambio={(notas) => tocar({ notas })}
                multilinea
                placeholder="Lo que le contarías a quien la cocine (opcional)."
                className="-ml-1 px-1 font-[family-name:var(--font-bricolage)] text-xl leading-[1.4] tracking-[-0.028em]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
