"use client";

import { useState } from "react";
import type { Ingrediente } from "@/models/receta";
import { formatearCantidad } from "@/lib/formato";

/**
 * La lista de ingredientes con el escalador de raciones, la razon por la que
 * `cantidad`, `unidad` y `nombre` van separados en el modelo: escalar es
 * multiplicar numeros, nunca reescribir cadenas.
 *
 * Es el unico trozo de la ficha que necesita ser componente de cliente. Los
 * datos ya llegaron filtrados del servidor; aqui solo se multiplican.
 */
export function IngredientesEscalables({
  ingredientes,
  racionesBase,
}: {
  ingredientes: Ingrediente[];
  racionesBase: number;
}) {
  const [raciones, setRaciones] = useState(racionesBase);
  const factor = raciones / racionesBase;

  const claseBoton =
    "flex h-11 w-11 items-center justify-center rounded-full border border-celeste-borde bg-celeste-relleno text-xl text-tinta disabled:opacity-40";

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between border-b border-filo pb-3">
        <h2 className="text-xs uppercase tracking-[2px] text-apagado">Ingredientes</h2>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Una ración menos"
            disabled={raciones <= 1}
            onClick={() => setRaciones((valor) => Math.max(1, valor - 1))}
            className={claseBoton}
          >
            &minus;
          </button>
          <span className="min-w-19 text-center text-[15px]">
            {raciones} {raciones === 1 ? "ración" : "raciones"}
          </span>
          <button
            type="button"
            aria-label="Una ración más"
            onClick={() => setRaciones((valor) => valor + 1)}
            className={claseBoton}
          >
            +
          </button>
        </div>
      </div>

      <ul className="flex flex-col text-[17px]">
        {ingredientes.map((ingrediente, indice) => (
          <li
            key={ingrediente.id}
            className={`flex items-baseline justify-between gap-4 py-2.5 ${
              indice < ingredientes.length - 1 ? "border-b border-filo-fino" : ""
            }`}
          >
            <span>
              {ingrediente.nombre}
              {ingrediente.nota && (
                <span className="text-apagado-suave"> — {ingrediente.nota}</span>
              )}
            </span>
            {ingrediente.cantidad === 0 ? (
              <span className="shrink-0 text-apagado-medio">al gusto</span>
            ) : (
              <span className="shrink-0 font-semibold">
                {formatearCantidad(ingrediente.cantidad * factor)} {ingrediente.unidad}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
