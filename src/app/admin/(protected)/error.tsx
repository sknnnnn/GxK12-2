"use client"; // Error boundaries must be Client Components

// Error inesperado en cualquier pantalla de Admin (ej. Supabase no responde).
// Se renderiza dentro del AdminShell, así la navegación sigue disponible. No
// muestra el mensaje crudo (puede tener detalles internos): solo el digest,
// que permite encontrar el error en los logs del servidor.
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert">
      <h1>No se pudo cargar esta sección</h1>
      <p>Ocurrió un error al obtener los datos. Podés reintentar o ir a otra sección desde el menú.</p>
      {error.digest && <p>Código de referencia: {error.digest}</p>}
      <button type="button" onClick={() => retry()}>
        Reintentar
      </button>
    </div>
  );
}
