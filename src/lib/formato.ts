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
