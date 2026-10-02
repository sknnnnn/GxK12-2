import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminCatalogBase } from "@/services/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import styles from "@/components/admin/admin.module.css";
import { saveCategoryAction, saveColorAction, saveSizeAction } from "./actions";

// Catálogo base: categorías (navegación de la Tienda, Bible §11), talles y
// colores (Bible §34). NUEVO y VER TODO no son categorías: los arma la Tienda.
export default async function CatalogoBasePage(props: PageProps<"/admin/catalogo-base">) {
  const searchParams = await props.searchParams;
  const { categories, sizes, colors } = await getAdminCatalogBase(await createSupabaseServerClient());

  return (
    <div className={styles.page}>
      <h1>Categorías, talles y colores</h1>
      <Flash searchParams={searchParams} />

      <section className={styles.card} id="categorias">
        <h2>Categorías</h2>
        <p className={styles.muted}>
          La Bible define REMERAS, CAMISAS, BUZOS &amp; SWEATERS, CAMPERAS, PANTALONES y ACCESORIOS. NUEVO y VER TODO los arma la
          tienda sola. El orden define el orden del menú.
        </p>
        {categories.map((category) => (
          <form key={category.id} action={saveCategoryAction.bind(null, category.id)} className={styles.row}>
            <label className={styles.field}>
              Nombre
              <input name="name" defaultValue={category.name} required />
            </label>
            <label className={styles.field}>
              Slug
              <input name="slug" defaultValue={category.slug} />
            </label>
            <label className={styles.field} style={{ maxWidth: "6rem" }}>
              Orden
              <input name="sortOrder" type="number" defaultValue={category.sortOrder} />
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="isActive" defaultChecked={category.isActive} /> Activa
            </label>
            <span className={styles.muted}>{category.productCount} productos</span>
            <SubmitButton className={styles.buttonSecondary}>Guardar</SubmitButton>
          </form>
        ))}
        <form action={saveCategoryAction.bind(null, null)} className={styles.row}>
          <label className={styles.field}>
            Nueva categoría
            <input name="name" required placeholder="Ej. REMERAS" />
          </label>
          <label className={styles.field} style={{ maxWidth: "6rem" }}>
            Orden
            <input name="sortOrder" type="number" defaultValue={categories.length + 1} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="isActive" defaultChecked /> Activa
          </label>
          <SubmitButton className={styles.button}>Agregar</SubmitButton>
        </form>
      </section>

      <section className={styles.card} id="talles">
        <h2>Talles</h2>
        <p className={styles.muted}>El orden define cómo se muestran en la tienda (ej. S, M, L, XL).</p>
        {sizes.map((size) => (
          <form key={size.id} action={saveSizeAction.bind(null, size.id)} className={styles.row}>
            <label className={styles.field}>
              Nombre
              <input name="name" defaultValue={size.name} required />
            </label>
            <label className={styles.field} style={{ maxWidth: "6rem" }}>
              Orden
              <input name="sortOrder" type="number" defaultValue={size.sortOrder} />
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="isActive" defaultChecked={size.isActive} /> Activo
            </label>
            <SubmitButton className={styles.buttonSecondary}>Guardar</SubmitButton>
          </form>
        ))}
        <form action={saveSizeAction.bind(null, null)} className={styles.row}>
          <label className={styles.field}>
            Nuevo talle
            <input name="name" required />
          </label>
          <label className={styles.field} style={{ maxWidth: "6rem" }}>
            Orden
            <input name="sortOrder" type="number" defaultValue={sizes.length + 1} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="isActive" defaultChecked /> Activo
          </label>
          <SubmitButton className={styles.button}>Agregar</SubmitButton>
        </form>
      </section>

      <section className={styles.card} id="colores">
        <h2>Colores</h2>
        {colors.map((color) => (
          <form key={color.id} action={saveColorAction.bind(null, color.id)} className={styles.row}>
            <label className={styles.field}>
              Nombre
              <input name="name" defaultValue={color.name} required />
            </label>
            <label className={styles.field} style={{ maxWidth: "8rem" }}>
              Código (#RRGGBB)
              <input name="hexCode" defaultValue={color.hexCode ?? ""} />
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="isActive" defaultChecked={color.isActive} /> Activo
            </label>
            <SubmitButton className={styles.buttonSecondary}>Guardar</SubmitButton>
          </form>
        ))}
        <form action={saveColorAction.bind(null, null)} className={styles.row}>
          <label className={styles.field}>
            Nuevo color
            <input name="name" required />
          </label>
          <label className={styles.field} style={{ maxWidth: "8rem" }}>
            Código (#RRGGBB)
            <input name="hexCode" />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="isActive" defaultChecked /> Activo
          </label>
          <SubmitButton className={styles.button}>Agregar</SubmitButton>
        </form>
      </section>
    </div>
  );
}
