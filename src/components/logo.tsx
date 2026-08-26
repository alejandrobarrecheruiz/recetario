import Link from "next/link";

/**
 * El logo de la casa (el gato y la mariquita cocineros), recortado en círculo
 * para que el papel del PNG no se note sobre la barra. Pulsarlo lleva SIEMPRE
 * a la portada, también desde el panel: es la salida universal.
 */
export function Logo({ tamano = 64 }: { tamano?: number }) {
  return (
    <Link href="/" className="shrink-0" aria-label="Volver a la portada">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Logo.png"
        alt="Mi libro de recetas"
        style={{ width: tamano, height: tamano }}
        className="rounded-full object-cover"
      />
    </Link>
  );
}
