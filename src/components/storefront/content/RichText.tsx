import styles from "./content.module.css";

/** Texto cargado desde Admin: párrafos separados por una línea en blanco. */
export function RichText({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <div className={styles.richText}>
      {text
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
    </div>
  );
}
