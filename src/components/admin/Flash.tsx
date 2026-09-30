import styles from "./admin.module.css";

/** Mensajes ?error= / ?success= del patrón de formularios de Admin. */
export function Flash({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const success = typeof searchParams.success === "string";
  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {success && !error && (
        <p className={styles.success} role="status">
          Cambios guardados.
        </p>
      )}
    </>
  );
}
