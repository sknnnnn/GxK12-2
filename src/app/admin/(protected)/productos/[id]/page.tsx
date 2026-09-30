import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getAdminProductById,
  getCategoryOptions,
  getColorOptions,
  getProductMeasurementRows,
  getSizeOptions,
} from "@/services/admin";
import { ProductForm } from "../ProductForm";
import { ProductImagesManager } from "../ProductImagesManager";
import { ProductVariantsManager } from "../ProductVariantsManager";
import { ProductMeasurementsManager } from "../ProductMeasurementsManager";
import { updateProductAction } from "../actions";
import styles from "./page.module.css";

export default async function EditarProductoPage(props: PageProps<"/admin/productos/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const supabase = await createSupabaseServerClient();
  const [product, categories, sizes, colors, measurements] = await Promise.all([
    getAdminProductById(supabase, id),
    getCategoryOptions(supabase),
    getSizeOptions(supabase),
    getColorOptions(supabase),
    getProductMeasurementRows(supabase, id),
  ]);

  if (!product) {
    notFound();
  }

  const errorMessage = typeof searchParams.error === "string" ? searchParams.error : null;
  const showSuccess = searchParams.success === "1";

  return (
    <div>
      <Link href="/admin/productos">← Volver a productos</Link>
      <h1>{product.name}</h1>

      {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      {showSuccess && <p className={styles.success}>Cambios guardados.</p>}

      <ProductForm action={updateProductAction.bind(null, product.id)} categories={categories} initialProduct={product} />

      <ProductImagesManager productId={product.id} images={product.images} />

      <ProductVariantsManager productId={product.id} variants={product.variants} sizes={sizes} colors={colors} />

      <ProductMeasurementsManager productId={product.id} variants={product.variants} rows={measurements} />
    </div>
  );
}
