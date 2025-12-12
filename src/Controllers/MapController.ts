// controllers/MapController.ts - Geographic coordinate mapping and selection handling
// AI Assistance: ~25% (coordinate transformation formulas and event handling patterns)

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

  /**
   * Programmatically select a square area centered on given coordinates
   * Used for external area selection (e.g., from graph interactions)
   * @param lat - Center latitude in degrees
   * @param lon - Center longitude in degrees
   * @param mapWidth - Current map width in pixels
   * @param mapHeight - Current map height in pixels
   * @param sizeInDegrees - Square size in degrees (default 2°)
   */
  selectSquareAtCoordinates(
    lat: number, 
    lon: number, 
    mapWidth: number, 
    mapHeight: number, 
    sizeInDegrees: number = 2
  ): void {
    // Calculate half-size to center the square on coordinates
    const halfSize = sizeInDegrees / 2;

    // Calculate geographic boundaries (clamped to valid map range)
    const latTop = Math.min(90, lat + halfSize);
    const latBottom = Math.max(-90, lat - halfSize);
    
    // Note: Longitude wrap-around at 180/-180 is simplified with clamping
    const lonLeft = Math.max(-180, lon - halfSize);
    const lonRight = Math.min(180, lon + halfSize);

    // Convert geographic coordinates to pixel coordinates
    // Important: Y-axis is inverted (0 at top = latitude 90)
    const yTop = this.convertLatitudeToMapY(latTop, mapHeight);
    const yBottom = this.convertLatitudeToMapY(latBottom, mapHeight);
    
    const xLeft = this.convertLongitudeToMapX(lonLeft, mapWidth);
    const xRight = this.convertLongitudeToMapX(lonRight, mapWidth);

    // Create area object with pixel coordinates
    const area: Area = {
      id: Date.now(), // Temporary unique ID based on timestamp
      name: `Zone ${lat.toFixed(1)}, ${lon.toFixed(1)}`,
      topLeft: { 
        x: xLeft, 
        y: yTop // Y min (visually top)
      },
      bottomRight: { 
        x: xRight, 
        y: yBottom // Y max (visually bottom)
      }
    };

    // Dispatch Redux action to add area
    this.dispatch(addAreaSelected(area));
  }

  /**
   * Set current selection mode and reset drawing state
   */
  setSelectionMode(mode: SelectionMode): void {
    this.selectionMode = mode
    this.isDrawing = false
    this.startPoint = null
  }

  /**
   * Get currently active selection mode
   */
  getSelectionMode(): SelectionMode {
    return this.selectionMode
  }

  /**
   * Handle map click events based on active selection mode
   * Latitude mode: add horizontal line at clicked Y coordinate
   */
  handleMapClick(x: number, y: number, mapWidth: number, mapHeight: number): void {
    if (this.selectionMode === 'latitude') {
      const lat = this.convertMapYToLatitude(y, mapHeight)
      this.addLatitude(lat)
    }
  }

  /**
   * Begin area selection drag operation
   */
  handleMouseDown(x: number, y: number): void {
    if (this.selectionMode === 'area') {
      this.isDrawing = true
      this.startPoint = { x, y }
    }
  }

  /**
   * Complete area selection on mouse release
   * Creates rectangular area from drag start to release point
   */
  handleMouseUp(x: number, y: number, mapWidth: number, mapHeight: number): void {
    if (this.selectionMode === 'area' && this.isDrawing && this.startPoint) {
      this.isDrawing = false
      
      // Create area with normalized corners (top-left, bottom-right)
      const area: Area = {
        id: 0, // Will be assigned by Redux
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

      this.dispatch(addAreaSelected(area));
      this.startPoint = null
    }
  }

  /**
   * Add latitude line with validation and snapping
   * Rounds to nearest degree and clamps to valid range
   * Only accepts latitudes divisible by 4 (matching data grid)
   */
  private addLatitude(lat: number): void {
    const roundedLat = Math.round(lat)
    const clampedLat = Math.max(-88, Math.min(88, roundedLat))

    // Enforce 4-degree grid alignment (data availability constraint)
    if(clampedLat % 4 !== 0) return;

    const latitude: Latitude = {
      id: 0, // Will be assigned by Redux
      lat: clampedLat
    }
    
    this.dispatch(addLatitudeSelected(latitude))
  }

  /**
   * Convert pixel Y coordinate to geographic latitude
   * Map projection: Y=0 corresponds to latitude 90° (North Pole)
   * @returns Latitude in degrees [-90, 90]
   */
  convertMapYToLatitude(y: number, mapHeight: number): number {
    const lat = 90 - (y / mapHeight) * 180
    return lat 
  }

  /**
   * Convert geographic latitude to pixel Y coordinate
   * Inverse of convertMapYToLatitude
   * @returns Y pixel position on map
   */
  convertLatitudeToMapY(lat: number, mapHeight: number): number {
    return ((90 - lat) / 180) * mapHeight
  }

  /**
   * Convert pixel X coordinate to geographic longitude
   * Rounds to nearest 4-degree grid point
   * @returns Longitude in degrees [-180, 180]
   */
  convertMapXToLongitude(x: number, mapWidth: number): number {
    const lon = (x / mapWidth) * 360 - 180
    return Math.round(lon / 4) * 4
  }

  /**
   * Convert geographic longitude to pixel X coordinate
   * Map projection: X=0 corresponds to longitude -180° (International Date Line)
   * @returns X pixel position on map
   */
  convertLongitudeToMapX(lon: number, mapWidth: number): number {
    return ((lon + 180) / 360) * mapWidth
  }

  /**
   * Retrieve temperature anomaly value for specific coordinates and year
   * @returns Anomaly value in degrees Celsius, or null if no data available
   */
  getAnomalyValueAt(
    lat: number,
    lon: number,
    year: number,
    tempData: TempAnomalyData
  ): number | null {
    // Find data cell matching coordinates
    const area = tempData.tempanomalies.find(
      item => item.lat === lat && item.lon === lon
    )

    if (!area) return null

    // Find data for requested year
    const yearData = area.data.find(d => d.year === year)
    if (!yearData || yearData.value === "NA") return null

    return typeof yearData.value === 'number' ? yearData.value : parseFloat(yearData.value)
  }

  /**
   * Generate color for temperature anomaly value
   * Color scale: blue (cold) → yellow (neutral) → red (hot)
   * @param value - Temperature anomaly in degrees Celsius
   * @returns RGB/RGBA color string
   */
  getColorForAnomaly(value: number | null): string {
    if (value === null) return 'rgba(128, 128, 128, 0.2)' // Transparent gray for no data

    // Realistic scale from -4°C to +4°C
    const clampedValue = Math.max(-4, Math.min(4, value))
    const normalized = clampedValue / 3

    if (normalized < -0.1) {
      // Intense blue for cooling
      const intensity = Math.abs(normalized)
      return `rgb(${Math.floor(50 * (1 - intensity))}, ${Math.floor(100 * (1 - intensity))}, ${255})`
    } else if (normalized > 0.1) {
      // Intense red/orange for warming
      const intensity = normalized
      return `rgb(${255}, ${Math.floor(100 * (1 - intensity))}, ${Math.floor(50 * (1 - intensity))})`
    } else {
      // Yellow/neutral for near-zero anomaly
      return 'rgba(255, 255, 150, 0.6)'
    }
  }

  /**
   * Calculate optimal cell dimensions for data grid rendering
   * Based on 4°x4° data resolution: 90 columns (360°/4°), 45 rows (180°/4°)
   */
  getCellDimensions(mapWidth: number, mapHeight: number) {
    return {
      cellWidth: mapWidth / 90,
      cellHeight: mapHeight / 45
    }
  }

  /**
   * Reset controller to initial state
   * Clears selection mode and drawing state
   */
  reset(): void {
    this.selectionMode = null
    this.isDrawing = false
    this.startPoint = null
  }

  /**
   * Check if user is currently dragging to select an area
   */
  isCurrentlyDrawing(): boolean {
    return this.isDrawing
  }

  /**
   * Get starting point of current drag operation (if any)
   */
  getStartPoint(): Dot | null {
    return this.startPoint
  }
}