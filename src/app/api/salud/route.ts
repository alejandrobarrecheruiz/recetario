// Comprobacion de salud: responde si desde ESTE despliegue se llega a la base.
//
// POR QUE EXISTE: las variables de entorno de Vercel y la apertura de Atlas se
// configuran a ciegas y no se comprueban hasta que algo intenta usarlas. Lo
// primero que lo intenta es Better Auth, en la fase 3, y si entonces falla hay
// tres sospechosos a la vez: la configuracion de Better Auth, las variables y la
// conexion con Atlas. Esta ruta descarta el tercero por adelantado.
//
// No pertenece a ninguna fase: es una herramienta, como los scripts de
// scripts/. Se queda tambien despues de la fase 3.
import { obtenerDb } from "@/lib/mongo";

// Sin esto, Next puede resolver la ruta durante el build. El ping se ejecutaria
// al desplegar en vez de al visitarla y, si Atlas no contestara, romperia el
// despliegue entero en lugar de devolver un 503.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await obtenerDb();
    await db.command({ ping: 1 });

    // El nombre de la base va al log del servidor, NO al cuerpo de la respuesta.
    // Es donde de verdad interesa: en los Logs de Vercel se ve "recetas_prod" en
    // Production y "recetas_dev" en Preview, que es como se confirma que la
    // separacion dev/prod quedo bien. Y lo lee solo quien tiene acceso al panel.
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
