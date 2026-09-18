/** Iniciales visuales; la identidad accesible siempre es el nombre completo. */
export function inicialesDelNombre(nombre: string): string {
  return nombre.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map(parte => Array.from(parte)[0]).join("").toLocaleUpperCase("es") || "?";
}

/** Ilustraciones, no una taxonomía nueva: nunca cambia el valor del filtro. */
export function ilustracionCategoria(categoria: string): "todas" | "aperitivos" | "sopas" | "postres" | "platos" {
  const nombre = categoria.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!nombre) return "todas";
  if (/aperitivo|entrante|tapa/.test(nombre)) return "aperitivos";
  if (/sopa|crema|gazpacho/.test(nombre)) return "sopas";
  if (/postre|dulce|reposteria/.test(nombre)) return "postres";
  return "platos";
}
