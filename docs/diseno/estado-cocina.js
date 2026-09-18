/* Estado único por receta; se comparte entre preparación y cocina. */
globalThis.crearEstadoCocina = recetas => {
  const estados = new Map();
  function para(id) {
    if (!Object.hasOwn(recetas, id)) throw new Error('Receta desconocida');
    if (!estados.has(id)) estados.set(id, { raciones:recetas[id].raciones, paso:0, listos:new Set(), terminada:false });
    return estados.get(id);
  }
  return {
    para,
    cambiarRaciones(id, cambio) { const estado=para(id); estado.raciones=Math.max(1,Math.min(12,estado.raciones+cambio)); },
    cantidad(id, ingrediente) { return ingrediente.cantidad * para(id).raciones / recetas[id].raciones; },
    marcar(id, ingredienteId, listo) {
      if (!recetas[id]?.ingredientes.some(item=>item.id===ingredienteId)) throw new Error('Ingrediente desconocido');
      if (listo) para(id).listos.add(ingredienteId);
      else para(id).listos.delete(ingredienteId);
    },
    mover(id, cambio) { const estado=para(id); estado.paso=Math.max(0,Math.min(recetas[id].pasos.length-1,estado.paso+cambio)); estado.terminada=false; },
    reiniciar(id) { para(id).paso=0; para(id).terminada=false; },
  };
};
