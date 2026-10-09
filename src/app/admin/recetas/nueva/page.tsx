import { CabeceraPanel } from "@/components/cabecera-panel";
import { CrearReceta } from "@/components/crear-receta";

// Alta de receta: solo el título; el resto se escribe en el editor. El POST lo
// hace el cliente contra /api/recetas, que es quien comprueba el rol de
// verdad; esta pagina solo esta tras el guard del layout.
export default function PaginaNuevaReceta() {
  return (
    <main className="pagina-panel">
      <CabeceraPanel />
      <section className="panel-alta" aria-labelledby="titulo-alta">
        <h1 id="titulo-alta" className="panel-titulo">
          Nueva receta
        </h1>
        <p className="panel-introduccion">Empieza por el nombre del plato. En el editor podrás escribir los ingredientes, los pasos y añadir las fotos.</p>
        <CrearReceta />
      </section>
    </main>
  );
}
