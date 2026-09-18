/* Solo respuesta al scroll: sin bucles automáticos ni scroll secuestrado. */
(() => {
  'use strict';
  const cubierta = document.getElementById('cubierta');
  const imagen = document.getElementById('imagen-cubierta');
  const banda = document.getElementById('banda-scroll');
  const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pendiente = null;

  function dibujar() {
    pendiente = null;
    const rect = cubierta.getBoundingClientRect();
    const recorrido = Math.max(0, Math.min(-rect.top, rect.height));
    // El recorte tiene margen; el tope impide descubrir el fondo de la cubierta.
    imagen.style.transform = `translateY(${Math.min(recorrido * .1, 64)}px)`;
    // Repetir por el ancho real de una frase evita saltos al cerrar el bucle.
    const ancho = banda.firstElementChild.getBoundingClientRect().width;
    const desplazamiento = ancho > 0 ? (Math.max(0, window.scrollY) * .18) % ancho : 0;
    banda.style.transform = `translateX(${-desplazamiento}px)`;
  }

  function programar() {
    if (pendiente === null && !preferencia.matches) pendiente = window.requestAnimationFrame(dibujar);
  }

  function configurar() {
    window.removeEventListener('scroll', programar);
    window.removeEventListener('resize', programar);
    if (pendiente !== null) window.cancelAnimationFrame(pendiente);
    pendiente = null;
    if (preferencia.matches) {
      imagen.style.transform = '';
      banda.style.transform = '';
      return;
    }
    window.addEventListener('scroll', programar, { passive: true });
    window.addEventListener('resize', programar);
    programar();
  }

  preferencia.addEventListener('change', configurar);
  configurar();
})();
