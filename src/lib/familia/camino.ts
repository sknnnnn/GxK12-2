// Camino G & K (Bible §25; Roadmap Bloque 6). Lógica pura, sin Supabase.
//
// 10 estaciones. 1 compra confirmada = 1 estación (no importa la cantidad
// de prendas). Estación 5 = 20% OFF; estación 10 = hasta 50% OFF, sujetos a
// condiciones, límites y margen (todavía no definidos). Luego se reinicia.

export const CAMINO_STATIONS = 10;
export const CAMINO_REWARD_STATIONS = [5, 10] as const;
/** Bible §25: estación 5 = 20% OFF. */
export const STATION_5_PERCENT = 20;
/** Bible §25: estación 10 = "hasta" 50% OFF. */
export const STATION_10_MAX_PERCENT = 50;

export type CaminoPosition = {
  /** Vuelta actual del Camino (empieza en 1). */
  cycle: number;
  /** Estación alcanzada en la vuelta actual (0 = todavía en el inicio). */
  station: number;
  /** Compras que faltan para la próxima estación con beneficio. */
  toNextReward: number;
  nextRewardStation: 5 | 10;
};

/**
 * Posición en el Camino según las compras confirmadas. Al completar la
 * estación 10 se queda ahí hasta la próxima compra, que abre una nueva
 * vuelta en la estación 1.
 */
export function caminoPosition(confirmedPurchases: number): CaminoPosition {
  const count = Math.max(0, Math.floor(confirmedPurchases));
  const cycle = count === 0 ? 1 : Math.floor((count - 1) / CAMINO_STATIONS) + 1;
  const station = count - (cycle - 1) * CAMINO_STATIONS;
  const nextRewardStation = station < 5 ? 5 : station < 10 ? 10 : 5;
  const toNextReward = station < 10 ? nextRewardStation - station : CAMINO_STATIONS - station + 5;
  return { cycle, station, toNextReward, nextRewardStation };
}

export type CaminoSettingsView = {
  rewardsEnabled: boolean;
  station10Percent: number | null;
  maxDiscountAmount: number | null;
  conditions: string | null;
};

/** Porcentaje del beneficio de una estación, o null si todavía no está configurado. */
export function rewardPercent(station: number, settings: CaminoSettingsView): number | null {
  if (station === 5) return STATION_5_PERCENT;
  if (station === 10) return settings.station10Percent;
  return null;
}

/** Un beneficio se puede usar solo si el admin habilitó los beneficios y su porcentaje está definido. */
export function isRewardUsable(station: number, settings: CaminoSettingsView): boolean {
  return settings.rewardsEnabled && rewardPercent(station, settings) !== null;
}
