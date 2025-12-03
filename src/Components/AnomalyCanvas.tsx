// components/AnomalyCanvas.tsx
import React, { useRef, useEffect } from 'react'
import type { TempAnomalyData } from '../Redux/Slice/dataSlice'

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

  useEffect(() => {
    if (!canvasRef.current || width === 0 || height === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Charger l'image de la Terre
    const earthImage = new Image()
    earthImage.src = earthImageSrc
    
    earthImage.onload = () => {
      // Effacer le canvas
      ctx.clearRect(0, 0, width, height)
      
      // Dessiner l'image de la Terre
      ctx.drawImage(earthImage, 0, 0, width, height)

      // Calculer la taille des cellules
      const cellWidth = width / 90  // 360° / 4° = 90 cellules
      const cellHeight = height / 45 // 180° / 4° = 45 cellules

      // Dessiner les anomalies par-dessus
      tempData.tempanomalies.forEach(cell => {
        const yearData = cell.data.find(d => d.year === year)
        if (!yearData || yearData.value === "NA") return

        const value = typeof yearData.value === 'number' 
          ? yearData.value 
          : parseFloat(yearData.value)

        // Convertir lat/lon en coordonnées pixel
        const x = ((cell.lon + 180) / 360) * width
        const y = ((90 - cell.lat) / 180) * height

        // Obtenir la couleur avec transparence
        const color = getColorForValue(value)
        ctx.fillStyle = color
        
        // Dessiner un rectangle légèrement plus grand pour éviter les gaps
        ctx.fillRect(
          x - cellWidth / 2, 
          y - cellHeight / 2, 
          cellWidth + 0.5, 
          cellHeight + 0.5
        )
      })
    }
  }, [year, tempData, width, height, earthImageSrc])

  return (
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
        pointerEvents: 'none'
      }}
    />
  )
}

/**
 * Palette de couleurs pour les anomalies
 */
function getColorForValue(value: number): string {
  if (value === null) return 'rgba(0, 0, 0, 0)'

  const clampedValue = Math.max(-3, Math.min(3, value))
  const normalized = clampedValue / 3

  let r, g, b, a

  if (normalized < -0.05) {
    // Bleu pour froid
    const intensity = Math.abs(normalized)
    r = Math.floor(30 + (100 - 30) * (1 - intensity))
    g = Math.floor(100 + (200 - 100) * (1 - intensity))
    b = 255
    a = 0.5 + intensity * 0.3
  } else if (normalized > 0.05) {
    // Rouge/Orange pour chaud
    const intensity = normalized
    r = 255
    g = Math.floor(140 * (1 - intensity * 0.7))
    b = Math.floor(50 * (1 - intensity))
    a = 0.5 + intensity * 0.3
  } else {
    // Presque neutre - transparent
    return 'rgba(255, 255, 255, 0.1)'
  }

  return `rgba(${r}, ${g}, ${b}, ${a})`
}