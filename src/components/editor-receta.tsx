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
  type Receta,
} from "@/models/receta";
import type { Imagen } from "@/models/imagen";
import { subirImagen, quitarImagen } from "@/lib/subir-imagen";
import { fechaDePublicacion, parsearCantidad, urlConAncho } from "@/lib/formato";
import { Logo } from "@/components/logo";
import { DatosReceta } from "@/components/datos-receta";
import { DescripcionImagen } from "@/components/descripcion-imagen";
import { leerBorradores, prefijoBorrador } from "@/lib/borradores-editor";
import type { DatosEditor, BorradorEditor } from "@/models/borrador-editor";
import type { Ingrediente, Paso } from "@/models/receta";

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

type FaseGuardado = "limpio" | "pendiente" | "guardando" | "invalido" | "fallo";

function ingredienteVacio(): Ingrediente {
  return { id: crypto.randomUUID(), cantidad: 0, unidad: "", nombre: "" };
}

const formatoCantidadEditor = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 3,
});

/**
 * El campo de cantidad de un ingrediente. Es de texto y no numérico porque
 * «un cuarto» no se teclea como decimal de forma natural: admite «0,25»,
 * «1/4», «¼» o «1 1/2» y guarda siempre el número (`parsearCantidad`). Lo que
 * aún no parsea (un «1/» a medio teclear) se queda en pantalla sin guardarse,
 * y al salir del campo se limpia: vacío es 0 («al gusto») y un garabato
 * vuelve al último valor bueno.
 */
function EntradaCantidad({
  valor,
  onCambio,
  etiqueta,
}: {
  valor: number;
  onCambio: (cantidad: number) => void;
  etiqueta: string;
}) {
  const [texto, setTexto] = useState(() => formatoCantidadEditor.format(valor));
  return (
    <input
      aria-label={etiqueta}
      value={texto}
      onChange={(evento) => {
        setTexto(evento.target.value);
        const cantidad = parsearCantidad(evento.target.value);
        if (cantidad !== null) onCambio(cantidad);
      }}
      onBlur={() => {
        const cantidad = texto.trim() === "" ? 0 : (parsearCantidad(texto) ?? valor);
        setTexto(formatoCantidadEditor.format(cantidad));
        if (cantidad !== valor) onCambio(cantidad);
      }}
      className="editor-campo editor-ingrediente-cantidad"
    />
  );
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
      className={`editor-editable ${className ?? ""}`}
    />
  );
}

/** Rotulillo de grupo de la barra lateral. */
function RotuloLateral({ children }: { children: ReactNode }) {
  return (
    <h3 className="editor-rotulo">
      {children}
    </h3>
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
            aria-label={`Quitar ${valor}`}
            onClick={() => onCambio(valores.filter((otro) => otro !== valor))}
            className="editor-chip"
          >
            {valor} <span className="text-tinta/45">×</span>
          </button>
        ))}
        {anadiendo ? (
          <input
            autoFocus
            aria-label={`Añadir a ${rotulo.toLocaleLowerCase("es")}`}
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
            className="editor-campo editor-chip-campo"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAnadiendo(true)}
            className="boton-panel boton-panel-secundario"
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
  usuarioId,
}: {
  receta: Receta;
  imagenes: Imagen[];
  usuarioId: string;
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
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [arrastre, setArrastre] = useState<
    { lista: "ingredientes" | "pasos"; desde: number } | null
  >(null);

  const version = useRef(0);
  const revisionServidor = useRef(new Date(receta.actualizadaEn).toISOString());
  const guardando = useRef(false);
  const hayConflicto = useRef(false);
  const fotosPendientesDeBorrar = useRef(new Set<string>());
  const [borrando, setBorrando] = useState(false);
  const guardarRef = useRef<() => void>(() => {});
  const [instancia] = useState(() => crypto.randomUUID());
  const claveBorrador = `${prefijoBorrador(usuarioId, receta._id)}${instancia}`;
  const [recuperables, setRecuperables] = useState<ReturnType<typeof leerBorradores>>([]);
  const [borradoresLeidos, setBorradoresLeidos] = useState(false);
  const [avisoLocal, setAvisoLocal] = useState("");
  const [versionVista, setVersionVista] = useState(0);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      try { setRecuperables(leerBorradores(window.localStorage, usuarioId, receta._id)); }
      catch { setAvisoLocal("El navegador no permite guardar una copia local. Descarga tus cambios antes de salir."); }
      setBorradoresLeidos(true);
    }, 0);
    return () => clearTimeout(temporizador);
  }, [usuarioId, receta._id]);

  useEffect(() => {
    if (!borradoresLeidos) return;
    try {
      if (guardado.fase === "limpio" && fotosPendientesDeBorrar.current.size === 0) {
        window.localStorage.removeItem(claveBorrador);
      } else {
        const borrador: BorradorEditor = { recetaId: receta._id, usuarioId, revision: revisionServidor.current,
          guardadoEn: Date.now(), datos, imagenes: Object.values(imagenesPorId), fotosPendientes: [...fotosPendientesDeBorrar.current] };
        window.localStorage.setItem(claveBorrador, JSON.stringify(borrador));
      }
    } catch {
      queueMicrotask(() => setAvisoLocal("No se puede mantener la copia local: el almacenamiento está lleno o bloqueado. Descarga tus cambios antes de salir."));
    }
  }, [borradoresLeidos, claveBorrador, guardado.fase, datos, imagenesPorId, receta._id, usuarioId]);

  function descargarCambios() {
    const fichero = new Blob([JSON.stringify({ recetaId: receta._id, usuarioId, revision: revisionServidor.current,
      guardadoEn: Date.now(), datos, imagenes: Object.values(imagenesPorId), fotosPendientes: [...fotosPendientesDeBorrar.current] }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(fichero);
    const enlace = document.createElement("a"); enlace.href = url; enlace.download = `borrador-${receta._id}.json`; enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function guardarMiVersion() {
    try {
      const respuesta = await fetch(`/api/recetas/${receta._id}`, { cache: "no-store" });
      if (!respuesta.ok) throw new Error();
      const actual: Receta = await respuesta.json();
      if (!window.confirm(`¿Quieres sustituir la versión del servidor guardada el ${new Date(actual.actualizadaEn).toLocaleString("es")} por tus cambios?`)) return;
      revisionServidor.current = new Date(actual.actualizadaEn).toISOString();
      hayConflicto.current = false;
      await guardar();
    } catch { setGuardado({ fase: "fallo", problema: "No se pudo consultar la versión actual. Tus cambios siguen en el editor." }); }
  }

  function recuperar(clave: string, borrador: BorradorEditor) {
    // Primero copiar: una cuota de almacenamiento llena no debe perder la copia original.
    try { window.localStorage.setItem(claveBorrador, JSON.stringify(borrador)); window.localStorage.removeItem(clave); }
    catch { setAvisoLocal("No se pudo copiar el borrador local. Conserva una descarga antes de salir."); }
    revisionServidor.current = borrador.revision;
    hayConflicto.current = borrador.revision !== new Date(receta.actualizadaEn).toISOString();
    fotosPendientesDeBorrar.current = new Set(borrador.fotosPendientes);
    setDatos(borrador.datos);
    setImagenesPorId(Object.fromEntries(borrador.imagenes.map(imagen => [imagen._id, imagen])));
    version.current += 1; setVersionVista(v => v + 1);
    setRecuperables(actuales => actuales.filter(b => b.clave !== clave));
    setGuardado(hayConflicto.current ? { fase: "fallo", problema: "Hay una versión más reciente en el servidor. Revisa la receta actual antes de sustituirla con tu borrador." } : { fase: "pendiente" });
  }

  function tocar(cambios: Partial<DatosEditor> | ((actuales: DatosEditor) => Partial<DatosEditor>)) {
    version.current += 1;
    setDatos((actuales) => ({ ...actuales, ...(typeof cambios === "function" ? cambios(actuales) : cambios) }));
    setGuardado(hayConflicto.current
      ? { fase: "fallo", problema: "Hay otra versión en el servidor. Revisa ambas antes de guardar tu versión." }
      : { fase: "pendiente" });
  }

  async function guardar(publicando = false) {
    if (guardando.current || hayConflicto.current || borrando) return;
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

    guardando.current = true;
    setGuardado({ fase: "guardando" });
    try {
      const respuesta = await fetch(`/api/recetas/${receta._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "If-Match": revisionServidor.current },
        body: JSON.stringify(entrada.data),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        hayConflicto.current = respuesta.status === 412;
        throw new Error(cuerpo?.error ?? "No se pudo guardar. Comprueba tu conexión y vuelve a intentarlo.");
      }
      const guardada: Receta = await respuesta.json();
      revisionServidor.current = new Date(guardada.actualizadaEn).toISOString();
      setDatos((actuales) => ({
        ...actuales,
        estado: version.current === enVersion ? guardada.estado : actuales.estado,
        publicadaEn: guardada.publicadaEn,
      }));
      setGuardadoEn(Date.now());
      setHaceSegundos(0);
      // Solo borrar después de que el servidor confirme que ya no se usa.
      const usadas = new Set([guardada.portadaId, ...guardada.pasos.map((paso) => paso.imagenId)]);
      for (const id of fotosPendientesDeBorrar.current) {
        if (usadas.has(id)) continue;
        try {
          await quitarImagen(id);
          fotosPendientesDeBorrar.current.delete(id);
        } catch {
          setErrorSubida("Los cambios están guardados, pero alguna foto anterior no se pudo limpiar. Pulsa Guardar para reintentarlo.");
        }
      }
      setGuardado(version.current === enVersion ? { fase: "limpio" } : { fase: "pendiente" });
    } catch (error) {
      setGuardado({ fase: "fallo", problema: error instanceof Error ? error.message : "No hay conexión. Vuelve a guardar cuando se recupere." });
    } finally {
      guardando.current = false;
    }
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

  useEffect(() => {
    if (guardado.fase === "limpio" || borrando) return;
    const alCerrar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    const alNavegar = (evento: MouseEvent) => {
      const enlace = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (enlace?.hasAttribute("download") || enlace?.getAttribute("target") === "_blank" || evento.metaKey || evento.ctrlKey) return;
      if (enlace && !window.confirm("Hay cambios sin guardar en el servidor. ¿Quieres salir? Comprueba que tienes una copia local o una descarga antes de hacerlo.")) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", alCerrar);
    document.addEventListener("click", alNavegar, true);
    return () => {
      window.removeEventListener("beforeunload", alCerrar);
      document.removeEventListener("click", alNavegar, true);
    };
  }, [guardado.fase, borrando]);

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
      if (anterior) fotosPendientesDeBorrar.current.add(anterior);
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
    fotosPendientesDeBorrar.current.add(id);
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
      tocar((actuales) => ({
        pasos: actuales.pasos.map((otro) =>
          otro.id === paso.id ? { ...otro, imagenId: imagen._id } : otro,
        ),
      }));
      if (anterior) fotosPendientesDeBorrar.current.add(anterior);
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
    fotosPendientesDeBorrar.current.add(id);
  }

  async function borrarReceta() {
    if (guardando.current || borrando) return;
    if (!confirmandoBorrado) {
      // Doble pulsacion en vez de confirm(): sin modales del navegador.
      setConfirmandoBorrado(true);
      return;
    }
    setBorrando(true);
    try {
    const respuesta = await fetch(`/api/recetas/${receta._id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      setConfirmandoBorrado(false);
      const cuerpo = await respuesta.json().catch(() => null);
      setGuardado({ fase: "fallo", problema: cuerpo?.error ?? "no se pudo borrar" });
      setBorrando(false);
      return;
    }
    const resultado = await respuesta.json();
    router.push(resultado.imagenesConFallo ? "/admin?limpieza=pendiente" : "/admin");
    router.refresh();
    } catch {
      setBorrando(false);
      setGuardado({ fase: "fallo", problema: "No se pudo confirmar el borrado. Comprueba la conexión." });
    }
  }

  const portada = datos.portadaId ? imagenesPorId[datos.portadaId] : undefined;
  const claseFilaFicha = "editor-fila-ficha";
  const claseDatoFicha = "editor-campo editor-dato-ficha";

  return (
    <div key={versionVista} className="editor-receta">
      {recuperables.length > 0 && <aside className="editor-aviso" aria-label="Borradores recuperables">
        <p>Hay cambios sin guardar de otra pestaña o sesión en este navegador.</p>
        {recuperables.map(({ clave, borrador }) => <div key={clave} className="mt-3 flex flex-wrap items-center gap-4">
          <span>{new Date(borrador.guardadoEn).toLocaleString("es")}</span>
          <button type="button" disabled={guardado.fase !== "limpio"} onClick={() => recuperar(clave, borrador)}>Recuperar borrador</button>
          <button type="button" onClick={() => { window.localStorage.removeItem(clave); setRecuperables(actuales => actuales.filter(b => b.clave !== clave)); }}>Descartar copia local</button>
        </div>)}
      </aside>}
      {avisoLocal && <p role="alert" className="editor-aviso text-acento">{avisoLocal}</p>}
      {conProblema && <aside className="editor-aviso editor-aviso-acciones" aria-label="Recuperar cambios">
        <button type="button" onClick={descargarCambios}>Descargar mis cambios</button>
        <a href={`/recetas/${receta.slug}`} target="_blank" rel="noopener noreferrer">Revisar receta del servidor</a>
        <button type="button" onClick={() => window.location.reload()}>Recargar y conservar borrador local</button>
        <button type="button" onClick={() => void guardarMiVersion()}>Guardar mi versión revisada</button>
      </aside>}
      {/* ── Barra superior ─────────────────────────────────────────── */}
      <header className="editor-barra">
        <a href="#contenido-editor" className="saltar-contenido">Saltar a la receta</a>
        <div className="editor-barra-identidad">
          <Logo tamano={44} />
          <Link href="/admin" className="editor-enlace-panel">Panel · Recetas</Link>
          <span className="editor-estado">{datos.estado === "publicada" ? "Publicada" : "Borrador"}</span>
        </div>
        <div className="editor-barra-acciones">
          <span
            role="status"
            className={`editor-guardado ${conProblema ? "text-acento" : "text-tinta/65"}`}
          >
            <span aria-hidden="true">{textoGuardado()}</span>
            <span className="sr-only">{guardado.fase === "limpio" ? "Cambios guardados" : textoGuardado()}</span>
          </span>
          {datos.estado === "publicada" && (
            <button
              type="button"
              onClick={() => tocar({ estado: "borrador" })}
              disabled={guardado.fase === "guardando" || borrando}
              className="boton-panel boton-panel-secundario"
            >
              Pasar a borrador
            </button>
          )}
          <button type="button" disabled={guardado.fase === "guardando" || borrando} onClick={() => void guardar()} className={`boton-panel ${datos.estado === "publicada" ? "" : "boton-panel-secundario"}`}>Guardar</button>
          {datos.estado === "borrador" && <button
            type="button"
            disabled={guardado.fase === "guardando" || borrando}
            onClick={() => void guardar(true)}
            className="boton-panel"
          >
            Publicar
          </button>}
        </div>
      </header>

      <div className="editor-disposicion">
        {/* ── Barra lateral ──────────────────────────────────────── */}
        <aside className="editor-lateral" aria-label="Detalles de la receta">
          <h2 className="editor-ajustes-titulo">Detalles de la receta</h2>
          <button type="button" className="editor-ajustes-toggle" aria-expanded={ajustesAbiertos} aria-controls="ajustes-receta" onClick={() => setAjustesAbiertos(abiertos => !abiertos)}>
            <span>Detalles de la receta</span><span aria-hidden="true">{ajustesAbiertos ? "−" : "+"}</span>
          </button>
          <div id="ajustes-receta" className="editor-ajustes-contenido" data-abierto={ajustesAbiertos}>
          <div>
            <RotuloLateral>Quién la ve</RotuloLateral>
            <div className="flex flex-col gap-2.25">
              {(
                [
                  ["publica", "Pública"],
                  ["registrada", "Lectores registrados"],
                ] as const
              ).map(([valor, rotulo]) => {
                const activa = datos.visibilidad === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => tocar({ visibilidad: valor })}
                    className="editor-opcion-visibilidad"
                  >
                    <span
                      aria-hidden="true" className="editor-indicador-opcion"
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
                  className={claseDatoFicha}
                />
              </label>
              <div className={claseFilaFicha}>
                <span className="text-sm text-tinta/65">Preparación / cocción (min)</span>
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
                    className={`${claseDatoFicha} editor-dato-tiempo`}
                  />
                  <span className="text-tinta/45" aria-hidden="true">
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
                    className={`${claseDatoFicha} editor-dato-tiempo`}
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
                  className={claseDatoFicha}
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
                <p className="editor-ayuda">
                  Publicada el {fechaDePublicacion(new Date(datos.publicadaEn))}. La
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
            <RotuloLateral>Dirección de la receta</RotuloLateral>
            <label className="editor-direccion"><span>/recetas/</span><input className="editor-campo" aria-label="URL de la receta" value={datos.slug} readOnly={Boolean(datos.publicadaEn)} onChange={evento => tocar({ slug: evento.target.value.toLowerCase() })} /></label>
          </div>
          <div>
            <RotuloLateral>Para buscadores</RotuloLateral>
            <textarea
              aria-label="Descripción para buscadores"
              rows={3}
              value={datos.seoDescripcion}
              onChange={(evento) => tocar({ seoDescripcion: evento.target.value })}
              placeholder="La descripción que sale en Google."
              className="editor-campo editor-descripcion-seo"
            />
          </div>

          <div className="mt-auto flex flex-col gap-4">
            <p className="editor-ayuda">
              Escribe en el título, los ingredientes y los pasos. Los cambios se guardan automáticamente.
            </p>
            <button
              type="button"
              onClick={() => void borrarReceta()}
              className="boton-panel boton-panel-peligro"
            >
              {confirmandoBorrado ? "¿Seguro? Pulsa otra vez" : "Borrar receta"}
            </button>
          </div>
          </div>
        </aside>

        {/* ── La receta, tal como se ve ──────────────────────────── */}
        <main id="contenido-editor" tabIndex={-1} className="editor-hoja">
          <h1 className="sr-only">Editar receta: {datos.titulo}</h1>
          {errorSubida && <p role="alert" className="editor-aviso text-acento">{errorSubida}</p>}
          <div className={`editor-introduccion${portada ? "" : " editor-sin-portada"}`}>
            <div className="editor-presentacion">
              <p className="editor-etiqueta">Título</p>
              <CampoEditable inicial={datos.titulo} onCambio={titulo => tocar({ titulo })} placeholder="El nombre del plato" className="ficha-titulo editor-titulo" />
              <p className="editor-etiqueta">Resumen</p>
              <CampoEditable inicial={datos.resumen} onCambio={resumen => tocar({ resumen })} multilinea placeholder="Dos líneas sobre por qué esta receta." className="ficha-resumen editor-resumen" />
              <DatosReceta minutos={datos.tiempo.total} raciones={datos.raciones} dificultad={datos.dificultad} />
            </div>
            <section className="editor-portada" aria-label="Foto de portada">
              {portada && <div className="marco-foto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlConAncho(portada.url, 1200)} alt={portada.alt} width={portada.ancho} height={portada.alto} />
              </div>}
              <div className="editor-foto-controles">
              <label className="boton-panel boton-panel-secundario editor-subida" aria-disabled={subiendo.portada === true}>
                <input
                  type="file"
                  aria-label="Foto de portada"
                  accept="image/*"
                  className="sr-only"
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
                    : "Añadir foto de portada"}
              </label>
              {portada && (
                <button
                  type="button"
                  disabled={subiendo.portada === true}
                  onClick={() => void quitarPortada()}
                  className="boton-panel boton-panel-secundario"
                >
                  Quitar foto
                </button>
              )}
              </div>
              {portada && <DescripcionImagen key={portada._id} id={portada._id} inicial={portada.alt} onGuardada={alt => setImagenesPorId(actual => ({ ...actual, [portada._id]: { ...actual[portada._id], alt } }))} />}
            </section>
          </div>

          <div className="editor-cuerpo">
            {/* Ingredientes */}
            <div className="editor-seccion-cabecera">
              <h2 className="ficha-titulo-seccion">Ingredientes</h2>
              <button
                type="button"
                onClick={() =>
                  tocar({ ingredientes: [...datos.ingredientes, ingredienteVacio()] })
                }
                className="boton-panel boton-panel-secundario"
              >
                Añadir ingrediente
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
                  className="editor-ingrediente"
                >
                  <span className="editor-orden editor-orden-ingrediente">
                  <button type="button" aria-label={`Subir ingrediente ${indice + 1}`} disabled={indice === 0} onClick={() => tocar({ ingredientes: mover(datos.ingredientes, indice, indice - 1) })}>↑</button>
                  <span
                    draggable
                    onDragStart={() => setArrastre({ lista: "ingredientes", desde: indice })}
                    onDragEnd={() => setArrastre(null)}
                    title="Arrastra para reordenar"
                    className="editor-arrastre"
                  >
                    ::
                  </span>
                  <button type="button" aria-label={`Bajar ingrediente ${indice + 1}`} disabled={indice === datos.ingredientes.length - 1} onClick={() => tocar({ ingredientes: mover(datos.ingredientes, indice, indice + 1) })}>↓</button>
                  </span>
                  <EntradaCantidad
                    etiqueta={`Cantidad del ingrediente ${indice + 1}`}
                    valor={ingrediente.cantidad}
                    onCambio={(cantidad) =>
                      tocar({
                        ingredientes: datos.ingredientes.map((otro) =>
                          otro.id === ingrediente.id ? { ...otro, cantidad } : otro,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`Unidad del ingrediente ${indice + 1}`}
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
                    className="editor-campo editor-ingrediente-unidad"
                  />
                  <input
                    aria-label={`Nombre del ingrediente ${indice + 1}`}
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
                    className="editor-campo editor-ingrediente-nombre"
                  />
                  <input
                    aria-label={`Nota del ingrediente ${indice + 1}`}
                    placeholder="Nota (opcional)"
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
                    className="editor-campo editor-ingrediente-nota"
                  />
                  <button
                    type="button"
                    title="Quitar ingrediente"
                    aria-label={`Quitar ingrediente ${indice + 1}`}
                    onClick={() =>
                      tocar({
                        ingredientes: datos.ingredientes.filter(
                          (otro) => otro.id !== ingrediente.id,
                        ),
                      })
                    }
                    className="editor-quitar-ingrediente boton-icono-panel"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Pasos */}
            <div className="editor-seccion-cabecera">
              <h2 className="ficha-titulo-seccion">Pasos</h2>
              <button
                type="button"
                onClick={() => tocar({ pasos: [...datos.pasos, pasoVacio()] })}
                className="boton-panel boton-panel-secundario"
              >
                Añadir paso
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
                    className="editor-paso"
                  >
                    <div className="editor-orden editor-paso-orden">
                    <button type="button" aria-label={`Subir paso ${indice + 1}`} disabled={indice === 0} onClick={() => tocar({ pasos: mover(datos.pasos, indice, indice - 1) })}>↑</button>
                    <div
                      draggable
                      onDragStart={() => setArrastre({ lista: "pasos", desde: indice })}
                      onDragEnd={() => setArrastre(null)}
                      title="Arrastra para reordenar"
                      className="editor-arrastre ficha-paso-numero"
                    >
                      {String(indice + 1).padStart(2, "0")}
                    </div>
                    <button type="button" aria-label={`Bajar paso ${indice + 1}`} disabled={indice === datos.pasos.length - 1} onClick={() => tocar({ pasos: mover(datos.pasos, indice, indice + 1) })}>↓</button>
                    </div>
                    <div className="editor-paso-textos">
                      <CampoEditable
                        inicial={paso.titulo ?? ""}
                        onCambio={(titulo) =>
                          tocar({
                            pasos: datos.pasos.map((otro) =>
                              otro.id === paso.id ? { ...otro, titulo } : otro,
                            ),
                          })
                        }
                        placeholder={`Título del paso ${indice + 1} (opcional)`}
                        className="ficha-paso-titulo"
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
                        placeholder={`Qué se hace en el paso ${indice + 1}.`}
                        className="ficha-paso-texto"
                      />
                    </div>
                    <div className="editor-paso-imagen">
                      <label className={`editor-subida ${foto ? "editor-foto-selector marco-foto" : "boton-panel boton-panel-secundario"}`} aria-disabled={subiendo[paso.id] === true}>
                        <input
                          type="file"
                          aria-label={`Foto del paso ${indice + 1}`}
                          accept="image/*"
                          className="sr-only"
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
                            src={urlConAncho(foto.url, 960)}
                            alt={foto.alt}
                            width={foto.ancho} height={foto.alto}
                          />
                        ) : (
                          <span>
                            {subiendo[paso.id] === true ? "Subiendo…" : "Añadir foto al paso"}
                          </span>
                        )}
                        {foto && <span className="editor-foto-accion">{subiendo[paso.id] === true ? "Subiendo…" : "Cambiar foto del paso"}</span>}
                      </label>
                      {foto && (
                        <DescripcionImagen key={foto._id} id={foto._id} inicial={foto.alt} onGuardada={alt => setImagenesPorId(actual => ({ ...actual, [foto._id]: { ...actual[foto._id], alt } }))} />
                      )}
                      {foto && (
                        <button
                          type="button"
                          onClick={() => void quitarFotoDePaso(paso)}
                          disabled={subiendo[paso.id] === true}
                          className="boton-panel boton-panel-secundario"
                        >
                          Quitar foto
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          tocar({
                            pasos: datos.pasos.filter((otro) => otro.id !== paso.id),
                          })
                        }
                        className="boton-panel boton-panel-peligro"
                      >
                        Quitar paso
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nota personal */}
            <section className="editor-nota">
              <h2 className="editor-etiqueta">
                Nota personal
              </h2>
              <CampoEditable
                inicial={datos.notas}
                onCambio={(notas) => tocar({ notas })}
                multilinea
                placeholder="Lo que le contarías a quien la cocine (opcional)."
                className="editor-nota-texto"
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
