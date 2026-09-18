"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { rutaCatalogo } from "@/lib/catalogo";
import { ilustracionCategoria } from "@/lib/presentacion-cuenta";

function IlustracionCategoria({ categoria }: { categoria: string }) {
  const tipo = ilustracionCategoria(categoria);
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tipo === "todas" && <><circle cx="32" cy="33" r="21" /><circle cx="32" cy="33" r="14" /><path d="M5 12v15m-4-15v9q0 6 8 0v-9M5 27v29M59 12q-7 12 0 20v24" /></>}
    {tipo === "aperitivos" && <><path d="M7 45q25 12 50 0M9 49q23 14 46 0M15 34l4-9 15 3-3 10ZM35 37l4-11 14 4-3 11ZM25 9l-3 21M47 11l-4 21" /><circle cx="25" cy="8" r="3" /><circle cx="47" cy="10" r="3" /></>}
    {tipo === "platos" && <path d="M9 45a23 23 0 0 1 46 0ZM5 49h54M29 20v-5h6v5M18 36q3-8 10-10" />}
    {tipo === "sopas" && <path d="M9 31h46q-2 20-23 20T9 31ZM23 51v4h18v-4M22 25q-7-6 0-11M32 25q-7-7 0-14M42 25q-7-6 0-11" />}
    {tipo === "postres" && <><path d="m10 33 33-16 12 16v18H10ZM10 33h45M10 43q8-7 16 0t16 0 13 0M36 20v-8" /><circle cx="36" cy="9" r="4" /></>}
  </svg>;
}

export function TiraCategorias({ categorias, categoria, q, formularioVisible }: {
  categorias: string[]; categoria: string; q: string; formularioVisible: boolean;
}) {
  const tira = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = tira.current;
    const activa = nav?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
    if (!nav || !activa) return;
    const zona = nav.getBoundingClientRect();
    const enlace = activa.getBoundingClientRect();
    if (enlace.left < zona.left || enlace.right > zona.right) nav.scrollLeft += enlace.left - zona.left - 8;
  }, [categoria]);
  return <nav ref={tira} className="tira-categorias" aria-label="Filtrar por categoría">
    {["", ...categorias].map(valor => <Link key={valor} href={rutaCatalogo(q, valor, formularioVisible)} scroll={false} aria-current={valor === categoria ? "page" : undefined} className="categoria-visual">
      <IlustracionCategoria categoria={valor} /><span>{valor || "Todas"}</span>
    </Link>)}
  </nav>;
}
