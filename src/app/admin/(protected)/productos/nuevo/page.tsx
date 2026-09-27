import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryOptions } from "@/services/admin";
import { ProductForm } from "../ProductForm";
import { createProductAction } from "../actions";

// Solo los campos "core" -- imágenes y variantes se agregan desde el
// editor, una vez que el producto ya existe (ver [id]/page.tsx).
export default async function NuevoProductoPage() {
  const supabase = await createSupabaseServerClient();
  const categories = await getCategoryOptions(supabase);

  return (
    <div>
      <h1>Nuevo producto</h1>
      <ProductForm action={createProductAction} categories={categories} />
    </div>
  );
}
