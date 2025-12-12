// controllers/SettingPanController.ts - Validation and coordinate conversion for settings panel
// AI Assistance: ~20% (Input validation patterns and coordinate transformation formulas)

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
   * Validate and update year in Redux store
   * Clamps input to valid range [1880, 2025]
   * @param yearInput - Raw string input from user
   * @returns Validation result with corrected year value
   */
  validateAndSetYear(yearInput: string): { isValid: boolean; correctedYear: number } {
    const year = parseInt(yearInput)
    
    // Handle invalid input or year before data range
    if (isNaN(year) || year < 1880) {
      this.dispatch(setYearRange({ start: 1880, end: 1880 }))
      return { isValid: false, correctedYear: 1880 }
    } 
    // Handle year after data range
    else if (year > 2025) {
      this.dispatch(setYearRange({ start: 2025, end: 2025 }))
      return { isValid: false, correctedYear: 2025 }
    } 
    // Valid year within range
    else {
      this.dispatch(setYearRange({ start: year, end: year }))
      return { isValid: true, correctedYear: year }
    }
  }

  /**
   * Add latitude from manual text input
   * Validates input and checks alignment with 4° data grid
   * @param latitudeInput - Raw string input from user
   * @returns Success status and optional error message
   */
  addLatitudeFromInput(latitudeInput: string): { success: boolean; message?: string } {
    const lat = parseFloat(latitudeInput)
    
    if (isNaN(lat)) {
      return { success: false, message: "Invalid value" }
    }
    
    // Check latitude bounds (poles excluded due to data limitations)
    if (lat < -88 || lat > 88 ) {
      return { success: false, message: "Latitude must be between -88° and 88°" }
    }
    // Enforce 4° grid alignment (data availability constraint)
    else if(lat % 4 !== 0){
      return { success: false, message: "Latitude does not exist in dataset" }
    }

    const latitude: Latitude = {
      id: 0, // Will be assigned by Redux reducer
      lat: lat
    }
    
    this.dispatch(addLatitudeSelected(latitude))
    return { success: true }
  }

  /**
   * Add latitude from map click in "Latitude select" mode
   * Automatically snaps to nearest 4° grid point
   * @param lat - Raw latitude value from click coordinates
   */
  addLatitudeFromMapClick(lat: number): void {
    // Snap to 4° grid (data is available at 4° resolution)
    const roundedLat = Math.round(lat / 4) * 4
    
    // Clamp to valid range [-88, 88]
    const clampedLat = Math.max(-88, Math.min(88, roundedLat))

    const latitude: Latitude = {
      id: 0, // Will be assigned by Redux reducer
      lat: clampedLat
    }
    
    this.dispatch(addLatitudeSelected(latitude))
  }

  /**
   * Remove selected latitude line from map
   * @param latitudeId - Unique identifier of latitude to remove
   */
  removeLatitude(latitudeId: number): void {
    this.dispatch(deleteLatitudeSelected(latitudeId))
  }

  /**
   * Check if latitude is already selected to prevent duplicates
   * @param lat - Latitude value to check
   * @param selectedLatitudes - Current list of selected latitudes
   * @returns True if latitude already exists in selection
   */
  isLatitudeAlreadySelected(lat: number, selectedLatitudes: Latitude[]): boolean {
    return selectedLatitudes.some(latitude => latitude.lat === lat)
  }

  /**
   * Convert pixel Y coordinate to geographic latitude
   * Uses simple equirectangular projection
   * @param y - Pixel Y coordinate on map
   * @param mapHeight - Total map height in pixels
   * @returns Latitude in degrees, rounded to 4° grid
   */
  convertMapYToLatitude(y: number, mapHeight: number): number {
    // Equirectangular projection:
    // y = 0 → lat = 90° (North Pole)
    // y = mapHeight → lat = -90° (South Pole)
    const lat = 90 - (y / mapHeight) * 180
    
    // Snap to 4° grid for data alignment
    return Math.round(lat / 4) * 4
  }

  /**
   * Convert geographic latitude to pixel Y coordinate
   * Inverse of convertMapYToLatitude
   * Used for drawing latitude lines on map
   * @param lat - Latitude in degrees
   * @param mapHeight - Total map height in pixels
   * @returns Pixel Y coordinate on map
   */
  convertLatitudeToMapY(lat: number, mapHeight: number): number {
    // lat = 90° → y = 0
    // lat = -90° → y = mapHeight
    return ((90 - lat) / 180) * mapHeight
  }

  /**
   * Calculate total number of selections for display badge
   * Combines latitudes and areas into single count
   * @param latitudesCount - Number of selected latitude lines
   * @param areasCount - Number of selected rectangular areas
   * @returns Total selection count
   */
  getTotalSelections(latitudesCount: number, areasCount: number): number {
    return latitudesCount + areasCount
  }
}