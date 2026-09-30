import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductBySlug, getProductMeasurements } from "@/services/catalog";
import { getSiteSettings } from "@/services/site";
import { DELIVERY_INFO, EXCHANGE_POLICY, SIZE_GUIDE } from "@/lib/storefront/content";
import { buildWhatsAppHref, productInquiryMessage } from "@/lib/storefront/whatsapp";
import { ProductPurchasePanel } from "@/components/storefront/ProductPurchasePanel";
import { formatPrice } from "@/lib/format";
import styles from "./page.module.css";

// Ficha de producto (Bible §16): fotos grandes, nombre (japonés), tipo,
// precio, color, talle, stock, descripción, medidas reales, composición,
// envíos, cambios/devoluciones y WhatsApp contextual.
export default async function ProductoPage({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const product = await getProductBySlug(supabase, slug);

  if (!product) {
    notFound();
  }

  const [measurements, site] = await Promise.all([getProductMeasurements(supabase, product.id), getSiteSettings(supabase)]);

  return (
    <main className={styles.main}>
      <div className={styles.gallery}>
        {product.images.length > 0 ? (
          product.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element -- sin next/image todavía: no hay bucket de Storage configurado, ver services/catalog.
            <img key={image.id} src={image.url} alt={image.altText ?? product.name} className={styles.image} />
          ))
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}
      </div>

      <div className={styles.info}>
        {product.category && <span className={styles.category}>{product.category.name}</span>}
        <h1>{product.name}</h1>
        {product.productType && <p className={styles.type}>{product.productType}</p>}
        <p className={styles.price}>{formatPrice(product.price)}</p>

        <ProductPurchasePanel product={product} whatsappNumber={site.whatsappNumber} />

        {product.description && (
          <section className={styles.block}>
            <h2>Descripción</h2>
            <p className={styles.description}>{product.description}</p>
          </section>
        )}

        {product.composition && (
          <section className={styles.block}>
            <h2>Composición</h2>
            <p>{product.composition}</p>
          </section>
        )}

        <section className={styles.block} id="medidas">
          <h2>Medidas y talles</h2>
          <p>{SIZE_GUIDE.intro}</p>
          {measurements ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption>Medidas reales de esta prenda, en centímetros</caption>
                <thead>
                  <tr>
                    <th scope="col">Talle</th>
                    {measurements.labels.map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measurements.rows.map((row) => (
                    <tr key={row.sizeId ?? "unico"}>
                      <th scope="row">{row.sizeName ?? "Único"}</th>
                      {measurements.labels.map((label) => (
                        <td key={label}>{row.values[label] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.muted}>Las medidas de esta prenda todavía no están cargadas.</p>
          )}
          <p>{SIZE_GUIDE.howToCompare}</p>
          {site.whatsappNumber && (
            <p>
              <a
                href={buildWhatsAppHref(site.whatsappNumber, productInquiryMessage({ productName: product.name }))}
                target="_blank"
                rel="noopener noreferrer"
              >
                ¿Dudas con el talle? Escribinos por WhatsApp
              </a>
            </p>
          )}
        </section>

        <section className={styles.block}>
          <h2>Envíos</h2>
          <p>{DELIVERY_INFO.methods.join(" · ")}</p>
          <ul>
            {DELIVERY_INFO.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h2>Cambios y devoluciones</h2>
          <ul>
            {EXCHANGE_POLICY.conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
          <ul>
            {EXCHANGE_POLICY.shippingCosts.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
