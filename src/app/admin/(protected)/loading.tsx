// Estado de carga de las pantallas de Admin (todas son Server Components
// que consultan Supabase): se muestra dentro del AdminShell mientras llegan
// los datos, en vez de dejar la pantalla anterior congelada sin indicio.
export default function AdminLoading() {
  return <p aria-live="polite">Cargando…</p>;
}
