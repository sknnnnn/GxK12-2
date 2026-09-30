import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminOutfits, OUTFIT_STYLE_LABELS, type OutfitStyle } from "@/services/admin";
import { formatDateTimeAR } from "@/lib/datetime";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import styles from "@/components/admin/admin.module.css";
import { createOutfitAction } from "./actions";
import { OutfitFields, STATUS_LABELS } from "./OutfitFields";

// Ideas de outfits (Bible §12): se muestran en Home si están publicados y
// vigentes, con al menos un producto publicado.
export default async function AdminOutfitsPage(props: PageProps<"/admin/outfits">) {
  const searchParams = await props.searchParams;
  const outfits = await getAdminOutfits(await createSupabaseServerClient());

  return (
    <div className={styles.page}>
      <h1>Outfits</h1>
      <Flash searchParams={searchParams} />

      {outfits.length === 0 ? (
        <p className={styles.muted}>Todavía no hay outfits.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Outfit</th>
                <th>Estilo</th>
                <th>Estado</th>
                <th>Vigencia</th>
                <th>Productos</th>
              </tr>
            </thead>
            <tbody>
              {outfits.map((outfit) => (
                <tr key={outfit.id}>
                  <td>
                    {outfit.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que Productos.
                      <img src={outfit.coverUrl} alt="" className={styles.thumb} />
                    ) : (
                      <div className={styles.thumb} />
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/outfits/${outfit.id}`}>{outfit.name}</Link>
                  </td>
                  <td>{outfit.style ? OUTFIT_STYLE_LABELS[outfit.style as OutfitStyle] : "—"}</td>
                  <td>
                    <span className={styles.badge}>{STATUS_LABELS[outfit.status] ?? outfit.status}</span>
                  </td>
                  <td>
                    {outfit.startsAt ? formatDateTimeAR(outfit.startsAt) : "Siempre"} → {outfit.endsAt ? formatDateTimeAR(outfit.endsAt) : "sin fin"}
                  </td>
                  <td>{outfit.productCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={createOutfitAction} className={`${styles.card} ${styles.form}`}>
        <h2>Nuevo outfit</h2>
        <OutfitFields />
        <SubmitButton className={styles.button}>Crear outfit</SubmitButton>
      </form>
    </div>
  );
}
