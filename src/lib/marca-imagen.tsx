import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** Reutiliza el original de marca y los colores del sistema visual. */
export async function imagenDeMarca(ancho: number, alto: number, social = false) {
  const [logo, estilos] = await Promise.all([
    readFile(join(process.cwd(), "public", "Logo.png")),
    readFile(join(process.cwd(), "src", "app", "globals.css"), "utf8"),
  ]);
  const papel = estilos.match(/--papel:\s*(#[0-9a-f]+)/i)?.[1];
  const tinta = estilos.match(/--tinta:\s*(#[0-9a-f]+)/i)?.[1];
  const lado = social ? 270 : ancho;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: papel, color: tinta, display: "flex", alignItems: "center", justifyContent: "center", gap: 52, padding: social ? 70 : 0 }}>
      {/* El fichero se incrusta: no se consulta ningún servicio externo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${logo.toString("base64")}`} width={lado} height={lado} alt="" style={{ borderRadius: "50%", objectFit: "cover" }} />
      {social && <div style={{ display: "flex", flexDirection: "column", maxWidth: 620, gap: 26 }}>
        <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>Mi libro de recetas</div>
        <div style={{ fontSize: 28 }}>Un cuaderno de cocina · Alejandro</div>
      </div>}
    </div>, { width: ancho, height: alto },
  );
}
