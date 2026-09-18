const parametros = new URLSearchParams(location.search);
const vista = ['visual','selector','cuenta'].includes(parametros.get('vista')) ? parametros.get('vista') : 'selector';
document.body.dataset.vista = vista;
document.querySelector('#catalogo').hidden = vista === 'cuenta';
document.querySelector('#cuenta').hidden = vista !== 'cuenta';
document.querySelector('#tira-categorias').hidden = vista !== 'visual';
document.querySelector(vista === 'cuenta' ? '#nav-cuenta' : '#nav-catalogo').setAttribute('aria-current','page');
document.title = (vista === 'cuenta' ? 'Cuenta' : 'Catálogo') + ' · Propuesta visual';
const categorias = [{id:'todas',nombre:'Todas'},{id:'aperitivos',nombre:'Aperitivos'},{id:'platos',nombre:'Platos'},{id:'sopas',nombre:'Sopas'},{id:'postres',nombre:'Postres'}];
const recetas = [
  {id:'katsu',titulo:'Katsu curry',categoria:'platos',foto:'assets/katsu-curry.jpg',alt:'Katsu curry con arroz',resumen:'Crujiente por fuera, con una salsa de curry suave y arroz recién hecho.',tiempo:'50 min',nivel:'Media',fecha:'24 de agosto',busqueda:'pollo arroz curry'},
  {id:'tortilla',titulo:'Tortilla de patatas',categoria:'platos',foto:'assets/tortilla-propuestas.jpg',alt:'Foto de prueba: un perro al aire libre, no una fotografía del plato',resumen:'Jugosa por dentro y dorada por fuera. Con cebolla, sin pedir perdón.',tiempo:'45 min',nivel:'Media',fecha:'17 de agosto',busqueda:'patata huevo cebolla'},
  {id:'croquetas',titulo:'Croquetas de jamón',categoria:'aperitivos',resumen:'La bechamel de la abuela, con sus horas de cariño y su reposo.',tiempo:'1 h 5',nivel:'Difícil',fecha:'10 de agosto',busqueda:'jamon leche harina'},
  {id:'gazpacho',titulo:'Gazpacho andaluz',categoria:'sopas',resumen:'Frío, de tomate maduro y sin trucos raros. El de todos los veranos.',tiempo:'15 min',nivel:'Fácil',fecha:'3 de agosto',busqueda:'tomate pepino pimiento'},
  {id:'tarta',titulo:'Tarta de queso',categoria:'postres',resumen:'El centro cremoso y los bordes dorados. Mejor de un día para otro.',tiempo:'1 h 5',nivel:'Fácil',fecha:'27 de julio',busqueda:'queso nata huevo'}
];
const guardadas = new Set(parametros.get('vacia') === '1' ? [] : ['katsu','tortilla','tarta']);
let categoria = 'todas';
let consulta = '';
let temporizador;
const icono = nombre => `<svg aria-hidden="true"><use href="#${nombre}"/></svg>`;
const normalizar = texto => texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function aviso(texto) {
  const salida=document.querySelector('.aviso');
  salida.textContent=texto;salida.hidden=false;clearTimeout(temporizador);
  temporizador=setTimeout(()=>{salida.hidden=true;},4500);
}
function pintarCategorias() {
  for (const [selector,clase] of [['#tira-categorias','categoria-visual'],['#opciones-categorias','opcion-categoria']]) {
    const contenedor=document.querySelector(selector);contenedor.replaceChildren();
    categorias.forEach(c=>{
      const boton=document.createElement('button');boton.className=clase;boton.dataset.categoria=c.id;boton.setAttribute('aria-pressed',String(categoria===c.id));
      const cantidad=recetas.filter(r=>(c.id==='todas'||r.categoria===c.id)&&normalizar(r.titulo+' '+r.busqueda).includes(normalizar(consulta))).length;
      boton.innerHTML=icono(c.id)+`<span>${c.nombre}</span>`+(clase==='opcion-categoria'?`<span class="cantidad">${cantidad}</span><span class="seleccion" aria-hidden="true">${categoria===c.id?'✓':''}</span>`:'');
      boton.addEventListener('click',()=>{
        categoria=c.id;
        if(document.querySelector('#categorias').open)document.querySelector('#categorias').close();
        pintar();
        if(vista==='visual')document.querySelector(`#tira-categorias [data-categoria="${c.id}"]`).focus({preventScroll:true});
      });contenedor.append(boton);
    });
  }
  document.querySelector('#categoria-actual').textContent=categoria==='todas'?'Todas las recetas':categorias.find(c=>c.id===categoria).nombre;
}
function pintar() {
  pintarCategorias();
  const visibles=recetas.filter(r=>(vista==='cuenta'?guardadas.has(r.id):categoria==='todas'||r.categoria===categoria)&&normalizar(r.titulo+' '+r.busqueda).includes(normalizar(consulta)));
  document.querySelectorAll('[data-recuento]').forEach(e=>{e.textContent=vista==='cuenta'?String(visibles.length):`${visibles.length} ${visibles.length===1?'receta':'recetas'}`;});
  const lista=document.querySelector('#recetas');lista.replaceChildren();
  visibles.forEach(r=>{
    const tarjeta=document.createElement('article');tarjeta.className='tarjeta'+(r.foto?'':' sin-foto');
    tarjeta.innerHTML=`<button class="abrir-receta" aria-label="Abrir ${r.titulo}">${r.foto?`<div class="foto"><img src="${r.foto}" alt="${r.alt}" width="800" height="600"></div>`:''}<p class="fecha">${r.fecha}</p><h2>${r.titulo}</h2><p class="resumen">${r.resumen}</p><div class="meta"><span>${icono('reloj')}${r.tiempo}</span><span><span class="nivel" aria-hidden="true">▂▅▇</span>${r.nivel}</span></div></button><button class="icono marcador" data-receta="${r.id}" aria-label="${guardadas.has(r.id)?'Quitar':'Guardar'} ${r.titulo}" aria-pressed="${guardadas.has(r.id)}">${icono('guardar')}</button>`;
    const nivel = {Fácil:1,Media:2,Difícil:3}[r.nivel];
    tarjeta.querySelector('.nivel').innerHTML = `<svg viewBox="0 0 24 24"><rect x="2" y="15" width="5" height="6"/><rect x="10" y="10" width="5" height="11" opacity="${nivel>=2?1:.2}"/><rect x="18" y="5" width="5" height="16" opacity="${nivel>=3?1:.2}"/></svg>`;
    tarjeta.querySelector('.abrir-receta').addEventListener('click',()=>{document.querySelector('#titulo-detalle').textContent=r.titulo;document.querySelector('#detalle').showModal();});
    tarjeta.querySelector('.marcador').addEventListener('click',()=>{
      const indice=visibles.indexOf(r);
      if(guardadas.has(r.id))guardadas.delete(r.id);else guardadas.add(r.id);
      pintar();
      const botones=[...document.querySelectorAll('.marcador')];
      const siguiente=botones.find(b=>b.dataset.receta===r.id)||botones[Math.min(indice,botones.length-1)]||document.querySelector('#vacio a');
      siguiente.focus({preventScroll:true});
      aviso(guardadas.has(r.id)?'Guardada en esta demostración.':'Quitada de esta demostración.');
    });lista.append(tarjeta);
  });
  document.querySelector('#vacio').hidden=visibles.length!==0;
  document.querySelector('#vacio-titulo').textContent=vista==='cuenta'&&!consulta?'Aún no has guardado ninguna.':'No hay recetas con ese filtro.';
  document.querySelector('#vacio-texto').textContent=vista==='cuenta'&&!consulta?'Toca el marcador de una receta para tenerla aquí.':'Prueba otra categoría o busca otro plato.';
  document.querySelector('#busqueda-activa').hidden=!consulta;
  document.querySelector('#busqueda-activa span').textContent=`Búsqueda: ${consulta}`;
}
document.querySelector('#abrir-categorias').addEventListener('click',()=>document.querySelector('#categorias').showModal());
document.querySelectorAll('[data-abrir]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.abrir).showModal()));
document.querySelectorAll('[data-cerrar]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.querySelectorAll('[data-demo]').forEach(b=>b.addEventListener('click',()=>{
  const panel=b.closest('dialog');
  if(panel)panel.querySelector('[role=status]').textContent=b.dataset.demo;else aviso(b.dataset.demo);
}));
document.querySelector('#form-busqueda').addEventListener('submit',e=>{e.preventDefault();consulta=document.querySelector('#consulta').value.trim();document.querySelector('#busqueda').close();pintar();if(vista==='cuenta')aviso('La búsqueda filtra las guardadas de esta demostración.');});
document.querySelector('#limpiar-busqueda').addEventListener('click',()=>{consulta='';document.querySelector('#consulta').value='';pintar();document.querySelector(vista==='cuenta'?'[data-abrir="busqueda"]':vista==='visual'?'.categoria-visual':'#abrir-categorias').focus();});
pintar();
