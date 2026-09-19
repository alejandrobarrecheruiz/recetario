import Image from "next/image";
import { presentacion } from "@/contenido/presentacion";

export function PresentacionPersonal() {
  return <section className="presentacion-personal pagina-amplia" aria-labelledby="titulo-presentacion">
    <Image className="presentacion-retrato" src="/Imagen-Persona.png" alt="Alejandro, con su chaquetilla de cocina" width={1143} height={1376} sizes="(max-width: 700px) 240px, 340px" />
    <div className="presentacion-contenido">
      <h2 id="titulo-presentacion">{presentacion.titulo}</h2>
      <p className="presentacion-texto">{presentacion.texto}</p>
    </div>
  </section>;
}
