import styles from "./content.module.css";

/** YouTube / Vimeo se embeben; cualquier otro enlace se abre aparte. */
export function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v") ?? (parsed.pathname.startsWith("/shorts/") ? parsed.pathname.split("/")[2] : null);
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parsed.pathname.slice(1))}`;
    if (host === "vimeo.com" && /^\/\d+/.test(parsed.pathname)) return `https://player.vimeo.com/video/${parsed.pathname.split("/")[1]}`;
    return null;
  } catch {
    return null;
  }
}

export function VideoEmbed({ url, title }: { url: string | null; title: string }) {
  if (!url) return null;
  const embed = toEmbedUrl(url);
  if (!embed) {
    return (
      <p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Ver video
        </a>
      </p>
    );
  }
  return (
    <div className={styles.video}>
      <iframe src={embed} title={title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
    </div>
  );
}
