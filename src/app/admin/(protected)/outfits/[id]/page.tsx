import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminOutfit, getProductPickerOptions } from "@/services/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import styles from "@/components/admin/admin.module.css";
import {
  addOutfitProductAction,
  deleteOutfitAction,
  removeOutfitCoverAction,
  removeOutfitProductAction,
  updateOutfitAction,
  updateOutfitProductOrderAction,
  uploadOutfitCoverAction,
} from "../actions";
import { OutfitFields } from "../OutfitFields";

const PRODUCT_STATUS: Record<string, string> = { draft: "borrador", published: "publicado", hidden: "oculto", discontinued: "descontinuado" };

export default async function AdminOutfitPage(props: PageProps<"/admin/outfits/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const [outfit, products] = await Promise.all([getAdminOutfit(supabase, id), getProductPickerOptions(supabase)]);
  if (!outfit) notFound();

  return (
    <div className={styles.page}>
      <Link href="/admin/outfits">← Volver a outfits</Link>
      <h1>{outfit.name}</h1>
      <Flash searchParams={searchParams} />

      <form action={updateOutfitAction.bind(null, outfit.id)} className={`${styles.card} ${styles.form}`}>
        <OutfitFields outfit={outfit} />
        <SubmitButton className={styles.button}>Guardar</SubmitButton>
      </form>

      <section className={styles.card}>
        <h2>Portada</h2>
        {outfit.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que Productos.
          <img src={outfit.coverUrl} alt="" style={{ maxWidth: 240 }} />
        )}
        <form action={uploadOutfitCoverAction.bind(null, outfit.id, outfit.coverPath)} className={styles.row}>
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
          <SubmitButton className={styles.buttonSecondary} pendingText="Subiendo…">
            {outfit.coverUrl ? "Reemplazar portada" : "Subir portada"}
          </SubmitButton>
        </form>
        {outfit.coverPath && (
          <form action={removeOutfitCoverAction.bind(null, outfit.id, outfit.coverPath)}>
            <SubmitButton className={styles.danger} confirmText="¿Quitar la portada?">
              Quitar portada
            </SubmitButton>
          </form>
        )}
      </section>

      <section className={styles.card}>
        <h2>Productos del outfit</h2>
        <p className={styles.muted}>
          Cada pieza enlaza a su producto. Si fijás una variante, se usa esa; si no, el cliente elige talle y color.
        </p>
        {outfit.products.length === 0 ? (
          <p className={styles.muted}>Sin productos todavía.</p>
        ) : (
          <ul className={styles.list}>
            {outfit.products.map((link) => (
              <li key={link.linkId} className={styles.row}>
                <span style={{ flex: 1 }}>
                  <Link href={`/admin/productos/${link.productId}`}>{link.productName}</Link>
                  {link.variantLabel ? ` — ${link.variantLabel}` : " — cualquier variante"}
                </span>
                <form action={updateOutfitProductOrderAction.bind(null, outfit.id, link.linkId)} className={styles.row}>
                  <input type="number" name="sortOrder" defaultValue={link.sortOrder} aria-label="Orden" style={{ width: "4rem" }} />
                  <SubmitButton className={styles.buttonSecondary}>Ordenar</SubmitButton>
                </form>
                <form action={removeOutfitProductAction.bind(null, outfit.id, link.linkId)}>
                  <SubmitButton className={styles.danger} confirmText="¿Quitar este producto del outfit?">
                    Quitar
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addOutfitProductAction.bind(null, outfit.id)} className={styles.row}>
          <label className={styles.field}>
            Producto / variante
            <select name="selection" required defaultValue="">
              <option value="" disabled>
                Elegir…
              </option>
              {products.map((product) => (
                <optgroup key={product.id} label={`${product.name} (${PRODUCT_STATUS[product.status] ?? product.status})`}>
                  <option value={`${product.id}:`}>{product.name} — cualquier variante</option>
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={`${product.id}:${variant.id}`}>
                      {product.name} — {variant.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className={styles.field} style={{ maxWidth: "6rem" }}>
            Orden
            <input type="number" name="sortOrder" defaultValue={outfit.products.length} />
          </label>
          <SubmitButton className={styles.button}>Agregar</SubmitButton>
        </form>
      </section>

      <form action={deleteOutfitAction.bind(null, outfit.id, outfit.coverPath)}>
        <SubmitButton className={styles.danger} confirmText={`¿Borrar el outfit "${outfit.name}"? No borra los productos.`}>
          Borrar outfit
        </SubmitButton>
      </form>
    </div>
  );
}
