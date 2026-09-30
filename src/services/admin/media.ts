// Subida de imágenes de contenido (outfits, Universo, eventos, Home) al
// bucket público de imágenes (mismas policies de admin que productos).

import { randomUUID } from "node:crypto";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { PRODUCT_IMAGES_BUCKET } from "@/services/catalog";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type ImageUploadCheck = { ok: true; file: File } | { ok: false; error: string };

/** Valida un File de formulario (vacío = sin archivo). */
export function checkImageUpload(value: FormDataEntryValue | null): ImageUploadCheck | null {
  if (!(value instanceof File) || value.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.has(value.type)) return { ok: false, error: "Formato de imagen no soportado (JPG, PNG, WEBP o GIF)." };
  if (value.size > MAX_IMAGE_BYTES) return { ok: false, error: "La imagen supera los 5 MB." };
  return { ok: true, file: value };
}

export async function uploadContentImage(supabase: GxkSupabaseClient, prefix: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `content/${prefix}/${randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeContentImage(supabase: GxkSupabaseClient, path: string | null): Promise<void> {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  if (error) console.error(`[admin] no se pudo borrar ${path} de Storage:`, error.message);
}
