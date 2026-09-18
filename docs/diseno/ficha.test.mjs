import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const leer = nombre => readFileSync(new URL(nombre, import.meta.url), 'utf8');
const html = leer('portada.html');

// DOM mínimo para comprobar el controlador, no el layout ni el foco nativo.
function iniciar() {
  const elementos = new Map();
  class Nodo {
    constructor(tipo='div') { this.tipo=tipo; this.atributos={}; this.dataset={}; this.children=[]; this.eventos=new Map(); this.hidden=false; this.open=false; this.textContent=''; }
    set id(valor) { this._id=valor; elementos.set(valor,this); }
    get id() { return this._id; }
    addEventListener(tipo,funcion) { this.eventos.set(tipo,funcion); }
    setAttribute(nombre,valor) { this.atributos[nombre]=valor; }
    append(...hijos) { this.children.push(...hijos); hijos.forEach(hijo=>{hijo.padre=this;}); }
    replaceChildren(...hijos) { this.children=[]; this.append(...hijos); }
    querySelector(selector) { if (selector==='span') return this.children.find(item=>item.tipo==='span'); return null; }
    closest() { if(this.hidden)return this; for(let item=this.padre;item;item=item.padre) if(item.hidden)return item; return null; }
    focus() { this.enfocado=true; }
    scrollIntoView() { this.desplazado=true; }
    showModal() { this.open=true; }
    close() { if(this.open){this.open=false;this.activar('close');} }
    activar(tipo='click',datos={}) { this.eventos.get(tipo)?.({ preventDefault(){}, currentTarget:this, ...datos }); }
  }
  for(const match of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const elemento=new Nodo(match[1]); elemento.id=match[2]; elemento.hidden=/\shidden[\s>]/.test(match[0]);
  }
  elementos.get('guardar-ficha').append(new Nodo('span'));
  const enlaces=[...html.matchAll(/<a\b[^>]*href="(https:[^"]+\/recetas\/[^"]+)"[^>]*>/g)].map(match=>{const enlace=new Nodo('a');enlace.href=match[1];return enlace;});
  const contenidoCocina=new Nodo();
  const ventana={eventos:new Map(), addEventListener(tipo,funcion){this.eventos.set(tipo,funcion);},scrollTo(){}};
  ventana.parent=ventana;
  let refrescos=0;
  const entorno={
    window:ventana,
    document:{
      getElementById(id){assert.ok(elementos.has(id),`Existe #${id}`);return elementos.get(id);},
      createElement:tipo=>new Nodo(tipo),
      querySelectorAll(selector){assert.equal(selector,'a[href*="/recetas/"]');return enlaces;},
      querySelector(selector){assert.equal(selector,'.kitchen-content');return contenidoCocina;},
    },
    portadaDemo:{guardadas:new Set(),refrescar(){refrescos++;}},
  };
  for(const archivo of ['recetas-demo.js','estado-cocina.js','ficha.js']) runInNewContext(leer(archivo),entorno);
  return { porId:id=>elementos.get(id), entorno, refrescos:()=>refrescos, abrir(id='katsu'){enlaces.find(item=>item.href.includes(id==='katsu'?'katsu-curry':'guacamole')).activar();} };
}

test('La ficha abre contenido real sin salir de la maqueta',()=>{
  const vista=iniciar(); vista.abrir();
  assert.equal(vista.porId('ficha').open,true);
  assert.equal(vista.porId('nombre-ficha').textContent,'Katsu curry de proteína vegetal');
  assert.equal(vista.porId('lista-ingredientes').children.length,17);
  assert.equal(vista.porId('lista-pasos').children.length,8);
  assert.equal(vista.porId('foto-ficha').hidden,false);
  vista.abrir('guacamole');
  assert.equal(vista.porId('foto-ficha').hidden,true);
  assert.equal(vista.porId('lista-pasos').children.length,3);
});

test('Raciones y checklist se comparten con cocina, sin escalar el texto narrativo',()=>{
  const vista=iniciar(); vista.abrir();
  vista.porId('menos-raciones').activar();
  assert.match(vista.porId('cantidad-tofu').textContent,/337,5 g/);
  assert.equal(vista.porId('aviso-raciones').hidden,false);
  const check=vista.porId('check-tofu'); check.checked=true; check.activar('change');
  assert.equal(vista.porId('contador-ingredientes').textContent,'1 de 17 listos');
  vista.porId('cocinar').activar();
  assert.equal(vista.porId('raciones-cocina').textContent,3);
  const tofu=vista.porId('lista-cocina').children.find(item=>item.textContent.includes('Tofu'));
  assert.match(tofu.textContent,/337,5 g/);
  assert.equal(tofu.dataset.listo,'true');
  assert.equal(vista.porId('aviso-raciones-cocina').hidden,false);
});

test('Salir, volver a portada y retomar conserva paso y cantidades',()=>{
  const vista=iniciar(); vista.abrir();
  vista.porId('mas-raciones').activar();
  vista.porId('cocinar').activar(); vista.porId('paso-siguiente').activar();
  vista.porId('salir-cocina').activar();
  assert.equal(vista.porId('cocinar').textContent,'Retomar paso 2 →');
  vista.porId('cerrar-ficha').activar();
  assert.equal(vista.porId('retomar-preparacion').hidden,false);
  vista.abrir('guacamole'); vista.porId('cerrar-ficha').activar();
  assert.equal(vista.porId('retomar-nombre').textContent,'Katsu curry de proteína vegetal');
  vista.porId('retomar-receta').activar();
  assert.equal(vista.porId('cocina').open,true);
  assert.equal(vista.porId('contador-paso').textContent,'Paso 2 de 8');
  assert.equal(vista.porId('raciones-cocina').textContent,5);
});

test('Cada receta conserva su preparación por separado',()=>{
  const vista=iniciar(); vista.abrir(); vista.porId('menos-raciones').activar();
  vista.porId('otra-receta').activar();
  assert.equal(vista.porId('raciones-ficha').textContent,4);
  vista.porId('otra-receta').activar();
  assert.equal(vista.porId('raciones-ficha').textContent,3);
});

test('Guardar en ficha sincroniza la portada y su etiqueta accesible',()=>{
  const vista=iniciar(); vista.abrir(); vista.porId('guardar-ficha').activar();
  assert.ok(vista.entorno.portadaDemo.guardadas.has('katsu'));
  assert.equal(vista.porId('guardar-ficha').atributos['aria-pressed'],'true');
  assert.match(vista.porId('guardar-ficha').atributos['aria-label'],/Quitar/);
  assert.equal(vista.refrescos(),1);
  vista.porId('guardar-ficha').activar();
  assert.equal(vista.entorno.portadaDemo.guardadas.size,0);
});

test('Terminar cierra el modo; solo reiniciar vuelve al primer paso',()=>{
  const vista=iniciar(); vista.abrir('guacamole'); vista.porId('cocinar').activar();
  vista.porId('paso-siguiente').activar(); vista.porId('paso-siguiente').activar();
  assert.equal(vista.porId('paso-siguiente').textContent,'Terminar ✓');
  vista.porId('paso-siguiente').activar();
  assert.equal(vista.porId('cocina').open,false);
  assert.equal(vista.porId('cocinar').textContent,'Revisar último paso →');
  vista.porId('cocinar').activar();
  assert.equal(vista.porId('contador-paso').textContent,'Paso 3 de 3');
  vista.porId('reiniciar-pasos').activar();
  assert.equal(vista.porId('contador-paso').textContent,'Paso 1 de 3');
  assert.equal(vista.porId('paso-anterior').disabled,true);
});

test('Raciones limitadas, IDs estables y reinicio al abrir otra instancia',()=>{
  const vista=iniciar(); vista.abrir();
  for(let n=0;n<20;n++)vista.porId('menos-raciones').activar();
  assert.equal(vista.porId('raciones-ficha').textContent,1);
  for(let n=0;n<30;n++)vista.porId('mas-raciones').activar();
  assert.equal(vista.porId('raciones-ficha').textContent,12);
  for(const receta of Object.values(vista.entorno.recetasDemo)) {
    for(const lista of [receta.ingredientes,receta.pasos])assert.equal(new Set(lista.map(item=>item.id)).size,lista.length);
  }
  const nueva=iniciar();nueva.abrir();assert.equal(nueva.porId('raciones-ficha').textContent,4);
});

test('CSS válido y logo circular en tamaños móvil y escritorio',()=>{
  const require=createRequire(import.meta.url); const postcss=require('postcss');
  postcss.parse(leer('ficha.css'));
  const css=leer('portada.css');
  assert.match(css,/\.brand img\{width:44px;height:44px;[^}]*border-radius:50%/);
  assert.match(css,/\.brand img\{width:40px;height:40px/);
  assert.doesNotMatch(leer('ficha.js'),/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b|document\.cookie|innerHTML/);
});
