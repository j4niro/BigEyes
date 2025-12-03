// components/AnomalyCanvas.tsx - VERSION FINALE OPTIMISÉE
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

  useEffect(() => {
    if (!canvasRef.current || !overlayCanvasRef.current || width === 0 || height === 0) return

    const baseCanvas = canvasRef.current
    const baseCtx = baseCanvas.getContext('2d')
    if (!baseCtx) return

    const overlayCanvas = overlayCanvasRef.current
    const overlayCtx = overlayCanvas.getContext('2d', { alpha: true })
    if (!overlayCtx) return

    const earthImage = new Image()
    earthImage.src = earthImageSrc
    
    earthImage.onload = () => {
      // Canvas 1 : Image de la Terre (NET)
      baseCtx.clearRect(0, 0, width, height)
      baseCtx.drawImage(earthImage, 0, 0, width, height)

      // Canvas 2 : Anomalies avec interpolation
      overlayCtx.clearRect(0, 0, width, height)

      const dataMap = createDataMap(tempData, year)

      // Résolution augmentée pour plus de douceur
      const resolution = 4 // Grille 4x plus dense
      const cols = 90 * resolution
      const rows = 45 * resolution
      const cellWidth = width / cols
      const cellHeight = height / rows

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const lon = -180 + ((col + 0.5) / cols) * 360
          const lat = 90 - ((row + 0.5) / rows) * 180

          const result = interpolateValueSmartly(dataMap, lat, lon)
          
          if (!result.hasData || Math.abs(result.value) < 0.08) continue

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
    }
  }, [year, tempData, width, height, earthImageSrc])

  return (
    <>
      {/* Canvas 1 : Terre (NET) */}
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
      
      {/* Canvas 2 : Anomalies (LISSÉ) */}
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
          filter: 'blur(2.5px)', // Flou légèrement augmenté
          opacity: 0.75 // Légèrement plus transparent
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

/**
 * INTERPOLATION BILINÉAIRE INTELLIGENTE
 * 
 * L'interpolation permet de créer des transitions douces entre les points de données.
 * Au lieu d'avoir des rectangles visibles (effet mosaïque), on calcule des valeurs
 * intermédiaires qui créent un dégradé continu.
 */
function interpolateValueSmartly(
  dataMap: Map<string, number>,
  lat: number,
  lon: number
): { value: number; hasData: boolean; confidence: number } {
  const latStep = 4
  const lonStep = 4

  // Trouver les 4 coins de la cellule de grille 4x4
  const lat1 = Math.floor(lat / latStep) * latStep
  const lat2 = lat1 + latStep
  const lon1 = Math.floor(lon / lonStep) * lonStep
  const lon2 = lon1 + lonStep

  // Récupérer les valeurs aux 4 coins
  const v11 = dataMap.get(`${lat1},${lon1}`) // Coin haut-gauche
  const v12 = dataMap.get(`${lat1},${lon2}`) // Coin haut-droite
  const v21 = dataMap.get(`${lat2},${lon1}`) // Coin bas-gauche
  const v22 = dataMap.get(`${lat2},${lon2}`) // Coin bas-droite

  const availableValues: { value: number }[] = []
  
  if (v11 !== undefined) availableValues.push({ value: v11 })
  if (v12 !== undefined) availableValues.push({ value: v12 })
  if (v21 !== undefined) availableValues.push({ value: v21 })
  if (v22 !== undefined) availableValues.push({ value: v22 })

  // Pas de données disponibles
  if (availableValues.length === 0) {
    return { value: 0, hasData: false, confidence: 0 }
  }

  // Données insuffisantes pour interpoler
  if (availableValues.length < 2) {
    return { 
      value: availableValues[0].value, 
      hasData: true, 
      confidence: 0.3
    }
  }

  // Facteurs d'interpolation (position relative dans la cellule)
  const fx = (lon - lon1) / lonStep // 0 = gauche, 1 = droite
  const fy = (lat - lat1) / latStep // 0 = haut, 1 = bas

  // Interpolation bilinéaire complète (4 valeurs disponibles)
  if (availableValues.length === 4) {
    // Interpolation horizontale en haut
    const v1 = v11! * (1 - fx) + v12! * fx
    // Interpolation horizontale en bas
    const v2 = v21! * (1 - fx) + v22! * fx
    // Interpolation verticale entre les deux
    const result = v1 * (1 - fy) + v2 * fy
    return { value: result, hasData: true, confidence: 1.0 }
  }

  // Moyenne simple si 2 ou 3 valeurs
  const avgValue = availableValues.reduce((sum, item) => sum + item.value, 0) / availableValues.length
  const confidence = availableValues.length / 4

  return { value: avgValue, hasData: true, confidence }
}

/**
 * Palette de couleurs AMÉLIORÉE avec transitions plus douces
 */
function getColorForValue(value: number, confidence: number): string {
  const clampedValue = Math.max(-4, Math.min(6.5, value))
  
  // Opacité basée sur la confiance des données
  const baseOpacity = 0.45 + confidence * 0.2
  
  // Palette étendue avec plus de nuances
  if (clampedValue <= -3) {
    // Bleu marine très foncé (froid extrême)
    return `rgba(0, 10, 100, ${baseOpacity + 0.2})`
  } else if (clampedValue <= -2.5) {
    // Bleu roi foncé
    return `rgba(0, 40, 160, ${baseOpacity + 0.18})`
  } else if (clampedValue <= -2) {
    // Bleu roi
    return `rgba(0, 80, 200, ${baseOpacity + 0.15})`
  } else if (clampedValue <= -1.5) {
    // Bleu vif
    return `rgba(30, 120, 240, ${baseOpacity + 0.12})`
  } else if (clampedValue <= -1) {
    // Bleu moyen
    return `rgba(60, 160, 255, ${baseOpacity + 0.08})`
  } else if (clampedValue <= -0.5) {
    // Bleu clair / cyan
    return `rgba(120, 200, 255, ${baseOpacity})`
  } else if (clampedValue < 0.5) {
    // Neutre (quasi invisible)
    return `rgba(255, 255, 255, ${baseOpacity - 0.3})`
  } else if (clampedValue < 1) {
    // Jaune pâle
    return `rgba(255, 245, 120, ${baseOpacity})`
  } else if (clampedValue < 1.5) {
    // Jaune
    return `rgba(255, 220, 80, ${baseOpacity + 0.05})`
  } else if (clampedValue < 2) {
    // Jaune-orange
    return `rgba(255, 190, 50, ${baseOpacity + 0.08})`
  } else if (clampedValue < 2.5) {
    // Orange
    return `rgba(255, 140, 30, ${baseOpacity + 0.12})`
  } else if (clampedValue < 3) {
    // Orange foncé
    return `rgba(240, 100, 20, ${baseOpacity + 0.15})`
  } else if (clampedValue < 4) {
    // Rouge-orange
    return `rgba(220, 60, 20, ${baseOpacity + 0.18})`
  } else {
    // Rouge intense (chaud extrême)
    return `rgba(180, 20, 40, ${baseOpacity + 0.22})`
  }
}