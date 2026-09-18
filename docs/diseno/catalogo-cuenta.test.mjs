import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { Script } from 'node:vm';

const leer = nombre => readFileSync(new URL(nombre, import.meta.url), 'utf8');
const comparador = leer('catalogo-cuenta.html');
const vista = leer('catalogo-cuenta-vista.html');
const css = leer('catalogo-cuenta.css');
const js = leer('catalogo-cuenta.js');

test('ofrece las tres propuestas y tres anchos sin cambiar la ficha aprobada', () => {
  for (const valor of ['visual', 'selector', 'cuenta']) assert.ok(comparador.includes(`data-vista="${valor}"`));
  for (const ancho of ['desktop', '390', '320']) assert.ok(comparador.includes(`data-ancho="${ancho}"`));
  assert.ok(comparador.includes('id="estado-vacio"'));
  assert.ok(vista.includes('ficha-propuestas.html?propuesta=4'));
});

test('recursos locales disponibles, IDs únicos y scripts válidos', () => {
  for (const html of [comparador, vista]) {
    for (const [, referencia] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (referencia.startsWith('#')) continue;
      assert.ok(existsSync(new URL(referencia.split('?')[0], import.meta.url)), referencia);
    }
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
    assert.equal(ids.length, new Set(ids).size);
    for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script);
  }
  for (const [, recurso] of css.matchAll(/url\('([^']+)'\)/g)) assert.ok(existsSync(new URL(recurso, import.meta.url)));
  for (const [, recurso] of js.matchAll(/foto:'([^']+)'/g)) assert.ok(existsSync(new URL(recurso, import.meta.url)));
  new Script(js);
});

test('no hay red, almacenamiento persistente ni formularios de credenciales', () => {
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(vista, /type="password"|<form[^>]+action=/);
  assert.ok(vista.includes('Vista de muestra. No modifica tu cuenta.'));
  assert.ok(js.includes('new Set('));
});

test('selección accesible, diálogos nativos y foco tras quitar una guardada', () => {
  assert.ok(js.includes("setAttribute('aria-pressed'"));
  assert.equal((vista.match(/<dialog /g) ?? []).length, 4);
  assert.ok(js.includes('siguiente.focus({preventScroll:true})'));
  assert.ok(vista.includes('aria-label="Ajustes de cuenta"'));
  assert.ok(css.includes('@media(prefers-reduced-motion:no-preference)'));
});
