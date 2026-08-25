import Link from "next/link";

// El 404 del sistema. El texto es deliberadamente ambiguo porque este mismo
// 404 es lo que ve un visitante ante una receta que no puede ver: nada de
// candados ni de "inicia sesión para verla", que confirmarían que existe.
export default function NoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-8 py-20 text-center">
      <p className="font-[family-name:var(--font-bricolage)] text-[120px] font-extrabold leading-none tracking-[-0.045em] text-acento">
        404
      </p>
      <h1 className="max-w-90 font-[family-name:var(--font-bricolage)] text-[30px] font-semibold leading-tight tracking-[-0.035em]">
        Esta página se nos ha quemado.
      </h1>
      <p className="max-w-70 text-base leading-relaxed text-tinta/65">
        O nunca existió, o ya no está. En la cocina pasa.
      </p>
      <Link
        href="/"
        className="mt-3 rounded-full bg-tinta px-7 py-4 font-[family-name:var(--font-dm-mono)] text-xs uppercase tracking-[0.14em] text-papel hover:bg-acento hover:text-papel"
      >
        Volver a la portada
      </Link>
      <Link
        href="/#recetas"
        className="font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.16em] text-tinta/60"
      >
        o mira las recetas
      </Link>
    </main>
  );
}
