/**
 * Formato de fechas y cantidades del dominio. Puro e isomorfo: lo usan paginas
 * de servidor y el escalador de raciones, que es un componente de cliente.
 */

const formatoMedida = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
});

const GLIFO_DE_CUARTO = ["", "¼", "½", "¾"];

const VALOR_DE_GLIFO: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
};

/** "17 de agosto", con el año solo cuando no es el corriente. */
export function fechaDePublicacion(fecha: Date | null): string | null {
  if (fecha === null) return null;
  const diaYMes = fecha.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const anno = fecha.getUTCFullYear();
  return anno === new Date().getUTCFullYear() ? diaYMes : `${diaYMes} de ${anno}`;
}

/** Múltiplo de `paso` igual o superior, con colchón para la coma flotante. */
function alMultiploSuperior(valor: number, paso: number): number {
  return Math.ceil(valor / paso - 1e-9) * paso;
}

/**
 * "150 g", "1½" (las piezas no escriben unidad), o null para "al gusto"
 * (cantidad 0). Redondea siempre al alza, que al escalar a la baja nunca haga
 * desaparecer un ingrediente: las piezas al cuarto y en fracciones («¼»,
 * nunca «0,25 cebolla») y las medidas al medio (0,4 → 0,5; 3,6 → 4), con lo
 * que el único decimal posible es «,5». Adiós al 1,666.
 */
export function medida(cantidad: number, unidad: string): string | null {
  if (cantidad === 0) return null;
  if (unidad === "" || unidad === "unidad") {
    const valor = alMultiploSuperior(cantidad, 0.25);
    const entero = Math.floor(valor);
    const glifo = GLIFO_DE_CUARTO[Math.round((valor - entero) * 4)];
    return entero === 0 ? glifo : `${entero}${glifo}`;
  }
  return `${formatoMedida.format(alMultiploSuperior(cantidad, 0.5))} ${unidad}`;
}

/**
 * Lo que se teclea en el campo de cantidad del editor: «0,25», «1/4», «¼» o
 * «1 1/2» valen y se normalizan al número que guarda el modelo. Devuelve null
 * si (todavía) no es una cantidad.
 */
export function parsearCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  const conGlifo = limpio.match(/^(\d+)?\s*([¼½¾⅓⅔])$/);
  if (conGlifo) return Number(conGlifo[1] ?? 0) + VALOR_DE_GLIFO[conGlifo[2]];
  const conBarra = limpio.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (conBarra) {
    const divisor = Number(conBarra[3]);
    if (divisor === 0) return null;
    return Number(conBarra[1] ?? 0) + Number(conBarra[2]) / divisor;
  }
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

/**
 * URL de entrega con transformacion de ImageKit: ancho fijado y compresion.
 * Vive aqui y no en lib/imagenes.ts porque es pura e isomorfa: tambien la usa
 * el editor del panel, que es un componente de cliente, y lib/imagenes.ts
 * arrastra el driver de Mongo.
 */
export function urlConAncho(url: string, ancho: number): string {
  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}tr=w-${ancho},q-80`;
}

/** "40 min", "1 h", "1 h 10". Para los rótulos de tiempo del rediseño. */
export function duracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto}`;
}
