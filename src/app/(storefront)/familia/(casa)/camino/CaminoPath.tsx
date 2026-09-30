import { CAMINO_REWARD_STATIONS, CAMINO_STATIONS } from "@/lib/familia/camino";
import styles from "./camino.module.css";

// Recorrido 2D del Camino G & K (Bible §25: "No es una barra de puntos
// simple. Es un recorrido 2D acompañado por G/K"). Estructura funcional:
// estaciones en un camino serpenteante con G & K en la estación actual.
// Ilustración y estilo definitivos: Figma.
const COLUMNS = 3;
const STEP_X = 110;
const STEP_Y = 100;
const PAD = 50;

function stationPoint(index: number): { x: number; y: number } {
  const row = Math.floor(index / COLUMNS);
  const col = row % 2 === 0 ? index % COLUMNS : COLUMNS - 1 - (index % COLUMNS);
  return { x: PAD + col * STEP_X, y: PAD + (row + 1) * STEP_Y };
}

export function CaminoPath({ station }: { station: number }) {
  const start = { x: PAD, y: PAD };
  const points = Array.from({ length: CAMINO_STATIONS }, (_, index) => stationPoint(index));
  const walkers = station === 0 ? start : points[station - 1];
  const width = PAD * 2 + (COLUMNS - 1) * STEP_X;
  const height = points[points.length - 1].y + PAD;
  const path = [start, ...points].map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-labelledby="camino-title">
        <title id="camino-title">{`Camino G & K: estación ${station} de ${CAMINO_STATIONS}`}</title>
        <path d={path} className={styles.path} />
        <text x={start.x} y={start.y - 16} textAnchor="middle" className={styles.label}>
          Inicio
        </text>
        {points.map((point, index) => {
          const number = index + 1;
          const reward = (CAMINO_REWARD_STATIONS as readonly number[]).includes(number);
          return (
            <g key={number}>
              <circle cx={point.x} cy={point.y} r={reward ? 20 : 15} className={number <= station ? styles.reached : styles.station} />
              <text x={point.x} y={point.y + 5} textAnchor="middle" className={styles.number}>
                {number}
              </text>
              {reward && (
                <text x={point.x} y={point.y + 38} textAnchor="middle" className={styles.label}>
                  {number === 5 ? "20% OFF" : "hasta 50% OFF"}
                </text>
              )}
            </g>
          );
        })}
        <g aria-hidden="true">
          <text x={walkers.x} y={walkers.y - 26} textAnchor="middle" className={styles.walkers}>
            G &amp; K 🐾
          </text>
        </g>
      </svg>
    </figure>
  );
}
