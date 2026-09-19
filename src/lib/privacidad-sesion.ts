/**
 * Better Auth combina este parche con los datos de la nueva sesión.
 * Usar null explícito: omitir campos no impediría guardar sus valores originales.
 * No activar disableIpTracking: la IP sigue siendo necesaria para rateLimit.
 */
export async function minimizarNuevaSesion() {
  return { data: { ipAddress: null, userAgent: null } };
}
