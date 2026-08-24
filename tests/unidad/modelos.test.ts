/**
 * El esquema Zod es la fuente de verdad del modelo. Estas pruebas fijan las
 * cuatro decisiones que CLAUDE.md dice que no se simplifican, para que un
 * "refactor de limpieza" futuro tenga que romper una prueba antes de romper el
 * modelo.
 *
 * Son puras: no tocan la red ni necesitan .env.local.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  recetaSchema,
  recetaEntradaSchema,
  ingredienteSchema,
  pasoSchema,
  generarSlug,
} from "@/models/receta";
import { imagenSchema, imagenEntradaSchema } from "@/models/imagen";

const ID = "507f1f77bcf86cd799439011";

function recetaValida() {
  return {
    _id: ID,
    slug: "tarta-de-queso",
    titulo: "Tarta de queso",
    resumen: "La de siempre.",
    estado: "publicada",
    visibilidad: "publica",
    publicadaEn: "2026-08-20T10:00:00.000Z",
    actualizadaEn: "2026-08-20T10:00:00.000Z",
    autorId: ID,
    raciones: 8,
    tiempo: { preparacion: 15, coccion: 50, total: 65 },
    dificultad: "facil",
    categorias: ["postres"],
    etiquetas: ["horno"],
    ingredientes: [
      { id: "i1", cantidad: 600, unidad: "g", nombre: "queso crema" },
      { id: "i2", cantidad: 0, unidad: "", nombre: "sal", nota: "al gusto" },
    ],
    pasos: [
      { id: "p1", orden: 0, texto: "Precalentar el horno.", imagenId: null },
      { id: "p2", orden: 1, texto: "Batir todo.", imagenId: ID },
    ],
    portadaId: ID,
    seo: { descripcion: "Tarta de queso cremosa." },
  };
}

describe("recetaSchema", () => {
  test("acepta una receta completa y coacciona las fechas a Date", () => {
    const receta = recetaSchema.parse(recetaValida());
    assert.ok(receta.actualizadaEn instanceof Date);
    assert.ok(receta.publicadaEn instanceof Date);
  });

  test("publicadaEn puede ser null (borrador sin publicar)", () => {
    const borrador = { ...recetaValida(), estado: "borrador", publicadaEn: null };
    assert.equal(recetaSchema.parse(borrador).publicadaEn, null);
  });

  test("el slug va en minusculas y guiones: es la URL", () => {
    for (const slug of ["Tarta De Queso", "tarta_de_queso", "tarta de queso", "TARTA", "tarta-", ""]) {
      assert.equal(
        recetaSchema.safeParse({ ...recetaValida(), slug }).success,
        false,
        `el slug "${slug}" no deberia colar`,
      );
    }
    assert.ok(recetaSchema.safeParse({ ...recetaValida(), slug: "tarta-de-queso-3" }).success);
  });

  test("estado y visibilidad son campos distintos y no admiten valores inventados", () => {
    // Decision 2 de CLAUDE.md: no fusionarlos en un publicado: boolean.
    assert.equal(recetaSchema.safeParse({ ...recetaValida(), estado: "published" }).success, false);
    assert.equal(recetaSchema.safeParse({ ...recetaValida(), estado: true }).success, false);
    assert.equal(recetaSchema.safeParse({ ...recetaValida(), visibilidad: "privada" }).success, false);

    // Un borrador puede tener cualquier visibilidad: son ejes independientes.
    assert.ok(
      recetaSchema.safeParse({
        ...recetaValida(),
        estado: "borrador",
        visibilidad: "registrada",
      }).success,
    );
  });

  test("los identificadores son hex de 24, no ObjectId ni URLs", () => {
    // A proposito: el esquema lo importan componentes de cliente y
    // z.instanceof(ObjectId) arrastraria el driver de Mongo al bundle.
    assert.equal(recetaSchema.safeParse({ ...recetaValida(), autorId: "no-es-un-id" }).success, false);
    assert.equal(recetaSchema.safeParse({ ...recetaValida(), portadaId: ID.toUpperCase() }).success, false);
    assert.ok(recetaSchema.safeParse({ ...recetaValida(), portadaId: null }).success);
  });

  test("raciones es un entero positivo: sirve para escalar", () => {
    for (const raciones of [0, -2, 2.5]) {
      assert.equal(recetaSchema.safeParse({ ...recetaValida(), raciones }).success, false);
    }
  });
});

describe("ingredienteSchema", () => {
  test("cantidad, unidad y nombre van separados, nunca en una sola cadena", () => {
    // Decision 1 de CLAUDE.md: es lo que permitira escalar raciones.
    assert.equal(
      ingredienteSchema.safeParse({ id: "i1", nombre: "600 g de queso crema" }).success,
      false,
      "un ingrediente sin cantidad ni unidad no debe validar",
    );
    assert.ok(
      ingredienteSchema.safeParse({ id: "i1", cantidad: 600, unidad: "g", nombre: "queso crema" }).success,
    );
  });

  test("unidad vacia vale (al gusto), nombre vacio no", () => {
    assert.ok(ingredienteSchema.safeParse({ id: "i1", cantidad: 0, unidad: "", nombre: "sal" }).success);
    assert.equal(
      ingredienteSchema.safeParse({ id: "i1", cantidad: 1, unidad: "g", nombre: "" }).success,
      false,
    );
  });

  test("cada ingrediente lleva id propio, para reordenar con keys estables", () => {
    // Decision 3 de CLAUDE.md: nunca usar el indice del array como key.
    assert.equal(
      ingredienteSchema.safeParse({ cantidad: 600, unidad: "g", nombre: "queso" }).success,
      false,
    );
  });
});

describe("pasoSchema", () => {
  test("el paso referencia imagenId, nunca una URL", () => {
    // Decision 4 de CLAUDE.md: cambiar de proveedor toca una sola coleccion.
    assert.equal(
      pasoSchema.safeParse({
        id: "p1",
        orden: 0,
        texto: "Batir.",
        imagenId: "https://ik.imagekit.io/x/foto.jpg",
      }).success,
      false,
    );
    assert.ok(pasoSchema.safeParse({ id: "p1", orden: 0, texto: "Batir.", imagenId: null }).success);
  });

  test("cada paso lleva id propio y orden entero", () => {
    assert.equal(pasoSchema.safeParse({ orden: 0, texto: "Batir.", imagenId: null }).success, false);
    assert.equal(
      pasoSchema.safeParse({ id: "p1", orden: 1.5, texto: "Batir.", imagenId: null }).success,
      false,
    );
  });
});

describe("generarSlug", () => {
  test("lo que propone pasa la validacion de slug del esquema", () => {
    const slugSchema = recetaSchema.shape.slug;
    for (const titulo of [
      "Tarta de queso",
      "Croquetas de jamón",
      "Ñoquis a la crema",
      "  Pollo al ajillo (¡el bueno!)  ",
      "Café con leche 2.0",
    ]) {
      const slug = generarSlug(titulo);
      assert.ok(
        slugSchema.safeParse(slug).success,
        `"${titulo}" produjo el slug invalido "${slug}"`,
      );
    }
  });

  test("quita tildes y enes, y une con guiones", () => {
    assert.equal(generarSlug("Croquetas de jamón"), "croquetas-de-jamon");
    assert.equal(generarSlug("Ñoquis a la crema"), "noquis-a-la-crema");
    assert.equal(generarSlug("  Café   con leche  "), "cafe-con-leche");
  });
});

describe("recetaEntradaSchema", () => {
  test("lo que manda el panel no incluye _id, autorId ni actualizadaEn", () => {
    // Esos tres los decide el servidor. Si viajaran desde el formulario, el
    // cliente podria firmar una receta como otro autor.
    const { _id, autorId, actualizadaEn, ...entrada } = recetaValida();
    void _id;
    void autorId;
    void actualizadaEn;

    const resultado = recetaEntradaSchema.safeParse(entrada);
    assert.ok(resultado.success, JSON.stringify(resultado.error?.issues));
    assert.equal("_id" in resultado.data, false);
    assert.equal("autorId" in resultado.data, false);
    assert.equal("actualizadaEn" in resultado.data, false);
  });
});

describe("imagenSchema", () => {
  function imagenValida() {
    return {
      _id: ID,
      recetaId: ID,
      proveedor: "imagekit",
      fileId: "6835b1c1e3a9f0001a2b3c4d",
      url: "https://ik.imagekit.io/demo/dev/tarta.jpg",
      path: "/dev/tarta.jpg",
      alt: "Tarta de queso recien horneada",
      ancho: 1600,
      alto: 1200,
      bytes: 348_112,
      tipo: "portada",
      orden: 0,
      subidaEn: "2026-08-20T10:00:00.000Z",
      subidaPor: ID,
    };
  }

  test("acepta una imagen completa", () => {
    const imagen = imagenSchema.parse(imagenValida());
    assert.ok(imagen.subidaEn instanceof Date);
  });

  test("fileId es obligatorio: sin el la foto queda huerfana en ImageKit", () => {
    const { fileId, ...sinFileId } = imagenValida();
    void fileId;
    assert.equal(imagenSchema.safeParse(sinFileId).success, false);
    assert.equal(imagenSchema.safeParse({ ...imagenValida(), fileId: "" }).success, false);
  });

  test("recetaId puede ser null (imagen huerfana detectable)", () => {
    assert.ok(imagenSchema.safeParse({ ...imagenValida(), recetaId: null }).success);
  });

  test("url tiene que ser una URL de verdad", () => {
    assert.equal(imagenSchema.safeParse({ ...imagenValida(), url: "/dev/tarta.jpg" }).success, false);
  });

  test("lo que manda el panel no incluye _id, subidaEn ni subidaPor", () => {
    // Esos tres los decide el servidor, como en recetaEntradaSchema.
    const { _id, subidaEn, subidaPor, ...entrada } = imagenValida();
    void _id;
    void subidaEn;
    void subidaPor;

    const resultado = imagenEntradaSchema.safeParse(entrada);
    assert.ok(resultado.success, JSON.stringify(resultado.error?.issues));
    assert.equal("_id" in resultado.data, false);
    assert.equal("subidaPor" in resultado.data, false);
  });
});
