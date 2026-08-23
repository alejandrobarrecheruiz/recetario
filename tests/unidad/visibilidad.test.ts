/**
 * La regla dura del proyecto: el rol se traduce SIEMPRE a un filtro de consulta,
 * nunca a un condicional en el render. Estas pruebas fijan la traduccion.
 *
 * Son puras: no tocan la red ni necesitan .env.local.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { conVisibilidad, filtroVisibilidad } from "@/lib/visibilidad";
import { rolDeSesion } from "@/models/usuario";

describe("filtroVisibilidad", () => {
  test("publico solo ve publicadas y publicas", () => {
    assert.deepEqual(filtroVisibilidad("publico"), {
      estado: "publicada",
      visibilidad: "publica",
    });
  });

  test("registrado ve ademas las de visibilidad registrada, pero no borradores", () => {
    assert.deepEqual(filtroVisibilidad("registrado"), {
      estado: "publicada",
      visibilidad: { $in: ["publica", "registrada"] },
    });
  });

  test("admin no tiene restricciones", () => {
    assert.deepEqual(filtroVisibilidad("admin"), {});
  });

  test("ningun rol salvo admin puede ver borradores", () => {
    for (const rol of ["publico", "registrado"] as const) {
      assert.equal(
        filtroVisibilidad(rol).estado,
        "publicada",
        `el rol ${rol} no debe poder ver borradores`,
      );
    }
  });
});

describe("conVisibilidad", () => {
  test("combina el filtro propio con el de visibilidad", () => {
    const filtro = conVisibilidad("publico", { categorias: "postres" });
    assert.deepEqual(filtro, {
      $and: [
        { categorias: "postres" },
        { estado: "publicada", visibilidad: "publica" },
      ],
    });
  });

  test("un filtro propio NO puede pisar estado ni visibilidad", () => {
    // Esta es la razon de existir de conVisibilidad. Con un spread a mano
    // ({...filtro, ...base}) o al reves, un filtro descuidado abriria el agujero.
    const filtro = conVisibilidad("publico", { estado: "borrador" });

    // El $and conserva las dos condiciones: la consulta no devuelve nada, que es
    // el comportamiento correcto, en lugar de devolver borradores.
    assert.ok(Array.isArray(filtro.$and), "debe usar $and, no un spread");
    assert.deepEqual(filtro.$and?.[1], {
      estado: "publicada",
      visibilidad: "publica",
    });
  });

  test("para admin devuelve el filtro propio tal cual, sin $and inutil", () => {
    assert.deepEqual(conVisibilidad("admin", { slug: "tarta" }), {
      slug: "tarta",
    });
    assert.deepEqual(conVisibilidad("admin"), {});
  });

  test("sin filtro propio devuelve solo la restriccion de visibilidad", () => {
    assert.deepEqual(conVisibilidad("registrado"), {
      $and: [{}, { estado: "publicada", visibilidad: { $in: ["publica", "registrada"] } }],
    });
  });
});

describe("rolDeSesion", () => {
  test("sin sesion es publico", () => {
    assert.equal(rolDeSesion(undefined), "publico");
    assert.equal(rolDeSesion(null), "publico");
  });

  test("admin es admin", () => {
    assert.equal(rolDeSesion("admin"), "admin");
  });

  test("cualquier otro valor con sesion cae en registrado", () => {
    // Better Auth pone "user" por defecto con el plugin admin.
    assert.equal(rolDeSesion("user"), "registrado");
    assert.equal(rolDeSesion("registrado"), "registrado");
    assert.equal(rolDeSesion("cualquier-cosa"), "registrado");
  });

  test("'publico' nunca se guarda, pero si llegara no da privilegios", () => {
    // publico no es un rol almacenado: es la ausencia de sesion. Si alguien
    // metiera esa cadena en user.role, lo peor que pasa es que se trate como
    // registrado; nunca como admin.
    assert.notEqual(rolDeSesion("publico"), "admin");
  });
});
