import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTENT_STATUS_LABELS, getAdminSeason } from "@/services/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { CoverManager } from "@/components/admin/CoverManager";
import styles from "@/components/admin/admin.module.css";
import { deleteSeasonAction, saveChapterAction, saveSeasonAction } from "../actions";
import { StatusSelect } from "../Fields";

export default async function AdminSeasonPage(props: PageProps<"/admin/aventuras/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const data = await getAdminSeason(await createSupabaseServerClient(), id);
  if (!data) notFound();
  const { season, chapters } = data;

  return (
    <div className={styles.page}>
      <Link href="/admin/aventuras">← Aventuras</Link>
      <h1>
        Season {String(season.number).padStart(2, "0")} — {season.title}
      </h1>
      <Flash searchParams={searchParams} />

      <form action={saveSeasonAction.bind(null, season.id)} className={`${styles.card} ${styles.form}`}>
        <div className={styles.row}>
          <label className={styles.field} style={{ maxWidth: "6rem" }}>
            Número
            <input name="number" type="number" min={1} defaultValue={season.number} required />
          </label>
          <label className={styles.field}>
            Título
            <input name="title" defaultValue={season.title} required />
          </label>
          <label className={styles.field}>
            Slug
            <input name="slug" defaultValue={season.slug} />
          </label>
          <StatusSelect value={season.status} seasons />
        </div>
        <label className={styles.field}>
          Bajada
          <textarea name="summary" rows={2} defaultValue={season.summary ?? ""} />
        </label>
        <SubmitButton className={styles.button}>Guardar temporada</SubmitButton>
      </form>

      <section className={styles.card}>
        <h2>Portada</h2>
        <CoverManager table="adventure_seasons" id={season.id} coverPath={season.coverPath} coverUrl={season.coverUrl} returnTo={`/admin/aventuras/${season.id}`} />
      </section>

      <section className={styles.card}>
        <h2>Capítulos</h2>
        <ul className={styles.list}>
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <Link href={`/admin/aventuras/capitulo/${chapter.id}`}>
                {chapter.label}
                {chapter.title ? ` ${chapter.title}` : ""}
              </Link>{" "}
              <span className={styles.muted}>({CONTENT_STATUS_LABELS[chapter.status] ?? chapter.status})</span>
            </li>
          ))}
        </ul>
        <form action={saveChapterAction.bind(null, season.id, null)} className={styles.row}>
          <label className={styles.field}>
            Etiqueta
            <input name="label" placeholder="Ch.1" required />
          </label>
          <label className={styles.field}>
            Título
            <input name="title" />
          </label>
          <label className={styles.field} style={{ maxWidth: "6rem" }}>
            Orden
            <input name="sortOrder" type="number" defaultValue={chapters.length} />
          </label>
          <StatusSelect />
          <SubmitButton className={styles.button}>Agregar capítulo</SubmitButton>
        </form>
      </section>

      <form action={deleteSeasonAction.bind(null, season.id)}>
        <SubmitButton className={styles.danger} confirmText="¿Borrar la temporada con todos sus capítulos y aventuras?">
          Borrar temporada
        </SubmitButton>
      </form>
    </div>
  );
}
