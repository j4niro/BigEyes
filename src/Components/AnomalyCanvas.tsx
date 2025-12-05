// components/AnomalyCanvas.tsx 
import React, { useRef, useEffect } from 'react'
import type { TempAnomalyData } from '../Redux/Slice/DataSlice'

interface AnomalyCanvasProps {
  year: number
  tempData: TempAnomalyData
  width: number
  height: number
  earthImageSrc: string
}

export const AnomalyCanvas: React.FC<AnomalyCanvasProps> = ({
  year,
  tempData,
  width,
  height,
  earthImageSrc
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const earthImageRef = useRef<HTMLImageElement | null>(null)

  // Précharger l'image de la Terre une seule fois
  useEffect(() => {
    const earthImage = new Image()
    earthImage.src = earthImageSrc
    earthImage.onload = () => {
      earthImageRef.current = earthImage
      // Dessiner la Terre une seule fois
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
          ctx.drawImage(earthImage, 0, 0, width, height)
        }
      }
    }
  }, [earthImageSrc, width, height])

  // Redessiner uniquement les anomalies quand l'année change
  useEffect(() => {
    if (!overlayCanvasRef.current || width === 0 || height === 0) return

    const overlayCanvas = overlayCanvasRef.current
    const overlayCtx = overlayCanvas.getContext('2d', { 
      alpha: true,
      desynchronized: true // Optimisation pour animations
    })
    if (!overlayCtx) return

    // Effacer le canvas overlay
    overlayCtx.clearRect(0, 0, width, height)

    const dataMap = createDataMap(tempData, year)

    // Résolution réduite pour plus de fluidité pendant l'animation
    const resolution = 3
    const cols = 90 * resolution
    const rows = 45 * resolution
    const cellWidth = width / cols
    const cellHeight = height / rows

    // Utiliser requestAnimationFrame pour un rendu plus fluide
    requestAnimationFrame(() => {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const lon = -180 + ((col + 0.5) / cols) * 360
          const lat = 90 - ((row + 0.5) / rows) * 180

          const result = interpolateValueSmartly(dataMap, lat, lon)
          
          if (!result.hasData || Math.abs(result.value) < 0.1) continue

          const x = col * cellWidth
          const y = row * cellHeight

          const color = getColorForValue(result.value, result.confidence)
          overlayCtx.fillStyle = color
          overlayCtx.fillRect(
            Math.floor(x), 
            Math.floor(y), 
            Math.ceil(cellWidth) + 1, 
            Math.ceil(cellHeight) + 1
          )
        }
      }
    })
  }, [year, tempData, width, height])

  return (
    <>
      {/* Canvas 1 : Terre (NET, dessiné une seule fois) */}
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
      
      {/* Canvas 2 : Anomalies (mis à jour à chaque année) */}
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
          filter: 'blur(2.5px)',
          opacity: 0.75,
          willChange: 'contents' // Optimisation CSS
        }}
      />
    </>
  )
}

function createDataMap(tempData: TempAnomalyData, year: number): Map<string, number> {
  const map = new Map<string, number>()

  tempData.tempanomalies.forEach(cell => {
    const yearData = cell.data.find(d => d.year === year)
    if (!yearData || yearData.value === "NA") return

    const value = typeof yearData.value === 'number' 
      ? yearData.value 
      : parseFloat(yearData.value)

    const roundedLat = Math.round(cell.lat / 4) * 4
    const roundedLon = Math.round(cell.lon / 4) * 4
    const key = `${roundedLat},${roundedLon}`
    map.set(key, value)
  })

  return map
}

function interpolateValueSmartly(
  dataMap: Map<string, number>,
  lat: number,
  lon: number
): { value: number; hasData: boolean; confidence: number } {
  const latStep = 4
  const lonStep = 4

  const lat1 = Math.floor(lat / latStep) * latStep
  const lat2 = lat1 + latStep
  const lon1 = Math.floor(lon / lonStep) * lonStep
  const lon2 = lon1 + lonStep

  const v11 = dataMap.get(`${lat1},${lon1}`)
  const v12 = dataMap.get(`${lat1},${lon2}`)
  const v21 = dataMap.get(`${lat2},${lon1}`)
  const v22 = dataMap.get(`${lat2},${lon2}`)

  const availableValues: { value: number }[] = []
  
  if (v11 !== undefined) availableValues.push({ value: v11 })
  if (v12 !== undefined) availableValues.push({ value: v12 })
  if (v21 !== undefined) availableValues.push({ value: v21 })
  if (v22 !== undefined) availableValues.push({ value: v22 })

  if (availableValues.length === 0) {
    return { value: 0, hasData: false, confidence: 0 }
  }

  if (availableValues.length < 2) {
    return { 
      value: availableValues[0].value, 
      hasData: true, 
      confidence: 0.3
    }
  }

  const fx = (lon - lon1) / lonStep
  const fy = (lat - lat1) / latStep

  if (availableValues.length === 4) {
    const v1 = v11! * (1 - fx) + v12! * fx
    const v2 = v21! * (1 - fx) + v22! * fx
    const result = v1 * (1 - fy) + v2 * fy
    return { value: result, hasData: true, confidence: 1.0 }
  }

  const avgValue = availableValues.reduce((sum, item) => sum + item.value, 0) / availableValues.length
  const confidence = availableValues.length / 4

  return { value: avgValue, hasData: true, confidence }
}

function getColorForValue(value: number, confidence: number): string {
  const clampedValue = Math.max(-4, Math.min(6.5, value))
  const baseOpacity = 0.45 + confidence * 0.2
  
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
    return `rgba(255, 255, 255, ${baseOpacity - 0.3})`
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
    return `rgba(180, 20, 40, ${baseOpacity + 0.22})`
  }
}