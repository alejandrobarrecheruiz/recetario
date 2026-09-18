import { FormularioAcceso } from "@/components/formulario-acceso";
import { correoConfigurado } from "@/lib/correo";

export default function PaginaLogin() {
  return <FormularioAcceso permiteRegistro={correoConfigurado()} />;
}
