"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Ingrediente } from "@/models/receta";
import { duracion, medida } from "@/lib/formato";

/**
 * «Cocinar paso a paso»: la vista de cocina a pantalla completa. Un paso cada
 * vez en cuerpo gigante, con su foto si la tiene, barra de progreso y los
 * ingredientes a mano en un panel propio. El componente pinta también su botón
 * de apertura, que vive en la cabecera pegajosa de la ficha.
 *
 * Pensada para la encimera: se pasa de paso con los botones, deslizando el
 * dedo o con las flechas del teclado, y mientras está abierta se pide un wake
 * lock para que la pantalla del móvil no se apague con las manos sucias.
 *
 * Los pasos llegan ya filtrados y resueltos del servidor (URL de foto, no
 * imagenId): aquí solo se pasa página.
 */

type PasoDeCocina = {
  id: string;
  titulo?: string;
  texto: string;
  fotoUrl: string | null;
  fotoAlt: string;
};

/** "1000 g", "1½" (la unidad "unidad" no se escribe), o null para "al gusto". */
function medidaDe(ingrediente: Ingrediente): string | null {
  return medida(ingrediente.cantidad, ingrediente.unidad);
}

export function ModoCocina({
  titulo,
  pasos,
  ingredientes,
  raciones,
  minutos,
}: {
  titulo: string;
  pasos: PasoDeCocina[];
  ingredientes: Ingrediente[];
  raciones: number;
  minutos: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState(0);
  const [verIngredientes, setVerIngredientes] = useState(false);
  const toque = useRef<{ x: number; y: number } | null>(null);

  // Con el modo abierto la página de detrás no se desplaza; Escape cierra el
  // panel de ingredientes o, si no está, el modo entero; las flechas pasan página.
  useEffect(() => {
    if (!abierto) return;
    const desbordamiento = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setVerIngredientes((viendo) => {
          if (!viendo) setAbierto(false);
          return false;
        });
      }
      if (evento.key === "ArrowRight") {
        setActual((valor) => Math.min(pasos.length - 1, valor + 1));
      }
      if (evento.key === "ArrowLeft") {
        setActual((valor) => Math.max(0, valor - 1));
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = desbordamiento;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, pasos.length]);

  // Wake lock: cocinando, la pantalla no se apaga. Si el navegador no lo trae
  // o lo deniega, no pasa nada; se vuelve a pedir al volver a la pestaña.
  useEffect(() => {
    if (!abierto) return;
    let sentinela: WakeLockSentinel | null = null;
    let cancelado = false;
    const pedir = async () => {
      try {
        const conseguido = (await navigator.wakeLock?.request("screen")) ?? null;
        if (cancelado) await conseguido?.release();
        else sentinela = conseguido;
      } catch {
        // Sin wake lock se cocina igual.
      }
    };
    void pedir();
    const alVolver = () => {
      if (document.visibilityState === "visible") void pedir();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", alVolver);
      void sentinela?.release().catch(() => {});
    };
  }, [abierto]);

  if (pasos.length === 0) return null;

  const paso = pasos[Math.min(actual, pasos.length - 1)];
  const hayAnterior = actual > 0;
  const haySiguiente = actual < pasos.length - 1;

  const claseNavegacion = (activo: boolean) =>
    `rounded-full px-[clamp(20px,3vw,30px)] py-3.5 font-[family-name:var(--font-dm-mono)] text-xs uppercase tracking-[0.14em] ${
      activo ? "bg-tinta text-papel hover:bg-acento" : "cursor-default bg-tinta/10 text-tinta/35"
    }`;

  const claseBotonBarra =
    "whitespace-nowrap rounded-full border px-4 py-2.25 uppercase tracking-[0.14em]";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActual(0);
          setVerIngredientes(false);
          setAbierto(true);
        }}
        className="whitespace-nowrap rounded-full bg-tinta px-4 py-2.75 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.12em] text-papel hover:bg-acento sm:px-5 sm:text-[11px] sm:tracking-[0.14em]"
      >
        Cocinar paso a paso
      </button>

      {/* En portal: el botón vive en la cabecera pegajosa, cuyo backdrop-blur
          crea un contexto de contención que atraparía el `fixed` del overlay
          en la franja de la cabecera en vez de dejarle la pantalla entera. */}
      {abierto &&
        createPortal(
        <div className="fixed inset-0 z-[120] flex flex-col bg-papel normal-case tracking-normal">
          <div className="h-[3px] bg-tinta/10">
            <div
              className="h-[3px] bg-acento transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ width: `${((actual + 1) / pasos.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-tinta/10 px-[clamp(16px,5vw,48px)] py-3.5 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.16em]">
            <span className="min-w-0 truncate text-tinta/55">
              <span className="hidden sm:inline">{titulo} · </span>
              paso {actual + 1} de {pasos.length}
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setVerIngredientes((viendo) => !viendo)}
                className={`${claseBotonBarra} ${
                  verIngredientes
                    ? "border-acento text-acento"
                    : "border-tinta/30 hover:border-tinta"
                }`}
              >
                Ingredientes
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className={`${claseBotonBarra} border-tinta/30 hover:border-tinta`}
              >
                Salir
              </button>
            </div>
          </div>

          {verIngredientes ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-[clamp(16px,5vw,48px)] py-[clamp(20px,4vh,48px)]">
              <div className="mx-auto w-full max-w-[560px]">
                <div className="mb-4 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.24em] text-acento">
                  Ingredientes · {raciones} raciones
                </div>
                <ul className="flex flex-col">
                  {ingredientes.map((ingrediente) => (
                    <li
                      key={ingrediente.id}
                      className="border-t border-tinta/10 py-3 text-[clamp(16px,1.8vw,20px)] leading-[1.4]"
                    >
                      {medidaDe(ingrediente) && (
                        <>
                          <span className="font-semibold [font-variant-numeric:tabular-nums]">
                            {medidaDe(ingrediente)}
                          </span>{" "}
                        </>
                      )}
                      {ingrediente.nombre}
                      {ingrediente.nota && (
                        <span className="text-tinta/45"> — {ingrediente.nota}</span>
                      )}
                      {!ingrediente.nota && ingrediente.cantidad === 0 && (
                        <span className="text-tinta/45"> — al gusto</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div
              className="flex min-h-0 flex-1 overflow-y-auto px-[clamp(16px,5vw,48px)] py-[clamp(16px,4vh,56px)]"
              onTouchStart={(evento) => {
                const punto = evento.touches[0];
                toque.current = { x: punto.clientX, y: punto.clientY };
              }}
              onTouchEnd={(evento) => {
                if (!toque.current) return;
                const punto = evento.changedTouches[0];
                const dx = punto.clientX - toque.current.x;
                const dy = punto.clientY - toque.current.y;
                toque.current = null;
                // Solo el gesto claramente horizontal pasa página; el vertical
                // es el scroll del propio paso.
                if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
                if (dx < 0) setActual((valor) => Math.min(pasos.length - 1, valor + 1));
                else setActual((valor) => Math.max(0, valor - 1));
              }}
            >
              {/* `my-auto` centra el paso corto y deja hacer scroll al largo
                  (justify-center recortaría el principio al desbordar). */}
              <div className="mx-auto my-auto flex w-full max-w-[1100px] flex-col gap-[clamp(18px,3vh,32px)] lg:flex-row-reverse lg:items-center lg:gap-[clamp(28px,4vw,56px)]">
                {paso.fotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={paso.id}
                    src={paso.fotoUrl}
                    alt={paso.fotoAlt}
                    className="max-h-[32svh] w-full shrink-0 rounded-[4px] object-cover lg:max-h-[58svh] lg:w-[42%] lg:self-center"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-[clamp(10px,2vh,20px)] flex items-baseline gap-4">
                    <span className="font-[family-name:var(--font-bricolage)] text-[clamp(40px,6vw,88px)] font-extrabold leading-none tracking-[-0.05em] text-tinta/15">
                      {String(actual + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 font-[family-name:var(--font-dm-mono)] text-[clamp(10px,1vw,12px)] uppercase tracking-[0.24em] text-acento">
                      {paso.titulo ?? `Paso ${actual + 1}`}
                    </span>
                  </div>
                  <p className="max-w-[34ch] text-[clamp(20px,2.4vw,38px)] leading-[1.35] tracking-[-0.02em] [text-wrap:pretty]">
                    {paso.texto}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-tinta/10 px-[clamp(16px,5vw,48px)] pb-[max(clamp(14px,3vh,28px),env(safe-area-inset-bottom))] pt-[clamp(12px,2.5vh,22px)]">
            <div className="hidden font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.16em] text-tinta/50 sm:block">
              {raciones} raciones · {duracion(minutos)}
            </div>
            <div className="flex flex-1 justify-between gap-2.5 sm:flex-none sm:justify-end">
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
        </div>,
        document.body,
      )}
    </>
  );
}
