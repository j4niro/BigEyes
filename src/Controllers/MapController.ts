// controllers/MapController.ts
// controllers/MapController.ts
import type { Dispatch } from '@reduxjs/toolkit'
import { 
  addLatitudeSelected,
  addAreaSelected,
  setYearRange,
  type Latitude,
  type Area,
  type Dot
} from '../Redux/Slice/GlobalSlice'
import type { TempAnomalyData, TempAnomalyArea } from '../Redux/Slice/dataSlice' 

export type SelectionMode = 'latitude' | 'area' | null

export class MapController {
  private dispatch: Dispatch
  private selectionMode: SelectionMode = null
  private isDrawing: boolean = false
  private startPoint: Dot | null = null

  constructor(dispatch: Dispatch) {
    this.dispatch = dispatch
  }

  /**
   * Active le mode de sélection
   */
  setSelectionMode(mode: SelectionMode): void {
    this.selectionMode = mode
    this.isDrawing = false
    this.startPoint = null
  }

  /**
   * Récupère le mode de sélection actuel
   */
  getSelectionMode(): SelectionMode {
    return this.selectionMode
  }

  /**
   * Gère le clic sur la carte
   */
  handleMapClick(x: number, y: number, mapWidth: number, mapHeight: number): void {
    if (this.selectionMode === 'latitude') {
      const lat = this.convertMapYToLatitude(y, mapHeight)
      this.addLatitude(lat)
    }
  }

  /**
   * Démarre la sélection de zone (mousedown)
   */
  handleMouseDown(x: number, y: number): void {
    if (this.selectionMode === 'area') {
      this.isDrawing = true
      this.startPoint = { x, y }
    }
  }

  /**
   * Termine la sélection de zone (mouseup)
   */
  handleMouseUp(x: number, y: number, mapWidth: number, mapHeight: number): void {
    if (this.selectionMode === 'area' && this.isDrawing && this.startPoint) {
      this.isDrawing = false
      
      // Créer la zone rectangulaire
      const area: Area = {
        id: 0, // sera mis à jour par le reducer
        name: `Area ${Date.now()}`,
        topLeft: {
          x: Math.min(this.startPoint.x, x),
          y: Math.min(this.startPoint.y, y)
        },
        bottomRight: {
          x: Math.max(this.startPoint.x, x),
          y: Math.max(this.startPoint.y, y)
        }
      }

      this.dispatch(addAreaSelected(area))
      this.startPoint = null
    }
  }

  /**
   * Ajoute une latitude depuis un clic sur la carte
   */
  private addLatitude(lat: number): void {
    // Arrondir à la grille 4x4
    const roundedLat = Math.round(lat / 4) * 4
    const clampedLat = Math.max(-88, Math.min(88, roundedLat))

    const latitude: Latitude = {
      id: 0,
      lat: clampedLat
    }
    
    this.dispatch(addLatitudeSelected(latitude))
  }

  /**
   * Convertit une coordonnée Y de la carte en latitude
   */
  convertMapYToLatitude(y: number, mapHeight: number): number {
    // Projection équirectangulaire
    // y = 0 → lat = 90°
    // y = mapHeight → lat = -90°
    const lat = 90 - (y / mapHeight) * 180
    return Math.round(lat / 4) * 4
  }

  /**
   * Convertit une latitude en coordonnée Y sur la carte
   */
  convertLatitudeToMapY(lat: number, mapHeight: number): number {
    // lat = 90° → y = 0
    // lat = -90° → y = mapHeight
    return ((90 - lat) / 180) * mapHeight
  }

  /**
   * Convertit une coordonnée X de la carte en longitude
   */
  convertMapXToLongitude(x: number, mapWidth: number): number {
    // x = 0 → lon = -180°
    // x = mapWidth → lon = 180°
    const lon = (x / mapWidth) * 360 - 180
    return Math.round(lon / 4) * 4
  }

  /**
   * Convertit une longitude en coordonnée X sur la carte
   */
  convertLongitudeToMapX(lon: number, mapWidth: number): number {
    // lon = -180° → x = 0
    // lon = 180° → x = mapWidth
    return ((lon + 180) / 360) * mapWidth
  }

  /**
   * Récupère les données d'anomalie pour une zone et une année spécifiques
   */
  getAnomalyDataForArea(
    area: Area,
    year: number,
    tempData: TempAnomalyData,
    mapWidth: number,
    mapHeight: number
  ): TempAnomalyArea[] {
    // Convertir les coordonnées de la zone en lat/lon
    const topLat = this.convertMapYToLatitude(area.topLeft.y, mapHeight)
    const bottomLat = this.convertMapYToLatitude(area.bottomRight.y, mapHeight)
    const leftLon = this.convertMapXToLongitude(area.topLeft.x, mapWidth)
    const rightLon = this.convertMapXToLongitude(area.bottomRight.x, mapWidth)

    // Filtrer les données dans la zone
    return tempData.tempanomalies.filter(item => {
      return (
        item.lat >= Math.min(topLat, bottomLat) &&
        item.lat <= Math.max(topLat, bottomLat) &&
        item.lon >= Math.min(leftLon, rightLon) &&
        item.lon <= Math.max(leftLon, rightLon)
      )
    })
  }

  /**
   * Récupère les données d'anomalie pour une latitude et une année spécifiques
   */
  getAnomalyDataForLatitude(
    lat: number,
    year: number,
    tempData: TempAnomalyData
  ): TempAnomalyArea[] {
    // Récupérer toutes les données à cette latitude
    return tempData.tempanomalies.filter(item => item.lat === lat)
  }

  /**
   * Récupère la valeur d'anomalie pour une coordonnée et une année
   */
  getAnomalyValueAt(
    lat: number,
    lon: number,
    year: number,
    tempData: TempAnomalyData
  ): number | null {
    const area = tempData.tempanomalies.find(
      item => item.lat === lat && item.lon === lon
    )

    if (!area) return null

    const yearData = area.data.find(d => d.year === year)
    if (!yearData || yearData.value === "NA") return null

    return typeof yearData.value === 'number' ? yearData.value : parseFloat(yearData.value)
  }

  /**
   * Calcule la moyenne des anomalies pour une zone et une année
   */
  calculateAverageAnomaly(
    areas: TempAnomalyArea[],
    year: number
  ): number | null {
    const values: number[] = []

    areas.forEach(area => {
      const yearData = area.data.find(d => d.year === year)
      if (yearData && yearData.value !== "NA") {
        const value = typeof yearData.value === 'number' 
          ? yearData.value 
          : parseFloat(yearData.value)
        if (!isNaN(value)) {
          values.push(value)
        }
      }
    })

    if (values.length === 0) return null

    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Obtient la couleur pour une valeur d'anomalie
   * Échelle de couleur : bleu (froid) → blanc (neutre) → rouge (chaud)
   */
  getColorForAnomaly(value: number | null): string {
    if (value === null) return 'rgba(200, 200, 200, 0.3)' // Gris pour données manquantes

    // Échelle de -4°C à +4°C
    const normalizedValue = Math.max(-4, Math.min(4, value)) / 4

    if (normalizedValue < 0) {
      // Bleu pour températures froides
      const intensity = Math.abs(normalizedValue)
      return `rgba(0, 100, 255, ${intensity * 0.7})`
    } else {
      // Rouge pour températures chaudes
      const intensity = normalizedValue
      return `rgba(255, 50, 0, ${intensity * 0.7})`
    }
  }

  /**
   * Nettoie l'état du contrôleur
   */
  reset(): void {
    this.selectionMode = null
    this.isDrawing = false
    this.startPoint = null
  }

  /**
   * Vérifie si on est en train de dessiner une zone
   */
  isCurrentlyDrawing(): boolean {
    return this.isDrawing
  }

  /**
   * Récupère le point de départ du dessin
   */
  getStartPoint(): Dot | null {
    return this.startPoint
  }
}