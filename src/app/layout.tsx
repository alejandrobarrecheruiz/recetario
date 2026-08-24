import type { Metadata, Viewport } from "next";
import { Newsreader, Literata } from "next/font/google";
import "./globals.css";

// Las dos familias del sistema (fase 7): Newsreader para display y Literata
// para el cuerpo. Variables CSS que globals.css mapea a font-display/font-cuerpo.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // La URL canonica del despliegue actual; vale para que las imagenes de
  // OpenGraph salgan absolutas. En Vercel cada entorno trae la suya.
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "La cocina nos Une",
    template: "%s · La cocina nos Une",
  },
  description: "Una receta cada semana, de nuestra cocina a la tuya.",
  openGraph: {
    siteName: "La cocina nos Une",
    locale: "es_ES",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#141f26" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${newsreader.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
