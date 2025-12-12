// components/AnomalyCanvas.tsx - Temperature anomaly visualization with temporal interpolation
// AI Assistance: ~15% (code structure and optimization suggestions)

import React, { useRef, useEffect } from 'react'
import type { TempAnomalyData } from '../Redux/Slice/DataSlice'

interface AnomalyCanvasProps {
  year: number
  yearProgress?: number // Interpolation factor between current and next year (0-1)
  tempData: TempAnomalyData
  width: number
  height: number
  earthImageSrc: string
}

export const AnomalyCanvas: React.FC<AnomalyCanvasProps> = ({
  year,
  yearProgress = 0,
  tempData,
  width,
  height,
  earthImageSrc
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const earthImageRef = useRef<HTMLImageElement | null>(null)

  // Load and render the base earth map image
  useEffect(() => {
    const earthImage = new Image()
    earthImage.src = earthImageSrc
    earthImage.onload = () => {
      earthImageRef.current = earthImage
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
          ctx.drawImage(earthImage, 0, 0, width, height)
        }
      }
    }
  }, [earthImageSrc, width, height])

  // Render temperature anomaly overlay with bilinear interpolation
  useEffect(() => {
    if (!overlayCanvasRef.current || width === 0 || height === 0) return

    const overlayCanvas = overlayCanvasRef.current
    const overlayCtx = overlayCanvas.getContext('2d', { 
      alpha: true,
      desynchronized: true // Performance optimization for frequent redraws
    })
    if (!overlayCtx) return

    overlayCtx.clearRect(0, 0, width, height)

    // Build data maps for current year and next year
    const dataMapCurrent = createDataMap(tempData, year)
    const dataMapNext = createDataMap(tempData, year + 1)

    // Grid resolution: higher = smoother but slower rendering
    const resolution = 3
    const cols = 90 * resolution // Longitude divisions
    const rows = 45 * resolution // Latitude divisions
    const cellWidth = width / cols
    const cellHeight = height / rows

    // Use requestAnimationFrame to prevent blocking the UI thread
    requestAnimationFrame(() => {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Convert grid coordinates to geographic coordinates
          const lon = -180 + ((col + 0.5) / cols) * 360
          const lat = 90 - ((row + 0.5) / rows) * 180

          // Get interpolated values for both years
          const resultCurrent = interpolateValueSmartly(dataMapCurrent, lat, lon)
          const resultNext = interpolateValueSmartly(dataMapNext, lat, lon)

          // Skip cells with no data at all
          if (!resultCurrent.hasData && !resultNext.hasData) continue

          // Temporal interpolation between consecutive years for smooth animation
          const valueCurrent = resultCurrent.hasData ? resultCurrent.value : 0
          const valueNext = resultNext.hasData ? resultNext.value : valueCurrent
          const interpolatedValue = valueCurrent + (valueNext - valueCurrent) * yearProgress

          // Skip near-zero values to reduce visual noise
          if (Math.abs(interpolatedValue) < 0.1) continue

          const x = col * cellWidth
          const y = row * cellHeight

          // Blend confidence values from both years
          const avgConfidence = (resultCurrent.confidence + resultNext.confidence) / 2
          const color = getColorForValue(interpolatedValue, avgConfidence)
          overlayCtx.fillStyle = color
          
          // Draw cell with slight overlap to prevent gaps
          overlayCtx.fillRect(
            Math.floor(x), 
            Math.floor(y), 
            Math.ceil(cellWidth) + 1, 
            Math.ceil(cellHeight) + 1
          )
        }
      }
    })
  }, [year, yearProgress, tempData, width, height])

  return (
    <>
      {/* Base layer: Earth map image */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5
        }}
      />
      
      {/* Overlay layer: Temperature anomaly data with blur effect */}
      <canvas
        ref={overlayCanvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 6,
          filter: 'blur(2.5px)', // Smooth out cell boundaries
          opacity: 0.75,
          willChange: 'contents' // GPU acceleration hint
        }}
      />
    </>
  )
}

/**
 * Build a lookup map of temperature values for a specific year
 * Keys are formatted as "lat,lon" for quick retrieval
 */
function createDataMap(tempData: TempAnomalyData, year: number): Map<string, number> {
  const map = new Map<string, number>()

  tempData.tempanomalies.forEach(cell => {
    const yearData = cell.data.find(d => d.year === year)
    if (!yearData || yearData.value === "NA") return

    const value = typeof yearData.value === 'number' 
      ? yearData.value 
      : parseFloat(yearData.value)

    // Round coordinates to 4-degree grid alignment
    const roundedLat = Math.round(cell.lat / 4) * 4
    const roundedLon = Math.round(cell.lon / 4) * 4
    const key = `${roundedLat},${roundedLon}`
    map.set(key, value)
  })

  return map
}

/**
 * Bilinear interpolation of temperature values from the 4°x4° grid
 * Returns interpolated value with confidence score based on available data points
 */
function interpolateValueSmartly(
  dataMap: Map<string, number>,
  lat: number,
  lon: number
): { value: number; hasData: boolean; confidence: number } {
  const latStep = 4
  const lonStep = 4

  // Find the four surrounding grid points
  const lat1 = Math.floor(lat / latStep) * latStep
  const lat2 = lat1 + latStep
  const lon1 = Math.floor(lon / lonStep) * lonStep
  const lon2 = lon1 + lonStep

  // Retrieve values from the four corners
  const v11 = dataMap.get(`${lat1},${lon1}`)
  const v12 = dataMap.get(`${lat1},${lon2}`)
  const v21 = dataMap.get(`${lat2},${lon1}`)
  const v22 = dataMap.get(`${lat2},${lon2}`)

  const availableValues: { value: number }[] = []
  
  if (v11 !== undefined) availableValues.push({ value: v11 })
  if (v12 !== undefined) availableValues.push({ value: v12 })
  if (v21 !== undefined) availableValues.push({ value: v21 })
  if (v22 !== undefined) availableValues.push({ value: v22 })

  // No data available at this location
  if (availableValues.length === 0) {
    return { value: 0, hasData: false, confidence: 0 }
  }

  // Only one data point: use it directly with low confidence
  if (availableValues.length < 2) {
    return { 
      value: availableValues[0].value, 
      hasData: true, 
      confidence: 0.3
    }
  }

  // Calculate interpolation weights based on position within grid cell
  const fx = (lon - lon1) / lonStep
  const fy = (lat - lat1) / latStep

  // Full bilinear interpolation when all four corners have data
  if (availableValues.length === 4) {
    const v1 = v11! * (1 - fx) + v12! * fx
    const v2 = v21! * (1 - fx) + v22! * fx
    const result = v1 * (1 - fy) + v2 * fy
    return { value: result, hasData: true, confidence: 1.0 }
  }

  // Partial data: use simple average with reduced confidence
  const avgValue = availableValues.reduce((sum, item) => sum + item.value, 0) / availableValues.length
  const confidence = availableValues.length / 4

  return { value: avgValue, hasData: true, confidence }
}

/**
 * Map temperature anomaly value to color with opacity based on data confidence
 * Color scale ranges from blue (cold) to red (hot)
 */
function getColorForValue(value: number, confidence: number): string {
  const clampedValue = Math.max(-4, Math.min(6.5, value))
  const baseOpacity = 0.45 + confidence * 0.2
  
  // Temperature ranges with corresponding color gradients
  if (clampedValue <= -3) {
    return `rgba(0, 10, 100, ${baseOpacity + 0.2})`
  } else if (clampedValue <= -2.5) {
    return `rgba(0, 40, 160, ${baseOpacity + 0.18})`
  } else if (clampedValue <= -2) {
    return `rgba(0, 80, 200, ${baseOpacity + 0.15})`
  } else if (clampedValue <= -1.5) {
    return `rgba(30, 120, 240, ${baseOpacity + 0.12})`
  } else if (clampedValue <= -1) {
    return `rgba(60, 160, 255, ${baseOpacity + 0.08})`
  } else if (clampedValue <= -0.5) {
    return `rgba(120, 200, 255, ${baseOpacity})`
  } else if (clampedValue < 0.5) {
    return `rgba(162, 162, 162, ${baseOpacity - 0.3})` // Near-zero: neutral gray
  } else if (clampedValue < 1) {
    return `rgba(255, 245, 120, ${baseOpacity})`
  } else if (clampedValue < 1.5) {
    return `rgba(255, 220, 80, ${baseOpacity + 0.05})`
  } else if (clampedValue < 2) {
    return `rgba(255, 190, 50, ${baseOpacity + 0.08})`
  } else if (clampedValue < 2.5) {
    return `rgba(255, 140, 30, ${baseOpacity + 0.12})`
  } else if (clampedValue < 3) {
    return `rgba(240, 100, 20, ${baseOpacity + 0.15})`
  } else if (clampedValue < 4) {
    return `rgba(220, 60, 20, ${baseOpacity + 0.18})`
  } else {
    return `rgba(180, 20, 40, ${baseOpacity + 0.22})` // Extreme heat: dark red
  }
}