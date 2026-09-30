import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTENT_STATUS_LABELS, getAdminSeasons } from "@/services/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import styles from "@/components/admin/admin.module.css";
import { saveSeasonAction } from "./actions";
import { StatusSelect } from "./Fields";

// Las Aventuras de G & K (Bible §28): temporadas -> capítulos -> aventuras.
// La estructura de la Season 01 viene cargada en borrador tal como la define
// la Bible; el contenido lo completa GXK.
export default async function AdminAventurasPage(props: PageProps<"/admin/aventuras">) {
  const searchParams = await props.searchParams;
  const seasons = await getAdminSeasons(await createSupabaseServerClient());

  return (
    <div className={styles.page}>
      <Link href="/admin/universo">← Universo</Link>
      <h1>Las Aventuras de G &amp; K</h1>
      <Flash searchParams={searchParams} />
      <p className={styles.muted}>
        Una temporada solo se ve en el sitio publicada (o &quot;Coming soon&quot;, sin capítulos). Capítulos y aventuras necesitan
        estar publicados, igual que su temporada.
      </p>
      <ul className={styles.list}>
        {seasons.map((season) => (
          <li key={season.id} className={styles.card}>
            <Link href={`/admin/aventuras/${season.id}`}>
              Season {String(season.number).padStart(2, "0")} — {season.title}
            </Link>
            <span className={styles.muted}>
              {CONTENT_STATUS_LABELS[season.status] ?? season.status} · {season.chapterCount} capítulos
            </span>
          </li>
        ))}
      </ul>

      <form action={saveSeasonAction.bind(null, null)} className={`${styles.card} ${styles.form}`}>
        <h2>Nueva temporada</h2>
        <div className={styles.row}>
          <label className={styles.field} style={{ maxWidth: "6rem" }}>
            Número
            <input name="number" type="number" min={1} defaultValue={seasons.length + 1} required />
          </label>
          <label className={styles.field}>
            Título
            <input name="title" required />
          </label>
          <StatusSelect seasons />
        </div>
        <SubmitButton className={styles.button}>Crear temporada</SubmitButton>
      </form>
    </div>
  );
}
