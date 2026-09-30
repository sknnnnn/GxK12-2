import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/services/site";
import { buildImageUrl } from "@/services/catalog";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import styles from "@/components/admin/admin.module.css";
import { removeHeroImageAction, saveContentTextsAction, uploadHeroImageAction } from "./actions";

// Contenido del sitio sin código (Bible §38.11): hero de Home, textos de
// las secciones de entrada, Nosotros (Bible §30) y Help (Bible §31). Vacío =
// la sección no muestra ese texto (nunca se completa con texto inventado).
export default async function AdminContenidoPage(props: PageProps<"/admin/contenido">) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const content = await getSiteContent(supabase);
  const heroUrl = content.heroImagePath ? buildImageUrl(supabase, content.heroImagePath) : null;

  return (
    <div className={styles.page}>
      <h1>Contenido</h1>
      <Flash searchParams={searchParams} />

      <section className={styles.card}>
        <h2>Hero de Home: imagen</h2>
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que Productos.
          <img src={heroUrl} alt={content.heroImageAlt ?? ""} style={{ maxWidth: 360 }} />
        ) : (
          <p className={styles.muted}>Sin imagen: el hero muestra solo marca, slogan y accesos.</p>
        )}
        <form action={uploadHeroImageAction} className={styles.row}>
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
          <SubmitButton className={styles.buttonSecondary} pendingText="Subiendo…">
            {heroUrl ? "Reemplazar imagen" : "Subir imagen"}
          </SubmitButton>
        </form>
        {heroUrl && (
          <form action={removeHeroImageAction}>
            <SubmitButton className={styles.danger} confirmText="¿Quitar la imagen del hero?">
              Quitar imagen
            </SubmitButton>
          </form>
        )}
      </section>

      <form action={saveContentTextsAction} className={`${styles.card} ${styles.form}`}>
        <h2>Textos</h2>
        <label className={styles.field}>
          Texto alternativo de la imagen del hero (accesibilidad)
          <input name="heroImageAlt" defaultValue={content.heroImageAlt ?? ""} />
        </label>
        <label className={styles.field}>
          Home — Universo
          <textarea name="universoDescription" rows={2} defaultValue={content.universoDescription ?? ""} />
        </label>
        <label className={styles.field}>
          Home — G &amp; K
          <textarea name="gkDescription" rows={2} defaultValue={content.gkDescription ?? ""} />
        </label>
        <label className={styles.field}>
          Home — Members Only
          <textarea name="membersDescription" rows={2} defaultValue={content.membersDescription ?? ""} />
        </label>
        <label className={styles.field}>
          NOSOTROS (Bible §30: qué es GXK, por qué existe, qué significa GXK y 12:2, G/K, filosofía; sin publicar la Bible
          completa. La página cierra con el slogan.)
          <textarea name="aboutBody" rows={10} defaultValue={content.aboutBody ?? ""} />
        </label>
        <label className={styles.field}>
          Help (Bible §31). Talles, envíos, cambios y pagos ya se muestran con lo que define la Bible; acá: cómo comprar, FAQ y lo
          que quieras sumar. Separá párrafos con una línea en blanco.
          <textarea name="helpBody" rows={10} defaultValue={content.helpBody ?? ""} />
        </label>
        <SubmitButton className={styles.button}>Guardar textos</SubmitButton>
      </form>
    </div>
  );
}
