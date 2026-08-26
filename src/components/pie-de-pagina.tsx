/**
 * El pie de las páginas públicas. Deliberadamente mínimo: el nombre de la
 * casa y el lema. Sin redes, sin newsletter, sin columnas de enlaces — regla
 * de la sección 1 de CLAUDE.md.
 */
export function PieDePagina() {
  return (
    <footer className="border-t border-tinta/15 px-[clamp(20px,5vw,48px)] py-9">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-baseline justify-between gap-x-8 gap-y-2.5">
        <span className="font-[family-name:var(--font-pinyon)] text-[23px] leading-none">
          Mi libro de recetas
        </span>
        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.22em] text-tinta/50">
          Una receta a la semana · desde 2026
        </span>
      </div>
    </footer>
  );
}
