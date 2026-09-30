import { HOME_ENTRY_SECTIONS } from "@/lib/storefront/content";
import { formatDateAR } from "@/lib/datetime";
import type { UniverseEntrySummary } from "@/services/universe";
import { EntryCard } from "@/components/storefront/content/EntryCard";
import { HomeEntrySection } from "./HomeEntrySection";
import styles from "./sections.module.css";

// Universo (Bible §15, punto 4; §26): lo último publicado del archivo creativo.
export function UniversoSection({ entries, description }: { entries: UniverseEntrySummary[]; description: string | null }) {
  return (
    <HomeEntrySection config={HOME_ENTRY_SECTIONS.universo} description={description}>
      {entries.length > 0 && (
        <div className={styles.grid}>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              href={`/universo/${entry.slug}`}
              kicker={`${entry.kindLabel} · ${formatDateAR(entry.publishedAt)}`}
              title={entry.title}
              summary={entry.summary}
              coverUrl={entry.coverUrl}
            />
          ))}
        </div>
      )}
    </HomeEntrySection>
  );
}
