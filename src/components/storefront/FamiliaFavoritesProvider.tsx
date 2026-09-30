"use client";

import { useMemo, type ReactNode } from "react";
import { FavoritesProvider, type FavoritesSyncAdapter } from "@/lib/favorites/FavoritesProvider";
import { addFavoriteAction, loadFavoritesAction, removeFavoriteAction } from "@/app/(storefront)/familia/actions";

// Favoritos: sin cuenta viven en el navegador; con sesión de Familia GxK se
// sincronizan con la cuenta (Bible §23: Favoritos en MI CASA).
export function FamiliaFavoritesProvider({ isMember, children }: { isMember: boolean; children: ReactNode }) {
  const syncAdapter = useMemo<FavoritesSyncAdapter | undefined>(
    () => (isMember ? { load: loadFavoritesAction, add: addFavoriteAction, remove: removeFavoriteAction } : undefined),
    [isMember],
  );
  return <FavoritesProvider syncAdapter={syncAdapter}>{children}</FavoritesProvider>;
}
