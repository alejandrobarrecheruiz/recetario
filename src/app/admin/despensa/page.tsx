import Link from "next/link";
import { CabeceraPanel } from "@/components/cabecera-panel";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidadAlimentos } from "@/lib/alimentos";
import { rolActual } from "@/lib/sesion";

export default async function PaginaDespensaAdmin({ searchParams }: { searchParams: Promise<{ limpieza?: string }> }) {
  const { limpieza } = await searchParams;
  const { alimentos } = await obtenerColecciones();
  const docs = await alimentos.find(conVisibilidadAlimentos(await rolActual())).sort({ actualizadaEn: -1, _id: -1 }).toArray();
  return <main className="pagina-amplia flex min-h-svh flex-col gap-8 py-8">
    <CabeceraPanel seccion="despensa" />
    {limpieza === "pendiente" && <p role="alert" className="text-acento">El alimento se eliminó, pero alguna foto no pudo limpiarse. Sus metadatos se conservan para revisar con el inventario de imágenes.</p>}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Despensa</h1>
      <Link href="/admin/despensa/nuevo" className="cuenta-boton">Añadir alimento</Link>
    </div>
    <p className="text-tinta/65">Cada alimento tiene una sola ficha. Márcalo como indispensable para incluirlo también en esa selección.</p>
    {docs.length ? <ul role="list" className="divide-y divide-raya-oscura">
      {docs.map(alimento => <li key={alimento._id.toHexString()}>
        <Link href={`/admin/despensa/${alimento._id}/editar`} className="flex min-h-11 flex-wrap items-center gap-3 py-5">
          <span className="min-w-0 break-words text-xl font-medium">{alimento.nombre}</span>
          <span className="text-sm text-tinta/65">{alimento.estado === "publicado" ? "Publicado" : "Borrador"}</span>
          {alimento.indispensable && <span className="text-sm text-acento">Indispensable</span>}
          {alimento.compras.some(compra => !compra.revisadoEn) && <span className="ml-auto text-sm text-tinta/65">Lugares por revisar</span>}
        </Link>
      </li>)}
    </ul> : <p className="py-8 text-lg">Empieza por un alimento que te guste recomendar.</p>}
    <Link href="/despensa" className="self-start py-3 underline underline-offset-4">Ver la despensa pública</Link>
  </main>;
}
