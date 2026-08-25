import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Instrument_Sans,
  DM_Mono,
  Pinyon_Script,
} from "next/font/google";
import "./globals.css";

// Las cuatro familias del sistema (fase 10): Bricolage Grotesque para display,
// Instrument Sans para el cuerpo, DM Mono para rótulos y datos, y Pinyon
// Script solo para el nombre del blog. Variables CSS que globals.css mapea a
// font-display/font-cuerpo/font-rotulo/font-script.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const pinyon = Pinyon_Script({
  variable: "--font-pinyon",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  // La URL canonica del despliegue actual; vale para que las imagenes de
  // OpenGraph salgan absolutas. En Vercel cada entorno trae la suya.
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "Mi libro de recetas",
    template: "%s · Mi libro de recetas",
  },
  description:
    "Un cuaderno de cocina: subo una receta cuando la hago, con las cantidades que uso de verdad.",
  openGraph: {
    siteName: "Mi libro de recetas",
    locale: "es_ES",
    type: "website",
  },
};

export const viewport: Viewport = {
  // Solo estilo claro (fase 10): un unico themeColor, sin variante oscura.
  themeColor: "#dee6e9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${instrument.variable} ${dmMono.variable} ${pinyon.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
