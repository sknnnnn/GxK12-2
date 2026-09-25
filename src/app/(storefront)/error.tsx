"use client";

// Boundary de error para todo el segmento (storefront): cubre catálogo y
// producto individual (ej. fallos de consulta a Supabase).
export default function StorefrontError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ padding: "2rem 1.5rem" }}>
      <h1>Ocurrió un error</h1>
      <p>No pudimos cargar esta página. Probá de nuevo en unos segundos.</p>
      <button type="button" onClick={() => reset()}>
        Reintentar
      </button>
    </main>
  );
}
