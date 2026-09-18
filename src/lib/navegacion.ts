/** Resuelve únicamente rutas internas. Nunca devuelve un origen ni credenciales. */
export function destinoInterno(valor: string | null, origen: string): string {
  if (!valor?.startsWith("/") || /[\\\u0000-\u0020\u007f]/.test(valor)) return "/";
  try {
    const base = new URL(origen);
    const destino = new URL(valor, base);
    if (destino.origin !== base.origin || destino.username || destino.password) return "/";
    // Volver al propio formulario no aporta nada y puede crear bucles.
    if (destino.pathname === "/login") return "/";
    return `${destino.pathname}${destino.search}${destino.hash}`;
  } catch {
    return "/";
  }
}
