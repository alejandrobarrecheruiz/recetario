/** Estado efímero: no contiene texto de recetas ni se guarda fuera de memoria. */
export type ConfiguracionPreparacion = {
  recetaId: string;
  version: string;
  racionesBase: number;
  pasoIds: string[];
};

export type EstadoPreparacion = {
  raciones: number;
  pasoId: string | null;
  iniciada: boolean;
  terminada: boolean;
};

export type AccionPreparacion =
  | { tipo: "raciones"; cambio: number }
  | { tipo: "iniciar" }
  | { tipo: "mover"; cambio: number }
  | { tipo: "terminar" }
  | { tipo: "reiniciar" };

export function clavePreparacion(configuracion: Pick<ConfiguracionPreparacion, "recetaId" | "version">) {
  return `${configuracion.recetaId}:${configuracion.version}`;
}

export function preparacionInicial(configuracion: ConfiguracionPreparacion): EstadoPreparacion {
  return { raciones: configuracion.racionesBase, pasoId: configuracion.pasoIds[0] ?? null, iniciada: false, terminada: false };
}

export function reducirPreparacion(estado: EstadoPreparacion, accion: AccionPreparacion, configuracion: ConfiguracionPreparacion): EstadoPreparacion {
  switch (accion.tipo) {
    case "raciones":
      return { ...estado, iniciada: true, raciones: Math.max(1, Math.min(Math.max(12, configuracion.racionesBase), estado.raciones + Math.trunc(accion.cambio))) };
    case "iniciar":
      return configuracion.pasoIds.length ? { ...estado, iniciada: true } : estado;
    case "mover": {
      if (!configuracion.pasoIds.length) return estado;
      const actual = Math.max(0, configuracion.pasoIds.indexOf(estado.pasoId ?? ""));
      const siguiente = Math.max(0, Math.min(configuracion.pasoIds.length - 1, actual + Math.trunc(accion.cambio)));
      return { ...estado, pasoId: configuracion.pasoIds[siguiente], iniciada: true, terminada: false };
    }
    case "terminar":
      return configuracion.pasoIds.length ? { ...estado, iniciada: true, terminada: true } : estado;
    case "reiniciar":
      // Repetir los pasos conserva la escala elegida.
      return { ...estado, pasoId: configuracion.pasoIds[0] ?? null, iniciada: false, terminada: false };
  }
}
