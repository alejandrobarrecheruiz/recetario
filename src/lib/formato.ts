/**
 * Formato de fechas y cantidades del dominio. Puro e isomorfo: lo usan paginas
 * de servidor y el escalador de raciones, que es un componente de cliente.
 */

const formatoCantidad = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
});

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

/** Cantidades escaladas sin colas de decimales: 262,5 y no 262.50000000003. */
export function formatearCantidad(cantidad: number): string {
  return formatoCantidad.format(Math.round(cantidad * 100) / 100);
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
