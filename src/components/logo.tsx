import Link from "next/link";
import Image from "next/image";

/**
 * El logo de la casa (el gato y la mariquita cocineros), recortado en círculo
 * para que el papel del PNG no se note sobre la barra. Pulsarlo lleva SIEMPRE
 * a la portada, también desde el panel: es la salida universal.
 */
export function Logo({ tamano = 64 }: { tamano?: number }) {
  return (
    <Link href="/" className="shrink-0" aria-label="Volver a la portada">
      <Image
        src="/Logo.png"
        alt="Mi libro de recetas"
        width={tamano}
        height={tamano}
        style={{ width: tamano, height: tamano }}
        className="rounded-full object-cover"
      />
    </Link>
  );
}
