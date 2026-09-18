/** Pruebas del prototipo sin navegador ni dependencias nuevas.
 * El DOM mínimo comprueba la lógica, no el renderizado ni la accesibilidad real.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';

const carpeta = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(carpeta, 'portada.html'), 'utf8');
const script = readFileSync(resolve(carpeta, 'portada.js'), 'utf8');

class Elemento {
  constructor(id, hidden = false) {
    this.id = id;
    this.hidden = hidden;
    this.value = '';
    this.textContent = '';
    this.dataset = {};
    this.atributos = {};
    this.eventos = new Map();
  }
  addEventListener(tipo, funcion) { this.eventos.set(tipo, funcion); }
  setAttribute(nombre, valor) { this.atributos[nombre] = valor; }
  querySelector(selector) { return selector === 'span' ? this.etiqueta : null; }
  closest() { return this.padre?.hidden ? this.padre : null; }
  focus() { this.enfocado = true; }
  scrollIntoView() { this.desplazado = true; }
  activar(tipo = 'click') { this.eventos.get(tipo)?.({ preventDefault() {} }); }
}

function iniciar() {
  const nodos = new Map();
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    nodos.set(match[1], new Elemento(match[1], /\shidden[\s>]/.test(match[0])));
  }
  const botones = [...html.matchAll(/<button\b[^>]*data-guardar="([^"]+)"[^>]*>/g)].map((match, indice) => {
    const nodo = new Elemento(`guardar-${indice}`, true);
    nodo.dataset.guardar = match[1];
    nodo.padre = indice === 0 ? nodos.get('destacada') : nodos.get(`fila-${match[1]}`);
    return nodo;
  });
  const enlace = new Elemento('enlace-recetas');
  let temporizador;
  runInNewContext(script, {
    document: {
      getElementById: id => { assert.ok(nodos.has(id), `Existe #${id}`); return nodos.get(id); },
      querySelectorAll: selector => { assert.equal(selector, '[data-guardar]'); return botones; },
      querySelector: selector => { assert.equal(selector, '.masthead nav a'); return enlace; },
    },
    setTimeout: fn => { temporizador = fn; return 1; },
    clearTimeout: () => { temporizador = undefined; },
  });
  return {
    porId: id => nodos.get(id), botones, enlace,
    buscar(texto) { nodos.get('buscar').value = texto; nodos.get('buscar').activar('input'); },
    cerrarAviso() { temporizador?.(); },
  };
}

test('HTML: identificadores únicos y referencias locales existentes', () => {
  for (const nombre of ['portada.html', 'presentacion.html']) {
    const contenido = readFileSync(resolve(carpeta, nombre), 'utf8');
    const ids = [...contenido.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, nombre);
    for (const match of contenido.matchAll(/\b(?:src|srcset|href)="([^"]+)"/g)) {
      const destino = match[1];
      if (destino.startsWith('#')) assert.ok(ids.includes(destino.slice(1)), destino);
      else if (!/^[a-z]+:/i.test(destino)) assert.ok(existsSync(resolve(carpeta, destino)), destino);
    }
  }
});

test('CSS: sintaxis y fuentes locales existentes', () => {
  const require = createRequire(import.meta.url);
  const postcss = require('postcss');
  const css = readFileSync(resolve(carpeta, 'portada.css'), 'utf8');
  const arbol = postcss.parse(css);
  let fuentes = 0;
  arbol.walkAtRules('font-face', () => { fuentes++; });
  assert.equal(fuentes, 3);
  for (const match of css.matchAll(/url\(([^)]+)\)/g)) assert.ok(existsSync(resolve(carpeta, match[1])));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(css.includes(':focus-visible'));
});

test('Inicio: la destacada no se duplica en el archivo', () => {
  const { porId, botones } = iniciar();
  assert.equal(porId('fila-katsu').hidden, true);
  assert.equal(porId('destacada').hidden, false);
  assert.equal(porId('fila-guacamole').hidden, false);
  assert.equal(porId('vacio').hidden, true);
  assert.equal(porId('buscador').hidden, false);
  assert.ok(botones.every(boton => !boton.hidden));
});

test('Búsqueda por ingrediente, acentos, mayúsculas y varios términos', () => {
  const { porId, buscar } = iniciar();
  buscar('  LIMÓN ');
  assert.equal(porId('destacada').hidden, true);
  assert.equal(porId('fila-guacamole').hidden, false);
  assert.equal(porId('fila-katsu').hidden, true);
  buscar('proteína arroz');
  assert.equal(porId('fila-katsu').hidden, false);
  assert.equal(porId('fila-guacamole').hidden, true);
  buscar('cebolla');
  assert.equal(porId('resultado').textContent, '2 recetas');
});

test('Búsqueda vacía, sin resultados y recuperación', () => {
  const { porId, buscar } = iniciar();
  buscar('chocolate');
  assert.equal(porId('vacio').hidden, false);
  assert.equal(porId('resultado').textContent, '0 recetas');
  porId('reiniciar').activar();
  assert.equal(porId('vacio').hidden, true);
  assert.equal(porId('buscar').value, '');
  assert.equal(porId('destacada').hidden, false);
  assert.equal(porId('buscar').enfocado, true);
  buscar('   ');
  assert.equal(porId('estado-filtros').hidden, true);
  porId('limpiar').activar();
  assert.equal(porId('limpiar').hidden, true);
});

test('Guardar sincroniza controles repetidos y comunica el alcance de maqueta', () => {
  const { porId, botones, cerrarAviso } = iniciar();
  botones[0].activar();
  assert.equal(botones[0].atributos['aria-pressed'], 'true');
  assert.equal(botones[0].atributos.title, botones[0].atributos['aria-label']);
  assert.equal(botones[1].atributos['aria-pressed'], 'true');
  assert.equal(porId('total-guardadas').textContent, '1');
  assert.match(porId('aviso').textContent, /Tu cuenta no cambia/);
  cerrarAviso();
  assert.equal(porId('aviso').textContent, '');
  botones[1].activar();
  assert.equal(botones[0].atributos['aria-pressed'], 'false');
  assert.equal(porId('total-guardadas').hidden, true);
});

test('Guardadas: estado vacío, combinación con búsqueda y foco al quitar', () => {
  const { porId, botones, buscar } = iniciar();
  porId('ver-guardadas').activar();
  assert.equal(porId('titulo-archivo').textContent, 'Tus guardadas');
  assert.match(porId('titulo-vacio').textContent, /no has guardado/);
  botones[0].activar();
  assert.equal(porId('fila-katsu').hidden, false);
  assert.equal(porId('fila-guacamole').hidden, true);
  buscar('aguacate');
  assert.equal(porId('vacio').hidden, false);
  porId('limpiar').activar();
  assert.equal(porId('fila-katsu').hidden, false);
  porId('buscar').enfocado = false;
  botones[1].activar();
  assert.equal(porId('buscar').enfocado, true);
  assert.equal(porId('vacio').hidden, false);
  porId('ver-todas').activar();
  assert.equal(porId('titulo-archivo').textContent, 'Recetas');
});

test('Recetas restablece el archivo; abrir otra instancia no conserva guardadas', () => {
  const primera = iniciar();
  primera.botones[2].activar();
  primera.porId('ver-guardadas').activar();
  primera.enlace.activar();
  assert.equal(primera.porId('ver-guardadas').atributos['aria-pressed'], 'false');
  assert.equal(primera.porId('fila-guacamole').hidden, false);
  const segunda = iniciar();
  assert.equal(segunda.porId('total-guardadas').hidden, true);
});

test('El script no conecta cuentas, red ni persistencia', () => {
  assert.doesNotMatch(script, /\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b|document\.cookie/);
});

test('La navegación restablece las recetas después de una búsqueda', () => {
  const { porId, buscar, enlace } = iniciar();
  buscar('limón');
  enlace.activar();
  assert.equal(porId('buscar').value, '');
  assert.equal(porId('destacada').hidden, false);
  assert.equal(porId('fila-katsu').hidden, true);
});

test('Propuesta 03: cubierta adaptable, título único y sin rótulos redundantes', () => {
  assert.equal([...html.slice(0,html.indexOf('<dialog')).matchAll(/<h1\b/g)].length, 1);
  assert.match(html, /<h1 id="titulo-cuaderno">/);
  assert.match(html, /<source media="\(max-width:700px\)" srcset="\.\.\/\.\.\/public\/Portada-V.jpg">/);
  assert.doesNotMatch(html, /Empecé esto|persona concreta|class="personal"/);
  assert.doesNotMatch(html, /abrir-cuaderno|cover-jump|>El cuaderno<|>Ver receta</);
  assert.match(html, /<h2 class="sr-only" id="titulo-archivo">Recetas<\/h2>/);
  assert.ok(html.indexOf('id="cubierta"') < html.indexOf('id="archivo"'));
});

test('La foto enmarcada y el marcador son interacciones separadas', () => {
  const pila = [];
  const vacios = new Set(['meta', 'link', 'img', 'input', 'source', 'br', 'hr', 'use', 'path', 'circle']);
  for (const match of html.matchAll(/<(\/?)([a-z][\w-]*)\b[^>]*>/gi)) {
    const [, cierre, etiqueta] = match;
    if (vacios.has(etiqueta)) continue;
    if (cierre) assert.equal(pila.pop(), etiqueta, `Cierre correcto de ${etiqueta}`);
    else {
      if (etiqueta === 'button') assert.ok(!pila.includes('a'), 'El marcador no está dentro del enlace');
      if (etiqueta === 'a') assert.ok(!pila.includes('a'), 'Sin enlaces anidados');
      pila.push(etiqueta);
    }
  }
  assert.equal(pila.length, 0);
  const css = readFileSync(resolve(carpeta, 'portada.css'), 'utf8');
  assert.match(css, /\.feature-photo\{[^}]*padding:8px;[^}]*border:1px solid var\(--raya\)/);
  assert.match(css, /\.photo-save\{[^}]*width:44px;height:44px/);
  assert.doesNotMatch(css, /(?:^|[;{\s])filter\s*:/);
});

const movimiento = readFileSync(resolve(carpeta, 'movimiento-portada.js'), 'utf8');

function iniciarMovimiento(reducido = false) {
  const eventos = new Map();
  const cuadros = new Map();
  const cambios = new Map();
  let siguiente = 0;
  let posicion = { top: 72, height: 800 };
  let ancho = 600;
  const imagen = { style: {} };
  const banda = { style: {}, firstElementChild: { getBoundingClientRect: () => ({ width: ancho }) } };
  const preferencia = { matches: reducido, addEventListener: (nombre, fn) => cambios.set(nombre, fn) };
  const ventana = {
    scrollY: 0,
    matchMedia: consulta => { assert.equal(consulta, '(prefers-reduced-motion: reduce)'); return preferencia; },
    addEventListener: (tipo, fn, opciones) => { eventos.set(tipo, { fn, opciones }); },
    removeEventListener: tipo => { eventos.delete(tipo); },
    requestAnimationFrame: fn => { cuadros.set(++siguiente, fn); return siguiente; },
    cancelAnimationFrame: id => { cuadros.delete(id); },
  };
  runInNewContext(movimiento, {
    window: ventana,
    document: { getElementById: id => ({
      cubierta: { getBoundingClientRect: () => posicion },
      'imagen-cubierta': imagen,
      'banda-scroll': banda,
    })[id] },
  });
  return {
    imagen, banda, eventos, cuadros,
    dibujar() { for (const [id, fn] of [...cuadros]) { cuadros.delete(id); fn(); } },
    desplazar(y) { ventana.scrollY = y; posicion = { top: 72 - y, height: 800 }; eventos.get('scroll')?.fn(); },
    reducir(valor) { preferencia.matches = valor; cambios.get('change')(); },
    redimensionar(valor) { ancho = valor; eventos.get('resize')?.fn(); },
  };
}

test('Movimiento: scroll pasivo, un frame por actualización y parallax acotado', () => {
  const vista = iniciarMovimiento();
  assert.equal(vista.eventos.get('scroll').opciones.passive, true);
  vista.desplazar(100);
  vista.desplazar(600);
  assert.equal(vista.cuadros.size, 1);
  vista.dibujar();
  assert.equal(vista.imagen.style.transform, 'translateY(52.800000000000004px)');
  assert.equal(vista.banda.style.transform, 'translateX(-108px)');
  assert.equal(vista.cuadros.size, 0);
  vista.desplazar(9000);
  vista.dibujar();
  assert.equal(vista.imagen.style.transform, 'translateY(64px)');
  assert.equal(vista.banda.style.transform, 'translateX(-420px)');
});

test('Movimiento reducido inicial: no se animan ni cubierta ni banda', () => {
  const vista = iniciarMovimiento(true);
  assert.equal(vista.eventos.has('scroll'), false);
  assert.equal(vista.cuadros.size, 0);
  assert.equal(vista.imagen.style.transform, '');
  assert.equal(vista.banda.style.transform, '');
});

test('Cambiar preferencia cancela el frame pendiente y permite reactivar', () => {
  const vista = iniciarMovimiento();
  vista.reducir(true);
  assert.equal(vista.cuadros.size, 0);
  assert.equal(vista.eventos.size, 0);
  vista.reducir(false);
  assert.equal(vista.cuadros.size, 1);
  vista.dibujar();
  assert.equal(vista.imagen.style.transform, 'translateY(0px)');
});

test('Banda: el bucle se recalcula al cambiar anchura sin divisiones por cero', () => {
  const vista = iniciarMovimiento();
  vista.desplazar(4000);
  vista.redimensionar(500);
  vista.dibujar();
  assert.equal(vista.banda.style.transform, 'translateX(-220px)');
  vista.redimensionar(0);
  vista.dibujar();
  assert.equal(vista.banda.style.transform, 'translateX(0px)');
  assert.doesNotMatch(movimiento, /\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|setInterval)\b|document\.cookie/);
});
