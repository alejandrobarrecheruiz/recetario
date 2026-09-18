import { NextRequest, NextResponse } from "next/server";

export function proxy(peticion: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const desarrollo = process.env.NODE_ENV === "development";
  const origenImagenes = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
    ? new URL(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT).origin : "https://ik.imagekit.io";
  const politica = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desarrollo ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${origenImagenes}`,
    "font-src 'self'",
    `connect-src 'self' https://upload.imagekit.io${desarrollo ? " ws: wss:" : ""}`,
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!desarrollo ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const cabeceras = new Headers(peticion.headers);
  cabeceras.set("x-nonce", nonce);
  cabeceras.set("Content-Security-Policy", politica);
  const respuesta = NextResponse.next({ request: { headers: cabeceras } });
  respuesta.headers.set("Content-Security-Policy", politica);
  return respuesta;
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|.*\\.(?:jpg|png|webp|svg|mp4)$).*)"],
};
