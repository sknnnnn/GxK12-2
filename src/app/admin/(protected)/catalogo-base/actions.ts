"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveCategory, saveColor, saveSize } from "@/services/admin";
import { NEW_CATEGORY_SLUG } from "@/services/catalog";
import { slugify } from "@/lib/slug";

const BASE = "/admin/catalogo-base";

function fail(message: string): never {
  redirect(`${BASE}?error=${encodeURIComponent(message)}`);
}

function friendly(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error);
  if (message.includes("duplicate key")) return "Ya existe uno con ese nombre o slug.";
  return "No se pudo guardar. Revisá los datos.";
}

export async function saveCategoryAction(id: string | null, formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!name || !slug) fail("La categoría necesita un nombre.");
  if (slug === NEW_CATEGORY_SLUG) fail(`El slug "${NEW_CATEGORY_SLUG}" está reservado para NUEVO.`);
  if (!Number.isInteger(sortOrder)) fail("El orden debe ser un número entero.");
  try {
    await saveCategory(await createSupabaseServerClient(), id, { name, slug, sortOrder, isActive: formData.get("isActive") === "on" });
  } catch (error) {
    fail(friendly(error));
  }
  redirect(`${BASE}?success=1`);
}

export async function saveSizeAction(id: string | null, formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!name) fail("El talle necesita un nombre.");
  if (!Number.isInteger(sortOrder)) fail("El orden debe ser un número entero.");
  try {
    await saveSize(await createSupabaseServerClient(), id, { name, sortOrder, isActive: formData.get("isActive") === "on" });
  } catch (error) {
    fail(friendly(error));
  }
  redirect(`${BASE}?success=1`);
}

export async function saveColorAction(id: string | null, formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const hex = String(formData.get("hexCode") ?? "").trim();
  if (!name) fail("El color necesita un nombre.");
  if (hex && !/^#[0-9A-Fa-f]{6}$/.test(hex)) fail("El código de color debe tener el formato #RRGGBB.");
  try {
    await saveColor(await createSupabaseServerClient(), id, {
      name,
      slug: slugify(name),
      hexCode: hex || null,
      isActive: formData.get("isActive") === "on",
    });
  } catch (error) {
    fail(friendly(error));
  }
  redirect(`${BASE}?success=1`);
}
