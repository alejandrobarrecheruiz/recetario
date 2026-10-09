import { ObjectId, type Filter } from "mongodb";
import type { Alimento, AlimentoDoc } from "@/models/alimento";
import type { Rol } from "@/models/usuario";

/** Todas las recomendaciones publicadas son públicas; los borradores, solo del panel. */
export function conVisibilidadAlimentos(rol: Rol, filtro: Filter<AlimentoDoc> = {}): Filter<AlimentoDoc> {
  return rol === "admin" ? filtro : { $and: [{ estado: "publicado" }, filtro] };
}

export function alimentoADoc(alimento: Alimento): AlimentoDoc {
  return { ...alimento, _id: new ObjectId(alimento._id), autorId: new ObjectId(alimento.autorId),
    fotoId: alimento.fotoId ? new ObjectId(alimento.fotoId) : null };
}

export function docAAlimento(doc: AlimentoDoc): Alimento {
  return { ...doc, _id: doc._id.toHexString(), autorId: doc.autorId.toHexString(), fotoId: doc.fotoId?.toHexString() ?? null };
}
