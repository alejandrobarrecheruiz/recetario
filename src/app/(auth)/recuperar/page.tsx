import Link from "next/link";
import { RecuperarAcceso } from "@/components/recuperar-acceso";
import { correoConfigurado } from "@/lib/correo";

export default async function PaginaRecuperar({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  if (!correoConfigurado()) return <main className="mx-auto max-w-md px-8 py-16"><h1 className="text-3xl">Recuperar el acceso</h1><p className="my-6">La recuperación por correo todavía no está disponible.</p><Link href="/login" className="underline">Volver a entrar</Link></main>;
  const parametros = await searchParams;
  return <RecuperarAcceso token={parametros.token} enlaceInvalido={Boolean(parametros.error)} />;
}
