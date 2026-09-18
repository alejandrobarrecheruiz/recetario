"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Ingrediente } from "@/models/receta";
import { duracion } from "@/lib/formato";
import { IngredientesEscalables } from "@/components/ingredientes-escalables";
import { usePreparacionReceta } from "@/components/progreso-cocina";

/**
 * «Cocinar paso a paso»: la vista de cocina a pantalla completa. Un paso cada
 * vez en cuerpo gigante, con su foto si la tiene, barra de progreso y los
 * ingredientes a mano en un panel propio. El componente pinta también su botón
 * de apertura, que vive en la introducción de la ficha.
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

export function ModoCocina({
  titulo,
  pasos,
  ingredientes,
  raciones: racionesBase,
  minutos,
}: {
  titulo: string;
  pasos: PasoDeCocina[];
  ingredientes: Ingrediente[];
  raciones: number;
  minutos: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const { estado, actual, enviar } = usePreparacionReceta();
  const { raciones } = estado;
  const [verIngredientes, setVerIngredientes] = useState(false);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const dialogo = useRef<HTMLDivElement>(null);
  const contenidoPaso = useRef<HTMLDivElement>(null);
  const botonIngredientes = useRef<HTMLButtonElement>(null);
  const ingredientesAbiertos = useRef(false);
  useEffect(() => { ingredientesAbiertos.current = verIngredientes; }, [verIngredientes]);
  useEffect(() => {
    // Cada paso empieza arriba, incluso después de leer uno muy largo.
    contenidoPaso.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [actual, abierto, verIngredientes]);

  useEffect(() => {
    if (!abierto || !dialogo.current) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fondo = Array.from(document.body.children).filter((elemento): elemento is HTMLElement => elemento instanceof HTMLElement && elemento !== dialogo.current);
    const estados = fondo.map((elemento) => elemento.inert);
    fondo.forEach((elemento) => { elemento.inert = true; });
    dialogo.current.focus();
    const mantenerFoco = (evento: KeyboardEvent) => {
      if (evento.key !== "Tab" || !dialogo.current) return;
      const controles = Array.from(dialogo.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'));
      const primero = controles[0];
      const ultimo = controles.at(-1);
      if (!primero) { evento.preventDefault(); return; }
      if (evento.shiftKey && (document.activeElement === primero || document.activeElement === dialogo.current)) {
        evento.preventDefault(); ultimo?.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || document.activeElement === dialogo.current)) {
        evento.preventDefault(); primero.focus();
      }
    };
    document.addEventListener("keydown", mantenerFoco);
    return () => {
      document.removeEventListener("keydown", mantenerFoco);
      fondo.forEach((elemento, indice) => { elemento.inert = estados[indice]; });
      if (anterior?.isConnected) anterior.focus();
    };
  }, [abierto]);

  // Con el modo abierto la página de detrás no se desplaza; Escape cierra el
  // panel de ingredientes o, si no está, el modo entero; las flechas pasan página.
  useEffect(() => {
    if (!abierto) return;
    const desbordamiento = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        if (ingredientesAbiertos.current) {
          setVerIngredientes(false);
          botonIngredientes.current?.focus();
        }
        else setAbierto(false);
      }
      if (ingredientesAbiertos.current || (evento.target instanceof HTMLElement && evento.target.matches("input, textarea, select, [contenteditable=true]"))) return;
      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        enviar({ tipo: "mover", cambio: 1 });
      }
      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        enviar({ tipo: "mover", cambio: -1 });
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = desbordamiento;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, enviar]);

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
    `min-h-12 px-[clamp(20px,3vw,30px)] py-3.5 text-sm ${
      activo ? "bg-tinta text-papel hover:bg-acento" : "cursor-default bg-tinta/10 text-tinta/35"
    }`;

  const claseBotonBarra =
    "min-h-11 whitespace-nowrap border px-3 py-2 text-xs sm:text-sm";

  return (
    <div className="entrada-cocina">
      <button
        type="button"
        onClick={() => {
          if (estado.terminada) enviar({ tipo: "reiniciar" });
          enviar({ tipo: "iniciar" });
          setVerIngredientes(false);
          setAbierto(true);
        }}
        className="boton-cocina"
      >
        {estado.terminada ? "Cocinar de nuevo" : estado.iniciada ? `Retomar · paso ${actual + 1}` : "Cocinar paso a paso"}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
      </button>
      {estado.iniciada && !estado.terminada && <button type="button" onClick={() => enviar({ tipo: "reiniciar" })} className="min-h-11 text-sm underline underline-offset-4">Volver al primer paso</button>}
      {estado.terminada && <span role="status" className="text-sm text-tinta/70">Receta terminada</span>}

      {/* Portal sobre body: el modo ocupa toda la pantalla, independiente de
          los contextos de apilamiento y recorte de la ficha. */}
      {abierto &&
        createPortal(
        <div ref={dialogo} role="dialog" aria-modal="true" aria-label={`Cocinar ${titulo}`} tabIndex={-1} className="fixed inset-0 z-[120] flex flex-col bg-superficie normal-case tracking-normal">
          <div className="h-[3px] bg-tinta/10">
            <div
              className="h-[3px] bg-acento transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ width: `${((actual + 1) / pasos.length) * 100}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-tinta/10 bg-papel px-[clamp(16px,5vw,48px)] py-3 text-sm">
            <span role="status" className="min-w-0 text-tinta/70">
              <span className="hidden sm:inline">{titulo} · </span>
              paso {actual + 1} de {pasos.length}
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                ref={botonIngredientes}
                type="button"
                onClick={() => setVerIngredientes((viendo) => !viendo)}
                aria-pressed={verIngredientes}
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
                <IngredientesEscalables ingredientes={ingredientes} racionesBase={racionesBase} />
              </div>
            </div>
          ) : (
            <div
              ref={contenidoPaso}
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
                enviar({ tipo: "mover", cambio: dx < 0 ? 1 : -1 });
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
                    className="marco-foto max-h-[32svh] w-full shrink-0 object-cover lg:max-h-[58svh] lg:w-[42%] lg:self-center"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-[clamp(10px,2vh,20px)] flex items-baseline gap-4">
                    <span className="font-[family-name:var(--font-bricolage)] text-[clamp(40px,6vw,88px)] font-extrabold leading-none tracking-[-0.05em] text-tinta/15">
                      {String(actual + 1).padStart(2, "0")}
                    </span>
                    <h2 className="min-w-0 font-[family-name:var(--font-bricolage)] text-[clamp(24px,3vw,36px)] font-medium tracking-tight">
                      {paso.titulo ?? `Paso ${actual + 1}`}
                    </h2>
                  </div>
                  <p className="max-w-[42ch] whitespace-pre-line text-[clamp(20px,2.2vw,28px)] leading-relaxed tracking-[-0.02em] [text-wrap:pretty]">
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
                onClick={() => enviar({ tipo: "mover", cambio: -1 })}
                disabled={!hayAnterior}
                className={claseNavegacion(hayAnterior)}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  if (haySiguiente) enviar({ tipo: "mover", cambio: 1 });
                  else { enviar({ tipo: "terminar" }); setAbierto(false); }
                }}
                className={claseNavegacion(true)}
              >
                {haySiguiente ? "Siguiente" : "Terminar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
