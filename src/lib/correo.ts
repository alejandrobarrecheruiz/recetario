/** Solo servidor. Nunca registrar enlaces: contienen tokens de un solo uso. */
export function correoConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.CORREO_REMITENTE);
}

export async function enviarCorreoAcceso(destinatario: string, url: string, tipo: "verificar" | "recuperar") {
  if (!correoConfigurado()) throw new Error("Correo transaccional sin configurar.");
  const verificar = tipo === "verificar";
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CORREO_REMITENTE,
      to: [destinatario],
      subject: verificar ? "Confirma tu correo · Mi libro de recetas" : "Recupera tu acceso · Mi libro de recetas",
      text: `${verificar ? "Confirma tu correo" : "Elige una contraseña nueva"} abriendo este enlace (caduca en una hora):\n\n${url}\n\nSi no lo has solicitado, ignora este mensaje.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!respuesta.ok) throw new Error("No se pudo enviar el correo de acceso.");
}
