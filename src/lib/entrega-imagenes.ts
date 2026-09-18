/** Rutas propias: nunca entregar firmas ni URLs del original al navegador. */
export function rutaImagen(id: string): string {
  return `/api/imagenes/${id}`;
}

export const ANCHOS_IMAGEN = [240, 640, 828, 960, 1024, 1200, 1600] as const;

export function anchoImagen(valor: string | null): number | null {
  if (valor === null) return 1200;
  const ancho = Number(valor);
  return ANCHOS_IMAGEN.some((permitido) => String(permitido) === valor) ? ancho : null;
}
