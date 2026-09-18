import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Instrument_Sans, Pinyon_Script } from "next/font/google";
import "./globals.css";

// Una familia para toda la interfaz; la caligrafía solo identifica la cubierta.
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
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
  // Solo estilo claro: un unico themeColor, sin variante oscura.
  themeColor: "#dee6e9",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html
      lang="es"
      className={`${instrument.variable} ${pinyon.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
