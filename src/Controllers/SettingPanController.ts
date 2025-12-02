// controllers/SettingPanController.ts
import type { Dispatch } from '@reduxjs/toolkit';
import { 
  addLatitudeSelected, 
  deleteLatitudeSelected, 
  setYearRange,
  type Latitude 
} from '../Redux/Slice/GlobalSlice'

export class SettingPanController {
  private dispatch: Dispatch

  constructor(dispatch: Dispatch) {
    this.dispatch = dispatch
  }

  /**
   * Valide et met à jour l'année dans Redux
   */
  validateAndSetYear(yearInput: string): { isValid: boolean; correctedYear: number } {
    const year = parseInt(yearInput)
    
    if (isNaN(year) || year < 1880) {
      this.dispatch(setYearRange({ start: 1880, end: 1880 }))
      return { isValid: false, correctedYear: 1880 }
    } else if (year > 2025) {
      this.dispatch(setYearRange({ start: 2025, end: 2025 }))
      return { isValid: false, correctedYear: 2025 }
    } else {
      this.dispatch(setYearRange({ start: year, end: year }))
      return { isValid: true, correctedYear: year }
    }
  }

  /**
   * Ajoute une latitude manuellement via l'input + bouton
   * Cette latitude sera affichée comme ligne sur la carte
   */
  addLatitudeFromInput(latitudeInput: string): { success: boolean; message?: string } {
    const lat = parseFloat(latitudeInput)
    
    if (isNaN(lat)) {
      return { success: false, message: "Valeur invalide" }
    }
    
    if (lat < -88 || lat > 88) {
      return { success: false, message: "Latitude entre -88° et 88°" }
    }

    const latitude: Latitude = {
      id: 0, // sera mis à jour par le reducer
      lat: lat
    }
    
    this.dispatch(addLatitudeSelected(latitude))
    return { success: true }
  }

  /**
   * Ajoute une latitude depuis un clic sur la carte (mode "Latitude select")
   * Arrondit à la grille 4x4
   */
  addLatitudeFromMapClick(lat: number): void {
    // Arrondir à la grille 4x4 (car les données sont en grille 4°x4°)
    const roundedLat = Math.round(lat / 4) * 4
    
    // Limiter entre -88 et 88
    const clampedLat = Math.max(-88, Math.min(88, roundedLat))

    const latitude: Latitude = {
      id: 0,
      lat: clampedLat
    }
    
    this.dispatch(addLatitudeSelected(latitude))
  }

  /**
   * Supprime une latitude sélectionnée
   */
  removeLatitude(latitudeId: number): void {
    this.dispatch(deleteLatitudeSelected(latitudeId))
  }

  /**
   * Vérifie si une latitude est déjà sélectionnée
   */
  isLatitudeAlreadySelected(lat: number, selectedLatitudes: Latitude[]): boolean {
    return selectedLatitudes.some(latitude => latitude.lat === lat)
  }

  /**
   * Convertit une coordonnée Y de la carte en latitude
   * Utilisé lors d'un clic sur la carte
   */
  convertMapYToLatitude(y: number, mapHeight: number): number {
    // Projection équirectangulaire simple
    // y = 0 → lat = 90°
    // y = mapHeight → lat = -90°
    const lat = 90 - (y / mapHeight) * 180
    
    // Arrondir à la grille 4x4
    return Math.round(lat / 4) * 4
  }

  /**
   * Convertit une latitude en coordonnée Y sur la carte
   * Utilisé pour dessiner les lignes de latitude
   */
  convertLatitudeToMapY(lat: number, mapHeight: number): number {
    // lat = 90° → y = 0
    // lat = -90° → y = mapHeight
    return ((90 - lat) / 180) * mapHeight
  }

  /**
   * Calcule le nombre total de sélections (latitudes + zones)
   */
  getTotalSelections(latitudesCount: number, areasCount: number): number {
    return latitudesCount + areasCount
  }
}