import type { Metadata } from "next";
import Link from "next/link";
import { CabeceraPublica } from "@/components/cabecera-publica";
import { responsableSitio } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribe a Alejandro sobre las recetas, tu cuenta o tus datos personales.",
  alternates: { canonical: "/contacto" },
};

export default function PaginaContacto() {
  return (
    <>
    <CabeceraPublica />
    <main id="contenido" tabIndex={-1} className="flex-1 bg-superficie py-10 sm:py-14">
      <div className="pagina-lectura flex flex-col gap-9">

      <header className="flex flex-col gap-4">
        <h1 className="font-[family-name:var(--font-bricolage)] text-4xl font-extrabold tracking-tight sm:text-5xl">Hablamos</h1>
        <p className="text-lg leading-relaxed text-tinta/75">¿Una duda sobre una receta, algo que no funciona o una idea para el cuaderno? Puedes escribirme.</p>
      </header>

      <section aria-labelledby="titular" className="flex flex-col gap-3 border-y border-tinta/15 py-6">
        <h2 id="titular" className="font-[family-name:var(--font-bricolage)] text-xl font-semibold">Quién está detrás</h2>
        <p>{responsableSitio.nombre}, responsable de este blog personal de cocina.</p>
        <a href={`mailto:${responsableSitio.correo}`} className="flex min-h-11 items-center self-start break-all text-acento underline underline-offset-4">{responsableSitio.correo}</a>
      </section>

      <section aria-labelledby="datos" className="flex flex-col gap-4 text-base leading-relaxed">
        <h2 id="datos" className="font-[family-name:var(--font-bricolage)] text-2xl font-semibold">Tu cuenta y tus datos</h2>
        <p>Puedes usar el mismo correo para preguntar por tus datos o solicitar acceso, corrección, eliminación y, cuando corresponda, portabilidad, limitación u oposición a su tratamiento. No necesitas tener una sesión abierta para escribir.</p>
        <p>Si tienes acceso, desde <Link href="/cuenta" className="underline underline-offset-4">tu cuenta</Link> puedes cambiar tu nombre y contraseña o eliminar tu cuenta de lector.</p>
        <p className="text-tinta/70">Cuenta solo lo necesario para atender tu consulta. No envíes contraseñas, códigos de acceso ni copias de documentos de identidad por iniciativa propia.</p>
      </section>

      <Link href="/" className="flex min-h-11 items-center self-start underline underline-offset-4">Volver a las recetas</Link>
      </div>
    </main>
    </>
  );
}
