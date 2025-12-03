// Utils/AnomalyUtils.ts
import type { TempAnomalyData, TempAnomalyArea } from "../Redux/Slice/DataSlice";

/**
 * Charge les données d’anomalie 
 */
export const loadTempAnomalyData = (json: any): TempAnomalyData => {
  return {
    tempanomalies: json.tempanomalies
  };
};

/**
 * Récupère l'entrée correspondant à un point lat/lon
 */
export const getGridCell = (
  data: TempAnomalyData,
  lat: number,
  lon: number
): TempAnomalyArea | undefined => {
  return data.tempanomalies.find(item => item.lat === lat && item.lon === lon);
};

/**
 * Récupère la valeur d'anomalie pour une année
 */
export const getAnomalyValue = (
  area: TempAnomalyArea | undefined,
  year: number
): number | null => {
  if (!area) return null;

  const entry = area.data.find(d => d.year === year);
  if (!entry || entry.value === "NA") return null;

  return typeof entry.value === "number"
    ? entry.value
    : parseFloat(entry.value);
};

/**
 * Calcule la couleur pour un pixel sur la carte
 */
export const getColorFromAnomaly = (value: number | null): string => {
  if (value === null) return "rgba(180,180,180,0.15)";

  const normalized = Math.max(-5, Math.min(5, value)) / 5;

  if (normalized < 0) {
    const k = Math.abs(normalized);
    return `rgba(0, 120, 255, ${k * 0.7})`;
  } else {
    const k = normalized;
    return `rgba(255, 70, 0, ${k * 0.7})`;
  }
};
