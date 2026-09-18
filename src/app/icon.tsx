import { imagenDeMarca } from "@/lib/marca-imagen";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default function Icono() { return imagenDeMarca(size.width, size.height); }
