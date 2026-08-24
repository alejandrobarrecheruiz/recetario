import { FormularioReceta } from "@/components/formulario-receta";

// Alta de receta. El formulario envia a POST /api/recetas, que es quien
// comprueba el rol de verdad; esta pagina solo esta tras el guard del layout.
export default function PaginaNuevaReceta() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Nueva receta</h2>
      <FormularioReceta />
    </section>
  );
}
