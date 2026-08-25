import { CabeceraPanel } from "@/components/cabecera-panel";
import { CrearReceta } from "@/components/crear-receta";

// Alta de receta: solo el título; el resto se escribe en el editor. El POST lo
// hace el cliente contra /api/recetas, que es quien comprueba el rol de
// verdad; esta pagina solo esta tras el guard del layout.
export default function PaginaNuevaReceta() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1100px] flex-col gap-8 px-[clamp(20px,4vw,40px)] py-8">
      <CabeceraPanel />
      <section className="flex max-w-[720px] flex-col gap-6">
        <h2 className="font-[family-name:var(--font-bricolage)] text-[clamp(26px,3vw,40px)] font-extrabold leading-none tracking-[-0.035em]">
          Nueva receta
        </h2>
        <CrearReceta />
      </section>
    </div>
  );
}
