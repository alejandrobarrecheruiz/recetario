/** Las mutaciones autenticadas solo se aceptan desde el origen canónico. */
export function comprobarOrigen(peticion: Request): Response | null {
  const origen = peticion.headers.get("origin");
  const permitido = new URL(process.env.BETTER_AUTH_URL ?? peticion.url).origin;
  const sitio = peticion.headers.get("sec-fetch-site");
  if (origen !== permitido || (sitio !== null && sitio !== "same-origin" && sitio !== "none")) {
    return Response.json({ error: "Esta petición no procede de la web." }, { status: 403 });
  }
  return null;
}
