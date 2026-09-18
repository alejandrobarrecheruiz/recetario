import type { Dificultad } from "@/models/receta";
import { duracion } from "@/lib/formato";

const niveles: Record<Dificultad, { numero: number; nombre: string }> = {
  facil: { numero: 1, nombre: "Fácil" },
  media: { numero: 2, nombre: "Media" },
  dificil: { numero: 3, nombre: "Difícil" },
};

/** Datos legibles y compactos; los iconos refuerzan, no sustituyen el significado. */
export function IconoRaciones() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="7.5" r="3" /><path d="M3.5 20v-2.5a5.5 5.5 0 0 1 11 0V20M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 2.5 4.5V20" /></svg>;
}

export function DatosReceta({ minutos, raciones, dificultad, variante = "compacta" }: {
  minutos: number;
  raciones: number;
  dificultad: Dificultad;
  variante?: "compacta" | "ficha";
}) {
  const nivel = niveles[dificultad];
  return (
    <ul className={`datos-receta${variante === "ficha" ? " datos-receta-ficha" : ""}`} aria-label="Datos de la receta">
      {minutos > 0 && <li>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>
        <span><span className="sr-only">Tiempo total: </span>{duracion(minutos)}</span>
      </li>}
      <li>
        <IconoRaciones />
        <span>{raciones}<span className="sr-only"> {raciones === 1 ? "ración" : "raciones"}</span></span>
      </li>
      <li>
        <svg width="20" height="19" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" aria-hidden="true">
          {[1, 2, 3].map((valor) => <rect key={valor} x={2 + (valor - 1) * 8} y={19 - valor * 4} width="4" height={valor * 4} rx=".5" className={valor <= nivel.numero ? "fill-acento stroke-acento" : "stroke-tinta/35"} />)}
        </svg>
        <span><span className="sr-only">Dificultad: </span>{nivel.nombre}</span>
      </li>
    </ul>
  );
}
