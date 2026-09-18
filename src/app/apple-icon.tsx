import { imagenDeMarca } from "@/lib/marca-imagen";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function IconoApple() { return imagenDeMarca(size.width, size.height); }
