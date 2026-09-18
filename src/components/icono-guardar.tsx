/** Marcador compartido por las fotos, la ficha y la lista de guardadas. */
export function IconoGuardar({ marcado = false }: { marcado?: boolean }) {
  return (
    <svg width="20" height="22" viewBox="0 0 24 24" fill={marcado ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 20V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16l-6-4-6 4Z" />
    </svg>
  );
}
