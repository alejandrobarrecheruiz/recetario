"use client";
import Link from "next/link";

export default function ErrorPagina({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-5 px-8">
      <h1 className="font-display text-3xl">Algo se ha quedado a medio hacer.</h1>
      <p>No hemos podido cargar esta página. Puedes volver a intentarlo.</p>
      <button onClick={retry} className="rounded-full bg-tinta px-6 py-3 text-papel">Volver a intentar</button>
      <Link href="/">Ir a la portada</Link>
    </main>
  );
}
