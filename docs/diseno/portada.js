/* Demostración local: sin peticiones, cookies, cuentas ni almacenamiento. */
(() => {
  'use strict';
  const porId = id => document.getElementById(id);
  const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const recetas = [
    { id: 'katsu', titulo: 'katsu curry', busqueda: 'katsu curry de proteina vegetal arroz tofu cebolla zanahoria patata ajo mantequilla harina caldo garam masala jengibre maicena soja panko aceite sal' },
    { id: 'guacamole', titulo: 'guacamole casero', busqueda: 'guacamole casero aguacate tomate cebolla roja limon sal aceite de oliva' },
  ];
  const guardadas = new Set();
  let soloGuardadas = false;
  let avisoPendiente;
  const entrada = porId('buscar');

  function renderizar() {
    const palabras = normalizar(entrada.value).split(/\s+/).filter(Boolean);
    const filtrando = palabras.length > 0 || soloGuardadas;
    porId('destacada').hidden = filtrando;
    let cantidad = 0;
    recetas.forEach(receta => {
      const coincide = palabras.every(palabra => receta.busqueda.includes(palabra));
      const visible = coincide && (!soloGuardadas || guardadas.has(receta.id)) && (filtrando || receta.id !== 'katsu');
      porId(`fila-${receta.id}`).hidden = !visible;
      if (visible) cantidad++;
    });
    porId('titulo-archivo').textContent = soloGuardadas ? 'Tus guardadas' : 'Recetas';
    porId('ver-guardadas').setAttribute('aria-pressed', String(soloGuardadas));
    porId('estado-filtros').hidden = !filtrando;
    porId('resultado').textContent = `${cantidad} ${cantidad === 1 ? 'receta' : 'recetas'}${soloGuardadas ? ' guardada' + (cantidad === 1 ? '' : 's') + ' en esta maqueta' : ''}`;
    porId('limpiar').hidden = entrada.value.length === 0;
    porId('vacio').hidden = cantidad !== 0;
    porId('titulo-vacio').textContent = soloGuardadas && guardadas.size === 0 ? 'Todavía no has guardado recetas.' : 'No encuentro esa receta.';
    porId('texto-vacio').textContent = soloGuardadas && guardadas.size === 0 ? 'Toca el marcador de un plato para tenerlo a mano. En esta maqueta, se conserva solo mientras está abierta.' : 'Prueba con «tofu», «arroz» o «aguacate».';
    porId('total-guardadas').textContent = String(guardadas.size);
    porId('total-guardadas').hidden = guardadas.size === 0;
    document.querySelectorAll('[data-guardar]').forEach(boton => {
      const receta = recetas.find(item => item.id === boton.dataset.guardar);
      const guardada = guardadas.has(receta.id);
      boton.setAttribute('aria-pressed', String(guardada));
      boton.setAttribute('aria-label', `${guardada ? 'Quitar' : 'Guardar'} ${receta.titulo} ${guardada ? 'de' : 'en'} esta maqueta`);
      boton.setAttribute('title', `${guardada ? 'Quitar' : 'Guardar'} ${receta.titulo} ${guardada ? 'de' : 'en'} esta maqueta`);
      const etiqueta = boton.querySelector('span');
      if (etiqueta) etiqueta.textContent = guardada ? 'Guardada' : 'Guardar';
    });
  }

  function limpiarTodo() {
    soloGuardadas = false;
    entrada.value = '';
    renderizar();
    entrada.focus({ preventScroll: true });
  }

  document.querySelectorAll('[data-guardar]').forEach(boton => {
    boton.hidden = false;
    boton.addEventListener('click', () => {
      const id = boton.dataset.guardar;
      if (guardadas.has(id)) guardadas.delete(id);
      else guardadas.add(id);
      renderizar();
      // Quitar la última guardada puede ocultar el propio botón: conservar foco útil.
      if (boton.closest('[hidden]')) entrada.focus({ preventScroll: true });
      clearTimeout(avisoPendiente);
      porId('aviso').textContent = guardadas.has(id) ? 'Guardada solo en esta maqueta. Tu cuenta no cambia.' : 'Quitada de las guardadas de esta maqueta.';
      avisoPendiente = setTimeout(() => { porId('aviso').textContent = ''; }, 5000);
    });
  });
  porId('buscador').hidden = false;
  porId('ver-guardadas').hidden = false;
  porId('buscador').addEventListener('submit', evento => { evento.preventDefault(); renderizar(); });
  entrada.addEventListener('input', renderizar);
  porId('limpiar').addEventListener('click', () => { entrada.value = ''; renderizar(); entrada.focus(); });
  porId('ver-todas').addEventListener('click', limpiarTodo);
  porId('reiniciar').addEventListener('click', limpiarTodo);
  porId('ver-guardadas').addEventListener('click', () => {
    soloGuardadas = !soloGuardadas;
    entrada.value = '';
    renderizar();
    porId('archivo').scrollIntoView({ block: 'start' });
    entrada.focus({ preventScroll: true });
  });
  function mostrarRecetas() {
    soloGuardadas = false;
    entrada.value = '';
    renderizar();
  }
  document.querySelector('.masthead nav a').addEventListener('click', mostrarRecetas);
  // Las fichas del prototipo comparten estas guardadas, sin persistencia ni API.
  globalThis.portadaDemo = { guardadas, refrescar: renderizar };
  renderizar();
})();
