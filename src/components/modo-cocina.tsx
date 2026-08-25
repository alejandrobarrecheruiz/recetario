"use client";

import { useEffect, useState } from "react";
import type { Paso } from "@/models/receta";
import { duracion } from "@/lib/formato";

/**
 * «Cocinar paso a paso»: la vista de cocina a pantalla completa del rediseño.
 * Un paso cada vez, en cuerpo gigante, con barra de progreso y Anterior /
 * Siguiente. El componente pinta también su botón de apertura, que vive en la
 * cabecera pegajosa de la ficha.
 *
 * Los pasos llegan ya filtrados del servidor: aquí solo se pasa página.
 */
export function ModoCocina({
  titulo,
  pasos,
  raciones,
  minutos,
}: {
  titulo: string;
  pasos: Paso[];
  raciones: number;
  minutos: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState(0);

  // Con el modo abierto la página de detrás no se desplaza, y Escape sale.
  useEffect(() => {
    if (!abierto) return;
    const desbordamiento = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = desbordamiento;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  if (pasos.length === 0) return null;

  const paso = pasos[Math.min(actual, pasos.length - 1)];
  const hayAnterior = actual > 0;
  const haySiguiente = actual < pasos.length - 1;

  const claseNavegacion = (activo: boolean) =>
    `rounded-full px-7.5 py-4 font-[family-name:var(--font-dm-mono)] text-xs uppercase tracking-[0.14em] ${
      activo ? "bg-tinta text-papel hover:bg-acento" : "cursor-default bg-tinta/10 text-tinta/35"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActual(0);
          setAbierto(true);
        }}
        className="whitespace-nowrap rounded-full bg-tinta px-5 py-2.75 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.14em] text-papel hover:bg-acento"
      >
        Cocinar paso a paso
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-papel normal-case tracking-normal">
          <div className="h-[3px] bg-tinta/10">
            <div
              className="h-[3px] bg-acento transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: `${((actual + 1) / pasos.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-5 border-b border-tinta/10 px-[clamp(20px,5vw,48px)] py-4.5 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.16em]">
            <span className="min-w-0 truncate text-tinta/55">
              {titulo} · paso {actual + 1} de {pasos.length}
            </span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="whitespace-nowrap rounded-full border border-tinta/30 px-4 py-2.25 uppercase tracking-[0.14em] hover:border-tinta"
            >
              Salir
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center overflow-auto px-[clamp(20px,5vw,48px)] py-[clamp(28px,6vh,72px)]">
            <div className="mx-auto w-full max-w-[1100px]">
              <div className="mb-[clamp(14px,2vh,22px)] font-[family-name:var(--font-dm-mono)] text-[clamp(10px,1vw,12px)] uppercase tracking-[0.24em] text-acento">
                {paso.titulo ?? `Paso ${actual + 1}`}
              </div>
              <div className="flex flex-wrap items-start gap-[clamp(20px,3vw,44px)]">
                <div className="font-[family-name:var(--font-bricolage)] text-[clamp(64px,11vw,190px)] font-extrabold leading-[0.8] tracking-[-0.05em] text-tinta/15">
                  {String(actual + 1).padStart(2, "0")}
                </div>
                <p className="min-w-0 max-w-[32ch] flex-1 basis-[420px] text-[clamp(22px,2.6vw,42px)] leading-[1.32] tracking-[-0.02em] [text-wrap:pretty]">
                  {paso.texto}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-tinta/10 px-[clamp(20px,5vw,48px)] pb-[clamp(22px,4vh,34px)] pt-[clamp(16px,3vh,26px)]">
            <div className="font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.16em] text-tinta/50">
              {raciones} raciones · {duracion(minutos)}
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setActual((valor) => Math.max(0, valor - 1))}
                className={claseNavegacion(hayAnterior)}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setActual((valor) => Math.min(pasos.length - 1, valor + 1))}
                className={claseNavegacion(haySiguiente)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
