"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRelationKey, linkRelation, unlinkRelation } from "@/services/admin";

// Relaciones editoriales (Universe, capítulos de G & K, eventos). `relation`
// se valida contra una lista cerrada; la autorización real es RLS (admin_all_*).

function safeReturn(returnTo: string): string {
  return returnTo.startsWith("/admin/") ? returnTo : "/admin";
}

export async function linkRelationAction(relation: string, ownerId: string, count: number, returnTo: string, formData: FormData): Promise<void> {
  const target = safeReturn(returnTo);
  const targetId = String(formData.get("targetId") ?? "");
  if (!isRelationKey(relation) || !targetId) redirect(`${target}?error=${encodeURIComponent("Elegí qué relacionar.")}`);
  try {
    await linkRelation(await createSupabaseServerClient(), relation, ownerId, targetId, count);
  } catch {
    redirect(`${target}?error=${encodeURIComponent("No se pudo guardar la relación.")}`);
  }
  redirect(`${target}?success=1`);
}

export async function unlinkRelationAction(relation: string, ownerId: string, targetId: string, returnTo: string): Promise<void> {
  const target = safeReturn(returnTo);
  if (!isRelationKey(relation)) redirect(target);
  await unlinkRelation(await createSupabaseServerClient(), relation, ownerId, targetId);
  redirect(`${target}?success=1`);
}
