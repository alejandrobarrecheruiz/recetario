import { imagenDeMarca } from "@/lib/marca-imagen";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Mi libro de recetas, el cuaderno de cocina de Alejandro";
export default function ImagenSocial() { return imagenDeMarca(size.width, size.height, true); }
