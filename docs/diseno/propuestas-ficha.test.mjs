import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { Script } from 'node:vm';

const leer = nombre => readFileSync(new URL(nombre, import.meta.url), 'utf8');
const comparador = leer('propuestas-ficha.html');
const ficha = leer('ficha-propuestas.html');
const css = leer('ficha-propuestas.css');
const js = leer('ficha-propuestas.js');

test('el comparador ofrece las cuatro propuestas y anchos de revisión', () => {
  for (const numero of [1, 2, 3, 4]) {
    assert.ok(comparador.includes(`data-propuesta="${numero}"`));
    assert.ok(css.includes(`[data-propuesta="${numero}"]`));
  }
  for (const ancho of ['desktop', '390', '320']) assert.ok(comparador.includes(`data-ancho="${ancho}"`));
  assert.ok(css.includes('@media(max-width:760px)'));
});

test('la propuesta cuatro es la entrada y la foto no tiene pie', () => {
  assert.ok(comparador.includes('src="ficha-propuestas.html?propuesta=4"'));
  assert.ok(ficha.includes('data-propuesta="4"'));
  assert.doesNotMatch(ficha, /<figcaption/);
  assert.ok(css.includes('[data-propuesta="4"] .ingredientes .contenido{display:contents}'));
  assert.ok(css.includes('text-align:center;border:0;background:transparent;margin:72px auto 16px'));
  assert.ok(css.includes('padding-top:32px;border-top:0'));
  assert.doesNotMatch(css, /content:"P\. D\./);
  assert.ok(css.includes('[data-propuesta="4"] .nota .autor{display:none}'));
  assert.ok(css.includes('[data-propuesta="4"] .preparacion>.rotulo{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}'));
  assert.ok(js.includes("document.querySelector('.preparacion').append(document.querySelector('.nota'))"));
});

test('todos los recursos y destinos locales de las propuestas existen', () => {
  for (const html of [comparador, ficha]) {
    for (const [, referencia] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (referencia.startsWith('#')) continue;
      assert.ok(!referencia.startsWith('http'), 'La maqueta no depende de recursos de red');
      assert.ok(existsSync(new URL(referencia.split('?')[0], import.meta.url)), referencia);
    }
  }
  for (const [, referencia] of css.matchAll(/url\('([^']+)'\)/g)) assert.ok(existsSync(new URL(referencia, import.meta.url)));
});

test('scripts válidos y demostraciones sin red ni persistencia', () => {
  new Script(js);
  for (const [, script] of comparador.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie/);
});

test('la lista no vuelve a introducir un checklist y los IDs no se repiten', () => {
  const ingredientes = ficha.split('<ul class="lista-ingredientes">')[1].split('</ul>')[0];
  assert.doesNotMatch(ingredientes, /<button|<input|aria-pressed/);
  for (const html of [ficha, comparador]) {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
    assert.equal(ids.length, new Set(ids).size);
  }
});
