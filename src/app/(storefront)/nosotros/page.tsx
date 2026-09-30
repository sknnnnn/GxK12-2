import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/services/site";
import { BRAND_NAME, SLOGAN } from "@/lib/storefront/content";
import { RichText } from "@/components/storefront/content/RichText";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Nosotros — GXK" };

// NOSOTROS (Bible §30): qué es GXK, por qué existe, qué significa GXK y
// 12:2, G/K, filosofía; sin publicar la Bible completa. Cierra con el slogan.
// El texto lo escribe GXK desde Admin > Contenido.
export default async function NosotrosPage() {
  const content = await getSiteContent(await createSupabaseServerClient());
  return (
    <main className={`${styles.page} ${styles.narrow}`}>
      <h1>NOSOTROS</h1>
      <p className={styles.kicker}>{BRAND_NAME}</p>
      <RichText text={content.aboutBody} />
      <p>
        <strong>{SLOGAN}</strong>
      </p>
    </main>
  );
}
