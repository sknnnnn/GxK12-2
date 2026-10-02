import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminChapter, getLinkedIds, getRelationOptions } from "@/services/admin";
import { RelationEditor } from "@/components/admin/RelationEditor";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { CoverManager } from "@/components/admin/CoverManager";
import styles from "@/components/admin/admin.module.css";
import { deleteAdventureAction, deleteChapterAction, saveAdventureAction, saveChapterAction } from "../../actions";
import { StatusSelect } from "../../Fields";

export default async function AdminChapterPage(props: PageProps<"/admin/aventuras/capitulo/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const [data, options, entryIds, productIds, outfitIds] = await Promise.all([
    getAdminChapter(supabase, id),
    getRelationOptions(supabase),
    getLinkedIds(supabase, "chapter_entry", id),
    getLinkedIds(supabase, "chapter_product", id),
    getLinkedIds(supabase, "chapter_outfit", id),
  ]);
  if (!data) notFound();
  const { chapter, season, adventures } = data;
  const returnTo = `/admin/aventuras/capitulo/${chapter.id}`;

  return (
    <div className={styles.page}>
      <Link href={`/admin/aventuras/${season.id}`}>
        ← Season {String(season.number).padStart(2, "0")} — {season.title}
      </Link>
      <h1>
        {chapter.label}
        {chapter.title ? ` ${chapter.title}` : ""}
      </h1>
      <Flash searchParams={searchParams} />

      <form action={saveChapterAction.bind(null, season.id, chapter.id)} className={`${styles.card} ${styles.form}`}>
        <div className={styles.row}>
          <label className={styles.field}>
            Etiqueta
            <input name="label" defaultValue={chapter.label} required />
          </label>
          <label className={styles.field}>
            Título
            <input name="title" defaultValue={chapter.title ?? ""} />
          </label>
          <label className={styles.field}>
            Slug
            <input name="slug" defaultValue={chapter.slug} />
          </label>
          <label className={styles.field} style={{ maxWidth: "6rem" }}>
            Orden
            <input name="sortOrder" type="number" defaultValue={chapter.sortOrder} />
          </label>
          <StatusSelect value={chapter.status} />
        </div>
        <label className={styles.field}>
          Bajada
          <textarea name="summary" rows={2} defaultValue={chapter.summary ?? ""} />
        </label>
        <SubmitButton className={styles.button}>Guardar capítulo</SubmitButton>
      </form>

      <section className={styles.card}>
        <h2>Portada del capítulo</h2>
        <CoverManager table="adventure_chapters" id={chapter.id} coverPath={chapter.coverPath} coverUrl={chapter.coverUrl} returnTo={returnTo} />
      </section>

      <section className={styles.card}>
        <h2>Aventuras</h2>
        {adventures.map((adventure) => (
          <div key={adventure.id} className={styles.card}>
            <form action={saveAdventureAction.bind(null, chapter.id, adventure.id)} className={styles.form}>
              <div className={styles.row}>
                <label className={styles.field}>
                  Título
                  <input name="title" defaultValue={adventure.title} required />
                </label>
                <label className={styles.field}>
                  Video (https://)
                  <input name="videoUrl" defaultValue={adventure.videoUrl ?? ""} />
                </label>
                <label className={styles.field} style={{ maxWidth: "6rem" }}>
                  Orden
                  <input name="sortOrder" type="number" defaultValue={adventure.sortOrder} />
                </label>
                <StatusSelect value={adventure.status} />
              </div>
              <label className={styles.field}>
                Texto
                <textarea name="body" rows={6} defaultValue={adventure.body ?? ""} />
              </label>
              <SubmitButton className={styles.buttonSecondary}>Guardar aventura</SubmitButton>
            </form>
            <CoverManager table="adventures" id={adventure.id} coverPath={adventure.coverPath} coverUrl={adventure.coverUrl} returnTo={returnTo} />
            <form action={deleteAdventureAction.bind(null, chapter.id, adventure.id)}>
              <SubmitButton className={styles.danger} confirmText="¿Borrar esta aventura?">
                Borrar aventura
              </SubmitButton>
            </form>
          </div>
        ))}
        <form action={saveAdventureAction.bind(null, chapter.id, null)} className={styles.form}>
          <h3>Nueva aventura</h3>
          <div className={styles.row}>
            <label className={styles.field}>
              Título
              <input name="title" required />
            </label>
            <label className={styles.field} style={{ maxWidth: "6rem" }}>
              Orden
              <input name="sortOrder" type="number" defaultValue={adventures.length} />
            </label>
            <StatusSelect />
          </div>
          <SubmitButton className={styles.button}>Agregar aventura</SubmitButton>
        </form>
      </section>

      {/* Relaciones opcionales del capítulo: sin productos ni outfits, el capítulo no es comprable. */}
      <RelationEditor title="Universo relacionado" relation="chapter_entry" ownerId={chapter.id} linkedIds={entryIds} options={options.entries} returnTo={returnTo} />
      <RelationEditor title="Productos" relation="chapter_product" ownerId={chapter.id} linkedIds={productIds} options={options.products} returnTo={returnTo} />
      <RelationEditor title="Outfits" relation="chapter_outfit" ownerId={chapter.id} linkedIds={outfitIds} options={options.outfits} returnTo={returnTo} />

      <form action={deleteChapterAction.bind(null, season.id, chapter.id)}>
        <SubmitButton className={styles.danger} confirmText="¿Borrar el capítulo con sus aventuras?">
          Borrar capítulo
        </SubmitButton>
      </form>
    </div>
  );
}
