/**
 * Datos de ejemplo para desarrollo.
 *
 *   npm run seed:dev
 *
 * Siembra recetas que cubren las tres combinaciones que importan para probar el
 * filtro de visibilidad:
 *
 *   borrador                           -> solo la ve el admin
 *   publicada + visibilidad publica    -> la ve todo el mundo
 *   publicada + visibilidad registrada -> la ven registrados y admin
 *
 * Cada documento se valida con `recetaSchema` ANTES de insertarse: si el seed
 * metiera basura que el esquema rechaza, el fallo apareceria luego en la app y
 * costaria el doble encontrarlo.
 *
 * Es idempotente: upsert por `slug` con `_id` fijo, se puede relanzar sin
 * duplicar. Las fechas van fijas por lo mismo.
 *
 * Este script ESCRIBE. No debe correr nunca contra recetas_prod.
 */
import { esBaseDeProduccion, obtenerCliente, obtenerDb, obtenerRecetas } from "../src/lib/mongo";
import { recetaADoc } from "../src/lib/recetas";
import { recetaSchema, type Receta } from "../src/models/receta";

/**
 * Identificadores fijos (hex valido; "5eed" por "seed") para que el upsert sea
 * estable entre ejecuciones. Las recetas de verdad llevaran ObjectId generados.
 */
const IDS = {
  gazpacho: "5eed000000000000000000a1",
  tortilla: "5eed000000000000000000a2",
  croquetas: "5eed000000000000000000a3",
  tarta: "5eed000000000000000000a4",
} as const;

function recetas(autorId: string): Receta[] {
  const base = {
    autorId,
    portadaId: null,
    actualizadaEn: new Date("2026-08-24T12:00:00.000Z"),
  };

  return [
    {
      ...base,
      _id: IDS.gazpacho,
      slug: "gazpacho-andaluz",
      titulo: "Gazpacho andaluz",
      resumen: "Frío, de tomate maduro y sin trucos raros. El de todos los veranos.",
      estado: "publicada",
      visibilidad: "publica",
      publicadaEn: new Date("2026-08-03T10:00:00.000Z"),
      raciones: 4,
      tiempo: { preparacion: 15, coccion: 0, total: 15 },
      dificultad: "facil",
      categorias: ["sopas frías"],
      etiquetas: ["verano", "sin horno", "vegetariano"],
      ingredientes: [
        { id: "i1", cantidad: 1000, unidad: "g", nombre: "tomate maduro" },
        { id: "i2", cantidad: 1, unidad: "unidad", nombre: "pepino", nota: "pequeño" },
        { id: "i3", cantidad: 1, unidad: "unidad", nombre: "pimiento verde" },
        { id: "i4", cantidad: 1, unidad: "diente", nombre: "ajo" },
        { id: "i5", cantidad: 50, unidad: "ml", nombre: "aceite de oliva virgen extra" },
        { id: "i6", cantidad: 15, unidad: "ml", nombre: "vinagre de Jerez" },
        { id: "i7", cantidad: 0, unidad: "", nombre: "sal", nota: "al gusto" },
      ],
      pasos: [
        { id: "p1", orden: 0, texto: "Lavar y trocear el tomate, el pepino y el pimiento.", imagenId: null },
        { id: "p2", orden: 1, texto: "Triturar todo con el ajo hasta que quede fino.", imagenId: null },
        { id: "p3", orden: 2, texto: "Emulsionar con el aceite, ajustar de vinagre y sal, y colar.", imagenId: null },
        { id: "p4", orden: 3, texto: "Enfriar al menos dos horas antes de servir.", imagenId: null },
      ],
      seo: { descripcion: "Gazpacho andaluz tradicional: tomate, pepino, pimiento y buen aceite." },
    },
    {
      ...base,
      _id: IDS.tortilla,
      slug: "tortilla-de-patatas",
      titulo: "Tortilla de patatas",
      resumen: "Jugosa por dentro y dorada por fuera. Con cebolla, sin pedir perdón.",
      estado: "publicada",
      visibilidad: "publica",
      publicadaEn: new Date("2026-08-17T10:00:00.000Z"),
      raciones: 6,
      tiempo: { preparacion: 15, coccion: 30, total: 45 },
      dificultad: "media",
      categorias: ["clásicos"],
      etiquetas: ["huevo", "patata", "de toda la vida"],
      ingredientes: [
        { id: "i1", cantidad: 800, unidad: "g", nombre: "patata" },
        { id: "i2", cantidad: 6, unidad: "unidad", nombre: "huevo" },
        { id: "i3", cantidad: 1, unidad: "unidad", nombre: "cebolla" },
        { id: "i4", cantidad: 400, unidad: "ml", nombre: "aceite de oliva", nota: "para freír" },
        { id: "i5", cantidad: 0, unidad: "", nombre: "sal", nota: "al gusto" },
      ],
      pasos: [
        { id: "p1", orden: 0, texto: "Pelar y cortar la patata en láminas finas; picar la cebolla.", imagenId: null },
        { id: "p2", orden: 1, texto: "Confitar patata y cebolla en aceite a fuego medio hasta que estén tiernas.", imagenId: null },
        { id: "p3", orden: 2, texto: "Escurrir bien y mezclar con el huevo batido y la sal. Reposar diez minutos.", imagenId: null },
        { id: "p4", orden: 3, texto: "Cuajar en sartén caliente, dar la vuelta con un plato y terminar al gusto.", imagenId: null },
      ],
      notas: "Con la patata confitada, no frita: la textura lo agradece.",
      seo: { descripcion: "Tortilla de patatas con cebolla, jugosa, paso a paso." },
    },
    {
      ...base,
      _id: IDS.croquetas,
      slug: "croquetas-de-jamon",
      titulo: "Croquetas de jamón",
      resumen: "La bechamel de la abuela, con sus horas de cariño y su reposo.",
      estado: "publicada",
      visibilidad: "registrada",
      publicadaEn: new Date("2026-08-10T10:00:00.000Z"),
      raciones: 8,
      tiempo: { preparacion: 45, coccion: 20, total: 65 },
      dificultad: "dificil",
      categorias: ["aperitivos"],
      etiquetas: ["fritos", "receta de familia"],
      ingredientes: [
        { id: "i1", cantidad: 150, unidad: "g", nombre: "jamón ibérico", nota: "picado fino" },
        { id: "i2", cantidad: 100, unidad: "g", nombre: "mantequilla" },
        { id: "i3", cantidad: 120, unidad: "g", nombre: "harina de trigo" },
        { id: "i4", cantidad: 1000, unidad: "ml", nombre: "leche entera" },
        { id: "i5", cantidad: 2, unidad: "unidad", nombre: "huevo", nota: "para rebozar" },
        { id: "i6", cantidad: 150, unidad: "g", nombre: "pan rallado" },
        { id: "i7", cantidad: 0, unidad: "", nombre: "nuez moscada", nota: "al gusto" },
      ],
      pasos: [
        { id: "p1", orden: 0, texto: "Sofreír el jamón en la mantequilla sin que se dore.", imagenId: null },
        { id: "p2", orden: 1, texto: "Añadir la harina y cocinarla un par de minutos.", imagenId: null },
        { id: "p3", orden: 2, texto: "Incorporar la leche caliente poco a poco, sin dejar de remover, hasta una bechamel espesa.", imagenId: null },
        { id: "p4", orden: 3, texto: "Enfriar la masa tapada a piel al menos cuatro horas, mejor toda la noche.", imagenId: null },
        { id: "p5", orden: 4, texto: "Formar, pasar por huevo y pan rallado, y freír en aceite bien caliente.", imagenId: null },
      ],
      notas: "Receta de familia: por eso es de las que solo ven los registrados.",
      seo: { descripcion: "Croquetas de jamón cremosas, con bechamel reposada." },
    },
    {
      ...base,
      _id: IDS.tarta,
      slug: "tarta-de-queso",
      titulo: "Tarta de queso",
      resumen: "Cremosa, casi líquida en el centro. Todavía ajustando el horno.",
      estado: "borrador",
      visibilidad: "publica",
      publicadaEn: null,
      raciones: 8,
      tiempo: { preparacion: 15, coccion: 50, total: 65 },
      dificultad: "facil",
      categorias: ["postres"],
      etiquetas: ["horno", "queso"],
      ingredientes: [
        { id: "i1", cantidad: 600, unidad: "g", nombre: "queso crema" },
        { id: "i2", cantidad: 4, unidad: "unidad", nombre: "huevo" },
        { id: "i3", cantidad: 200, unidad: "ml", nombre: "nata para montar" },
        { id: "i4", cantidad: 150, unidad: "g", nombre: "azúcar" },
        { id: "i5", cantidad: 20, unidad: "g", nombre: "harina de trigo" },
      ],
      pasos: [
        { id: "p1", orden: 0, texto: "Precalentar el horno a 210 grados con calor arriba y abajo.", imagenId: null },
        { id: "p2", orden: 1, texto: "Batir todos los ingredientes hasta que no queden grumos.", imagenId: null },
        { id: "p3", orden: 2, texto: "Hornear 50 minutos: el centro debe temblar al sacarla.", imagenId: null },
      ],
      seo: { descripcion: "Tarta de queso al horno, cremosa." },
    },
  ];
}

async function principal() {
  const base = process.env.MONGODB_DB;

  if (esBaseDeProduccion()) {
    console.error(
      `Este script escribe y esta apuntando a "${base}". Abortado. ` +
        "El seed solo se ejecuta contra recetas_dev.",
    );
    process.exit(1);
  }

  // El autor es el admin de verdad de la base de dev: los datos de ejemplo
  // imitan la realidad, no inventan claves ajenas que no apuntan a nadie.
  const db = await obtenerDb();
  const admin = await db.collection("user").findOne({ role: "admin" });
  if (!admin) {
    console.error(
      "No hay ningun usuario admin en la base. Crea el tuyo primero:\n" +
        "  npm run crear-usuario -- --rol admin",
    );
    process.exit(1);
  }

  console.log(`Sembrando recetas de ejemplo en "${base}"...`);

  const coleccion = await obtenerRecetas();
  for (const cruda of recetas(admin._id.toString())) {
    // La validacion va antes del insert a proposito; ver cabecera.
    const receta = recetaSchema.parse(cruda);
    const { _id, ...resto } = recetaADoc(receta);

    await coleccion.updateOne(
      { slug: receta.slug },
      { $set: resto, $setOnInsert: { _id } },
      { upsert: true },
    );

    const quienLaVe =
      receta.estado === "borrador"
        ? "solo admin (borrador)"
        : receta.visibilidad === "registrada"
          ? "registrados y admin"
          : "todo el mundo";
    console.log(`  - ${receta.slug} -> ${quienLaVe}`);
  }

  console.log("Listo.");
  await (await obtenerCliente()).close();
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
