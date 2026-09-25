import Link from "next/link";

// Cubre tanto "el producto no existe" como "existe pero no está publicado":
// la RLS pública de products no permite distinguir ambos casos desde el
// storefront (ver services/catalog getProductBySlug), y no revelar la
// diferencia es la decisión correcta de cara al público.
export default function ProductoNoEncontrado() {
  return (
    <main style={{ padding: "2rem 1.5rem" }}>
      <h1>Producto no encontrado</h1>
      <p>Este producto no existe o ya no está disponible.</p>
      <Link href="/catalogo">Volver al catálogo</Link>
    </main>
  );
}
