import type { Metadata } from "next";
import { PieDePagina } from "@/components/pie-de-pagina";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutAcceso({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <PieDePagina />
  </>;
}
