import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminOutfits, getAdminUniverseEntry, getProductPickerOptions } from "@/services/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { CoverManager } from "@/components/admin/CoverManager";
import styles from "@/components/admin/admin.module.css";
import {
  addMediaAction,
  deleteMediaAction,
  deleteUniverseEntryAction,
  linkOutfitAction,
  linkProductAction,
  unlinkOutfitAction,
  unlinkProductAction,
  updateUniverseEntryAction,
} from "../actions";
import { EntryFields } from "../EntryFields";

export default async function AdminUniverseEntryPage(props: PageProps<"/admin/universo/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const [entry, products, outfits] = await Promise.all([
    getAdminUniverseEntry(supabase, id),
    getProductPickerOptions(supabase),
    getAdminOutfits(supabase),
  ]);
  if (!entry) notFound();
  const returnTo = `/admin/universo/${entry.id}`;

  return (
    <div className={styles.page}>
      <Link href="/admin/universo">← Volver al Universo</Link>
      <h1>{entry.title}</h1>
      <Flash searchParams={searchParams} />

      <form action={updateUniverseEntryAction.bind(null, entry.id)} className={`${styles.card} ${styles.form}`}>
        <EntryFields entry={entry} />
        <SubmitButton className={styles.button}>Guardar</SubmitButton>
      </form>

      <section className={styles.card}>
        <h2>Portada</h2>
        <CoverManager table="universe_entries" id={entry.id} coverPath={entry.coverPath} coverUrl={entry.coverUrl} returnTo={returnTo} />
      </section>

      <section className={styles.card}>
        <h2>Fotos</h2>
        <div className={styles.row}>
          {entry.media.map((media) => (
            <figure key={media.id} className={styles.form}>
              {/* eslint-disable-next-line @next/next/no-img-element -- mismo criterio que Productos. */}
              <img src={media.url} alt={media.altText ?? ""} className={styles.thumb} />
              <form action={deleteMediaAction.bind(null, entry.id, media.id)}>
                <SubmitButton className={styles.danger} confirmText="¿Borrar esta foto?">
                  Borrar
                </SubmitButton>
              </form>
            </figure>
          ))}
        </div>
        <form action={addMediaAction.bind(null, entry.id, entry.media.length)} className={styles.row}>
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required aria-label="Foto" />
          <input name="altText" placeholder="Texto alternativo" aria-label="Texto alternativo" />
          <SubmitButton className={styles.buttonSecondary} pendingText="Subiendo…">
            Agregar foto
          </SubmitButton>
        </form>
      </section>

      <section className={styles.card}>
        <h2>Productos (comprables si hay stock)</h2>
        <ul className={styles.list}>
          {entry.products.map((product) => (
            <li key={product.productId} className={styles.row}>
              <Link href={`/admin/productos/${product.productId}`} style={{ flex: 1 }}>
                {product.name}
              </Link>
              <form action={unlinkProductAction.bind(null, entry.id, product.productId)}>
                <SubmitButton className={styles.danger}>Quitar</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={linkProductAction.bind(null, entry.id, entry.products.length)} className={styles.row}>
          <select name="productId" required defaultValue="" aria-label="Producto">
            <option value="" disabled>
              Elegir producto…
            </option>
            {products
              .filter((product) => !entry.products.some((linked) => linked.productId === product.id))
              .map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
          </select>
          <SubmitButton className={styles.buttonSecondary}>Asociar</SubmitButton>
        </form>
      </section>

      <section className={styles.card}>
        <h2>Outfits</h2>
        <ul className={styles.list}>
          {entry.outfits.map((outfit) => (
            <li key={outfit.outfitId} className={styles.row}>
              <Link href={`/admin/outfits/${outfit.outfitId}`} style={{ flex: 1 }}>
                {outfit.name}
              </Link>
              <form action={unlinkOutfitAction.bind(null, entry.id, outfit.outfitId)}>
                <SubmitButton className={styles.danger}>Quitar</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={linkOutfitAction.bind(null, entry.id, entry.outfits.length)} className={styles.row}>
          <select name="outfitId" required defaultValue="" aria-label="Outfit">
            <option value="" disabled>
              Elegir outfit…
            </option>
            {outfits
              .filter((outfit) => !entry.outfits.some((linked) => linked.outfitId === outfit.id))
              .map((outfit) => (
                <option key={outfit.id} value={outfit.id}>
                  {outfit.name}
                </option>
              ))}
          </select>
          <SubmitButton className={styles.buttonSecondary}>Asociar</SubmitButton>
        </form>
      </section>

      <form action={deleteUniverseEntryAction.bind(null, entry.id)}>
        <SubmitButton className={styles.danger} confirmText={`¿Borrar "${entry.title}"? No borra productos ni outfits.`}>
          Borrar entrada
        </SubmitButton>
      </form>
    </div>
  );
}
