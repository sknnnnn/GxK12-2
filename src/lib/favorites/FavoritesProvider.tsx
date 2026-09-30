"use client";

// Favoritos (Roadmap Bloque 2; Bible §23 los ubica también en Mi Casa).
// Sin cuenta: se guardan en el navegador (localStorage), igual que el
// carrito. Con sesión de Familia GxK (Bloque 6) se sincronizan con la cuenta
// vía `syncAdapter` -- el proveedor no conoce Supabase.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "gxk-favorites";

export type FavoritesSyncAdapter = {
  /** Favoritos de la cuenta; se fusionan con los locales al iniciar sesión. */
  load: () => Promise<string[]>;
  add: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
};

type FavoritesContextValue = {
  ids: string[];
  hydrated: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readLocal(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage bloqueado (modo privado): los favoritos quedan solo en memoria.
  }
}

export function FavoritesProvider({ children, syncAdapter }: { children: ReactNode; syncAdapter?: FavoritesSyncAdapter }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = readLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación desde localStorage (solo existe en el navegador).
    setIds(local);
    setHydrated(true);
    if (syncAdapter) {
      syncAdapter
        .load()
        .then(async (remote) => {
          if (cancelled) return;
          const missingRemote = local.filter((id) => !remote.includes(id));
          await Promise.all(missingRemote.map((id) => syncAdapter.add(id)));
          const merged = [...new Set([...remote, ...local])];
          setIds(merged);
          writeLocal(merged);
        })
        .catch(() => {
          // Sin conexión con la cuenta: se sigue con los favoritos locales.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [syncAdapter]);

  const toggle = useCallback(
    (productId: string) => {
      setIds((prev) => {
        const exists = prev.includes(productId);
        const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
        writeLocal(next);
        if (syncAdapter) void (exists ? syncAdapter.remove(productId) : syncAdapter.add(productId)).catch(() => {});
        return next;
      });
    },
    [syncAdapter],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ ids, hydrated, has: (productId) => ids.includes(productId), toggle }),
    [ids, hydrated, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return context;
}
