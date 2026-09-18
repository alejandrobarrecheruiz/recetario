const seleccion = new URLSearchParams(location.search).get('propuesta');
document.body.dataset.propuesta = ['1', '2', '3', '4'].includes(seleccion) ? seleccion : '4';
// La panorámica precede al título; las demás composiciones conservan el título primero en móvil.
if (seleccion === '3') document.querySelector('.ficha').prepend(document.querySelector('.foto'));
// La nota de la 04 continúa la lectura, no ocupa otra fila del diseño.
if (document.body.dataset.propuesta === '4') {
  document.querySelector('.preparacion').append(document.querySelector('.nota'));
}

let raciones = 6;
function actualizarRaciones(cambio) {
  raciones = Math.min(12, Math.max(1, raciones + cambio));
  document.querySelectorAll('[data-raciones]').forEach(elemento => { elemento.textContent = String(raciones); });
  document.querySelectorAll('[data-cantidad]').forEach(elemento => {
    const valor = Number(elemento.dataset.cantidad) * raciones / 6;
    const unidad = elemento.dataset.unidad;
    const redondeo = Math.ceil(valor / (unidad ? .5 : .25) - 1e-9) * (unidad ? .5 : .25);
    const entero = Math.floor(redondeo);
    elemento.textContent = unidad
      ? redondeo.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' ' + unidad
      : (entero || '') + ['', '¼', '½', '¾'][Math.round((redondeo - entero) * 4)];
  });
  document.querySelector('#menos').disabled = raciones === 1;
  document.querySelector('#mas').disabled = raciones === 12;
}
document.querySelector('#menos').addEventListener('click', () => actualizarRaciones(-1));
document.querySelector('#mas').addEventListener('click', () => actualizarRaciones(1));
let avisoPendiente;
function avisar(texto) {
  const aviso = document.querySelector('.aviso');
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(avisoPendiente);
  avisoPendiente = setTimeout(() => { aviso.hidden = true; }, 3000);
}
document.querySelectorAll('[data-demo]').forEach(boton => boton.addEventListener('click', () => avisar(boton.dataset.demo)));
document.querySelector('.guardar').addEventListener('click', evento => {
  const boton = evento.currentTarget;
  const guardada = boton.getAttribute('aria-pressed') !== 'true';
  boton.setAttribute('aria-pressed', String(guardada));
  boton.setAttribute('aria-label', guardada ? 'Quitar de guardadas en esta maqueta' : 'Guardar receta en esta maqueta');
  avisar(guardada ? 'Guardada solo en esta maqueta.' : 'Quitada de la maqueta.');
});
const dialogo = document.querySelector('#cocina');
const pasos = [...document.querySelectorAll('.pasos li')];
let paso = 0;
function mostrarPaso() {
  document.querySelector('#contador-paso').textContent = String(paso + 1).padStart(2, '0') + ' / 04';
  document.querySelector('#nombre-paso').textContent = pasos[paso].querySelector('h3').textContent;
  document.querySelector('#texto-paso').textContent = pasos[paso].querySelector('p').textContent;
  document.querySelector('#paso-anterior').disabled = paso === 0;
  document.querySelector('#paso-siguiente').textContent = paso === pasos.length - 1 ? 'Terminar' : 'Siguiente';
}
document.querySelector('#abrir-cocina').addEventListener('click', () => { mostrarPaso(); dialogo.showModal(); });
document.querySelector('#cerrar-cocina').addEventListener('click', () => dialogo.close());
document.querySelector('#paso-anterior').addEventListener('click', () => { paso = Math.max(0, paso - 1); mostrarPaso(); });
document.querySelector('#paso-siguiente').addEventListener('click', () => {
  if (paso === pasos.length - 1) { dialogo.close(); paso = 0; }
  else { paso++; mostrarPaso(); }
});
