// controllers/MapController.ts
import type { Dispatch } from '@reduxjs/toolkit'
import { 
  addLatitudeSelected,
  addAreaSelected,
  type Latitude,
  type Area,
  type Dot
} from '../Redux/Slice/GlobalSlice'
import type { TempAnomalyData, TempAnomalyArea } from '../Redux/Slice/DataSlice'

export type SelectionMode = 'latitude' | 'area' | null

export class MapController {
  private dispatch: Dispatch
  private selectionMode: SelectionMode = null
  private isDrawing: boolean = false
  private startPoint: Dot | null = null

  constructor(dispatch: Dispatch) {
    this.dispatch = dispatch
  }

  setSelectionMode(mode: SelectionMode): void {
    this.selectionMode = mode
    this.isDrawing = false
    this.startPoint = null
  }

  getSelectionMode(): SelectionMode {
    return this.selectionMode
  }

  handleMapClick(x: number, y: number, mapWidth: number, mapHeight: number): void {
    if (this.selectionMode === 'latitude') {
      const lat = this.convertMapYToLatitude(y, mapHeight)
      this.addLatitude(lat)
    }
  }

  handleMouseDown(x: number, y: number): void {
    if (this.selectionMode === 'area') {
      this.isDrawing = true
      this.startPoint = { x, y }
    }
  }

  handleMouseUp(x: number, y: number, mapWidth: number, mapHeight: number): void {
    if (this.selectionMode === 'area' && this.isDrawing && this.startPoint) {
      this.isDrawing = false
      
      const area: Area = {
        id: 0,
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

  private addLatitude(lat: number): void {
    //const roundedLat = Math.round(lat / 4) * 4
    const roundedLat = Math.round(lat)
    const clampedLat = Math.max(-88, Math.min(88, roundedLat))

    const latitude: Latitude = {
      id: 0,
      lat: clampedLat
    }
    
    this.dispatch(addLatitudeSelected(latitude))
  }

  convertMapYToLatitude(y: number, mapHeight: number): number {
    const lat = 90 - (y / mapHeight) * 180
    return lat 
  }

  convertLatitudeToMapY(lat: number, mapHeight: number): number {
    return ((90 - lat) / 180) * mapHeight
  }

  convertMapXToLongitude(x: number, mapWidth: number): number {
    const lon = (x / mapWidth) * 360 - 180
    return Math.round(lon / 4) * 4
  }

  convertLongitudeToMapX(lon: number, mapWidth: number): number {
    return ((lon + 180) / 360) * mapWidth
  }

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
   * Palette de couleurs 
   */
  getColorForAnomaly(value: number | null): string {
    if (value === null) return 'rgba(128, 128, 128, 0.2)' // Gris transparent

    // Échelle de -3°C à +3°C (plus réaliste)
    const clampedValue = Math.max(-4, Math.min(4, value))
    const normalized = clampedValue / 3

    if (normalized < -0.1) {
      // Bleu intense pour froid
      const intensity = Math.abs(normalized)
      return `rgb(${Math.floor(50 * (1 - intensity))}, ${Math.floor(100 * (1 - intensity))}, ${255})`
    } else if (normalized > 0.1) {
      // Rouge/orange intense pour chaud
      const intensity = normalized
      return `rgb(${255}, ${Math.floor(100 * (1 - intensity))}, ${Math.floor(50 * (1 - intensity))})`
    } else {
      // Jaune/neutre pour proche de 0
      return 'rgba(255, 255, 150, 0.6)'
    }
  }

  /**
   * Calcule la taille de cellule optimale
   */
  getCellDimensions(mapWidth: number, mapHeight: number) {
    // Grille 4x4 : 90 cellules en largeur (360/4), 45 en hauteur (180/4)
    return {
      cellWidth: mapWidth / 90,
      cellHeight: mapHeight / 45
    }
  }

  reset(): void {
    this.selectionMode = null
    this.isDrawing = false
    this.startPoint = null
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing
  }

  getStartPoint(): Dot | null {
    return this.startPoint
  }
}