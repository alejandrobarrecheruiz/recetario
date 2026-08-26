// Comprobacion de salud: responde si desde ESTE despliegue se llega a la base.
// Las variables de Vercel y la apertura de Atlas se configuran a ciegas; esta
// ruta las comprueba sin mezclarlas con fallos de Better Auth.
import { obtenerDb } from "@/lib/mongo";

// Sin esto, Next puede resolver la ruta durante el build. El ping se ejecutaria
// al desplegar en vez de al visitarla y, si Atlas no contestara, romperia el
// despliegue entero en lugar de devolver un 503.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await obtenerDb();
    await db.command({ ping: 1 });

    // El nombre de la base va al log del servidor, NO a la respuesta publica.
    console.log(`salud: ok, base "${db.databaseName}"`);

    return Response.json({ ok: true });
  } catch (error) {
    // El mensaje del driver suele incluir el host del cluster y el usuario, asi
    // que se queda en el log. La respuesta publica no cuenta nada.
    console.error(
      "salud: sin conexion con la base.",
      error instanceof Error ? error.message : error,
    );
    return Response.json({ ok: false }, { status: 503 });
  }
}
