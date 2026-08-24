import Link from "next/link";

// El 404 del sistema (fase 7). El texto es deliberadamente ambiguo porque este
// mismo 404 es lo que ve un visitante ante una receta que no puede ver: nada
// de candados ni de "inicia sesión para verla", que confirmarían que existe.
export default function NoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-8 py-20 text-center">
      <p className="font-[family-name:var(--font-newsreader)] text-[120px] font-medium leading-none text-celeste-numero">
        404
      </p>
      <h1 className="max-w-75 font-[family-name:var(--font-newsreader)] text-[27px] font-medium leading-snug">
        Esta página se nos ha quemado.
      </h1>
      <p className="max-w-70 text-base leading-relaxed text-apagado">
        O nunca existió, o ya no está. En la cocina pasa.
      </p>
      <Link
        href="/"
        className="mt-3 rounded-full bg-tinta px-8 py-3.5 text-base font-semibold text-papel"
      >
        Volver a la portada
      </Link>
      <Link href="/#buscar" className="flex items-center gap-2 text-[15px] text-enlace">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        o busca una receta
      </Link>
    </main>
  );
}
