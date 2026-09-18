"use client";

export default function ErrorGlobal({ retry }: { retry: () => void }) {
  return (
    <html lang="es"><body>
      <main><h1>No hemos podido abrir el cuaderno.</h1>
        <p>Vuelve a intentarlo en un momento.</p>
        <button onClick={retry}>Volver a intentar</button>
        {/* Recarga completa: este error sustituye incluso al layout raíz. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <p><a href="/">Ir a la portada</a></p>
      </main>
    </body></html>
  );
}
