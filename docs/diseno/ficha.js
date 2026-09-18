/* Vistas conectadas en el mismo documento: no hay cookies, red ni persistencia. */
(() => {
  'use strict';
  const porId = id => document.getElementById(id);
  const recetas = globalThis.recetasDemo;
  const estado = globalThis.crearEstadoCocina(recetas);
  const ficha = porId('ficha');
  const cocina = porId('cocina');
  const formato = new Intl.NumberFormat('es-ES', { maximumFractionDigits:3 });
  let actual = 'katsu';
  let origen = null;
  let pendiente = null;

  function nodo(tipo, texto, clase) {
    const elemento = document.createElement(tipo);
    if (texto !== undefined) elemento.textContent = texto;
    if (clase) elemento.className = clase;
    return elemento;
  }
  function avisarVista(vista) {
    if (window.parent !== window) window.parent.postMessage({ tipo:'recetario:vista', vista }, '*');
  }
  function textoIngrediente(ingrediente) {
    const cantidad = estado.cantidad(actual, ingrediente);
    return `${cantidad ? formato.format(cantidad) + (ingrediente.unidad ? ' ' + ingrediente.unidad : '') + ' · ' : ''}${ingrediente.nombre}`;
  }
  function actualizarGuardado() {
    const guardada = globalThis.portadaDemo.guardadas.has(actual);
    porId('guardar-ficha').setAttribute('aria-pressed', String(guardada));
    porId('guardar-ficha').setAttribute('aria-label', `${guardada ? 'Quitar' : 'Guardar'} ${recetas[actual].titulo} ${guardada ? 'de' : 'en'} esta maqueta`);
    porId('guardar-ficha').querySelector('span').textContent = guardada ? 'Guardada' : 'Guardar';
  }
  function actualizarCantidades() {
    const datos = recetas[actual];
    const preparacion = estado.para(actual);
    for (const id of ['raciones-ficha','numero-raciones','raciones-cocina']) porId(id).textContent = preparacion.raciones;
    porId('menos-raciones').disabled = preparacion.raciones === 1;
    porId('mas-raciones').disabled = preparacion.raciones === 12;
    porId('contador-ingredientes').textContent = `${preparacion.listos.size} de ${datos.ingredientes.length} listos`;
    porId('desmarcar').disabled = preparacion.listos.size === 0;
    for (const ingrediente of datos.ingredientes) {
      porId(`cantidad-${ingrediente.id}`).textContent = textoIngrediente(ingrediente);
      porId(`check-${ingrediente.id}`).checked = preparacion.listos.has(ingrediente.id);
    }
    for (const id of ['aviso-raciones','aviso-raciones-cocina']) porId(id).hidden = preparacion.raciones === datos.raciones;
    porId('lista-cocina').replaceChildren(...datos.ingredientes.map(ingrediente => {
      const item = nodo('li', textoIngrediente(ingrediente));
      item.dataset.listo = String(preparacion.listos.has(ingrediente.id));
      return item;
    }));
  }
  function actualizarBotonCocinar() {
    const preparacion = estado.para(actual);
    porId('cocinar').textContent = preparacion.terminada ? 'Revisar último paso →' : preparacion.paso > 0 ? `Retomar paso ${preparacion.paso + 1} →` : 'Cocinar paso a paso →';
  }
  function actualizarRetomar() {
    const preparacion = estado.para(actual);
    const hayPreparacion = !preparacion.terminada && (preparacion.paso > 0 || preparacion.listos.size > 0 || preparacion.raciones !== recetas[actual].raciones);
    if (hayPreparacion) pendiente = actual;
    else if (pendiente === actual) pendiente = null;
    porId('retomar-preparacion').hidden = pendiente === null;
    if (pendiente) {
      const retomada = estado.para(pendiente);
      porId('retomar-nombre').textContent = recetas[pendiente].titulo;
      porId('retomar-detalle').textContent = `${retomada.raciones} personas · ${retomada.paso > 0 ? 'paso ' + (retomada.paso+1) + ' de ' + recetas[pendiente].pasos.length : retomada.listos.size + ' ingredientes listos'}`;
    }
  }
  function abrir(id, disparador) {
    if (!Object.hasOwn(recetas, id)) return;
    if (cocina.open) cocina.close();
    actual = id;
    if (disparador) origen = disparador;
    const datos = recetas[id];
    porId('nombre-ficha').textContent = datos.titulo;
    porId('fecha-ficha').textContent = datos.fecha;
    porId('fecha-ficha').setAttribute('datetime', datos.fechaISO);
    porId('datos-ficha').textContent = `${datos.minutos} min · ${datos.raciones} raciones originales · ${datos.pasos.length} pasos`;
    porId('resumen-ficha').textContent = datos.resumen;
    porId('foto-ficha').hidden = !datos.foto;
    if (datos.foto) { porId('imagen-ficha').src = datos.foto; porId('imagen-ficha').alt = datos.alt; }
    porId('lista-ingredientes').replaceChildren(...datos.ingredientes.map(ingrediente => {
      const label = nodo('label', undefined, 'ingredient-item');
      const input = nodo('input'); input.type='checkbox'; input.id=`check-${ingrediente.id}`;
      const bloque = nodo('span');
      const cantidad = nodo('span', undefined, 'ingredient-name'); cantidad.id=`cantidad-${ingrediente.id}`;
      bloque.append(cantidad);
      if (ingrediente.nota) bloque.append(nodo('small', ingrediente.nota));
      input.addEventListener('change', () => { estado.marcar(actual, ingrediente.id, input.checked); actualizarCantidades(); });
      label.append(input, bloque);
      return label;
    }));
    porId('lista-pasos').replaceChildren(...datos.pasos.map(paso => {
      const item = nodo('li'); item.dataset.paso = paso.id;
      item.append(nodo('h3', paso.titulo), nodo('p', paso.texto));
      return item;
    }));
    porId('cierre-ficha').textContent = 'Otra receta del archivo';
    porId('otra-receta').textContent = recetas[id === 'katsu' ? 'guacamole' : 'katsu'].titulo + ' ↗';
    actualizarCantidades(); actualizarGuardado(); actualizarBotonCocinar();
    if (!ficha.open) ficha.showModal();
    ficha.scrollTop = 0;
    avisarVista(id);
  }
  function mostrarPaso(enfocar = false) {
    const datos = recetas[actual];
    const preparacion = estado.para(actual);
    const paso = datos.pasos[preparacion.paso];
    porId('nombre-cocina').textContent = datos.titulo;
    porId('contador-paso').textContent = `Paso ${preparacion.paso + 1} de ${datos.pasos.length}`;
    porId('titulo-paso').textContent = paso.titulo;
    porId('texto-paso').textContent = paso.texto;
    porId('progreso-cocina').max = datos.pasos.length;
    porId('progreso-cocina').value = preparacion.paso + 1;
    porId('paso-anterior').disabled = preparacion.paso === 0;
    porId('paso-siguiente').textContent = preparacion.paso === datos.pasos.length - 1 ? 'Terminar ✓' : 'Siguiente →';
    actualizarBotonCocinar();
    if (enfocar) { document.querySelector('.kitchen-content').scrollTop=0; porId('titulo-paso').focus({ preventScroll:true }); }
  }
  function cocinar() {
    mostrarPaso(); actualizarCantidades();
    if (!cocina.open) cocina.showModal();
    avisarVista('cocina');
  }

  // Se conserva el enlace público como alternativa sin JS o con clic modificado.
  document.querySelectorAll('a[href*="/recetas/"]').forEach(enlace => {
    const id = enlace.href.includes('guacamole-casero') ? 'guacamole' : 'katsu';
    enlace.setAttribute('aria-label', `Abrir ${recetas[id].titulo} en la maqueta`);
    enlace.querySelector('.sr-only')?.replaceChildren(nodo('span', ' (abre la ficha de demostración)'));
    enlace.addEventListener('click', evento => {
      if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
      evento.preventDefault(); abrir(id, enlace);
    });
  });
  porId('cerrar-ficha').addEventListener('click', () => ficha.close());
  porId('inicio-ficha').addEventListener('click', evento => { evento.preventDefault(); ficha.close(); window.scrollTo({ top:0, behavior:'instant' }); });
  ficha.addEventListener('close', () => { globalThis.portadaDemo.refrescar(); actualizarRetomar(); if (origen && !origen.closest('[hidden]')) origen.focus({ preventScroll:true }); else porId('buscar').focus({ preventScroll:true }); avisarVista('portada'); });
  porId('guardar-ficha').addEventListener('click', () => {
    const guardadas = globalThis.portadaDemo.guardadas;
    if (guardadas.has(actual)) guardadas.delete(actual);
    else guardadas.add(actual);
    actualizarGuardado(); globalThis.portadaDemo.refrescar();
  });
  for (const [id,cambio] of [['menos-raciones',-1],['mas-raciones',1]]) porId(id).addEventListener('click', () => { estado.cambiarRaciones(actual,cambio); actualizarCantidades(); });
  porId('desmarcar').addEventListener('click', () => { estado.para(actual).listos.clear(); actualizarCantidades(); });
  porId('saltar-ingredientes').addEventListener('click', evento => { evento.preventDefault(); porId('ingredientes-ficha').scrollIntoView({ block:'start', behavior:'instant' }); });
  porId('otra-receta').addEventListener('click', () => abrir(actual==='katsu'?'guacamole':'katsu'));
  porId('cocinar').addEventListener('click', cocinar);
  porId('salir-cocina').addEventListener('click', () => cocina.close());
  cocina.addEventListener('close', () => { actualizarBotonCocinar(); porId('cocinar').focus({ preventScroll:true }); avisarVista(actual); });
  porId('paso-anterior').addEventListener('click', () => { estado.mover(actual,-1); mostrarPaso(true); });
  porId('paso-siguiente').addEventListener('click', () => {
    if (estado.para(actual).paso === recetas[actual].pasos.length-1) { estado.para(actual).terminada=true; cocina.close(); }
    else { estado.mover(actual,1); mostrarPaso(true); }
  });
  porId('reiniciar-pasos').addEventListener('click', () => { estado.reiniciar(actual); mostrarPaso(true); });
  porId('retomar-receta').addEventListener('click', evento => { if (pendiente) { abrir(pendiente,evento.currentTarget); if (estado.para(actual).paso>0) cocinar(); } });
  window.addEventListener('message', evento => {
    if (evento.source !== window.parent || window.parent === window || evento.data?.tipo !== 'recetario:mostrar') return;
    const vista = evento.data.vista;
    if (vista === 'katsu' || vista === 'guacamole') abrir(vista);
    else if (vista === 'cocina') { if (!ficha.open) abrir(actual); cocinar(); }
    else if (vista === 'portada') { if (cocina.open) cocina.close(); if (ficha.open) ficha.close(); window.scrollTo({ top:0, behavior:'instant' }); }
  });
})();
