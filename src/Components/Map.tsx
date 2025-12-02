import React, { useState, useMemo, useRef, useEffect } from 'react'
import './Map.css'
import { useAppDispatch, useAppSelector } from '../Redux/Hooks/StoreHooks'
import { MapController } from '../Controllers/MapController'
import plus10 from '../../public/+10button.png'
import moins10 from '../../public/-10button.png'
import pause from  '../../public/Pause_Sign.png'
import start from '../../public/Play_button_arrowhead.png'
import gostart from '../../public/gostart_button.png'
import goend from '../../public/goend_button.png'

export const Map = () => {
  const dispatch = useAppDispatch()
  const tempData = useAppSelector(state => state.data.tempData)
  const selectedLatitudes = useAppSelector(state => state.globalState.selectedLatitudes)
  const selectedAreas = useAppSelector(state => state.globalState.selectedAreas)
  const yearRange = useAppSelector(state => state.globalState.yearRange)
  const currentSelectionMode = useAppSelector(state => state.globalState.currentSelectionMode)

  const mapRef = useRef<HTMLDivElement>(null)
  const [currentYear, setCurrentYear] = useState(yearRange.start)
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 })

  // Créer le contrôleur
  const controller = useMemo(() => new MapController(dispatch), [dispatch])

  // Synchroniser le mode de sélection
  useEffect(() => {
    controller.setSelectionMode(currentSelectionMode)
  }, [currentSelectionMode, controller])

  // Synchroniser l'année
  useEffect(() => {
    setCurrentYear(yearRange.start)
  }, [yearRange.start])

  // Récupérer les dimensions de la carte
  useEffect(() => {
    if (mapRef.current) {
      const updateDimensions = () => {
        setMapDimensions({
          width: mapRef.current!.clientWidth,
          height: mapRef.current!.clientHeight
        })
      }
      updateDimensions()
      window.addEventListener('resize', updateDimensions)
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentYear(parseInt(e.target.value))
  }

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return

    const rect = mapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    controller.handleMapClick(x, y, mapDimensions.width, mapDimensions.height)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return

    const rect = mapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    controller.handleMouseDown(x, y)
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return

    const rect = mapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    controller.handleMouseUp(x, y, mapDimensions.width, mapDimensions.height)
  }

  const yearPercentage = ((currentYear - 1880) / (2025 - 1880)) * 100




  return (
    <div className='map-container'>
      {/* Carte du monde */}
      <div 
        className='map-wrapper'
        ref={mapRef}
        onClick={handleMapClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ cursor: currentSelectionMode ? 'crosshair' : 'default' }}
      >
        {/* Grille de latitude */}
        <div className='latitude-grid'>
          {Array.from({length: 10}).map((_, i) => (
            <div
              key={i}
              className='latitude-line'
              style={{top: `${i * 10}%`}}
            >
              <span className='latitude-label'>{90 - i * 10}°</span>
            </div>
          ))}
        </div>

        {/* Grille de longitude */}
        <div className='longitude-grid'>
          {Array.from({length: 20}).map((_, i) => (
            <div 
              key={i} 
              className='longitude-line' 
              style={{left: `${i * 5}%`}}
            >
              <span className='longitude-label'>{i * 5}°</span>
            </div>
          ))}
        </div>

        {/* Latitudes sélectionnées */}
        {selectedLatitudes.map(latitude => {
          const y = controller.convertLatitudeToMapY(latitude.lat, mapDimensions.height)
          return (
            <div
              key={latitude.id}
              className='selected-latitude-line'
              style={{
                position: 'absolute',
                top: `${y}px`,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: 'rgba(255, 0, 0, 0.7)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            />
          )
        })}

        {/* Zones sélectionnées */}
        {selectedAreas.map(area => (
          <div
            key={area.id}
            className='selected-area'
            style={{
              position: 'absolute',
              left: `${area.topLeft.x}px`,
              top: `${area.topLeft.y}px`,
              width: `${area.bottomRight.x - area.topLeft.x}px`,
              height: `${area.bottomRight.y - area.topLeft.y}px`,
              border: '2px solid rgba(0, 255, 0, 0.8)',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />
        ))}
        {tempData?.tempanomalies.map((cell: any, index: number) => {
              const x = controller.convertLongitudeToMapX(
                cell.lon,
                mapDimensions.width
              );
              const y = controller.convertLatitudeToMapY(
                cell.lat,
                mapDimensions.height
              );

              const value = controller.getAnomalyValueAt(
                cell.lat,
                cell.lon,
                currentYear,
                tempData
              );

              const color = controller.getColorForAnomaly(value);

              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: x - 3,
                    top: y - 3,
                    width: 6,
                    height: 6,
                    backgroundColor: color,
                    borderRadius: "50%",
                    pointerEvents: "none",
                  }}
                />
              );
            })}
      </div>

      {/* Barre de navigation années */}
      <div className='year-navigation'>
        <div className='year-slider-container'>
          <div 
            className='year-label'
            style={{ left: `calc(${yearPercentage}% - 5px)` }}
          >
            {currentYear}
          </div>

          <div className='year-graduations'>
            {Array.from({length: 146}).map((_, i) => {
              const year = 1880 + i
              const isMajor = year % 10 === 0
              return (
                <div 
                  key={year} 
                  className={`graduation ${isMajor ? 'major' : ''}`}
                />
              )
            })}
          </div>
          
          <input 
            type="range" 
            className='year-slider'
            min="1880"
            max="2025"
            value={currentYear}
            onChange={handleYearChange}
            step="1"
          />
        </div>
      </div>

      {/* Barre de contrôle d'animation */}
      <div className='animation-controls'>
        <button className='control-section speed-section'>
          Speed
        </button>
    
        <div className='control-section playback-controls'>
          <button className='control-btn' title="Previous">
            <img src={plus10} alt="" height={21} width={21} />
          </button>
          <button className='control-btn' title="Rewind">
            <img src={gostart} alt="" />
          </button>
          <button className='control-btn play-btn' title="Play">
            <img src={start} alt="" />
          </button>
          <button className='control-btn' title="Pause">
            <img src={pause} alt="" />
          </button>
          <button className='control-btn' title="Fast Forward">
            <img src={goend} alt=""  />
          </button>
          <button className='control-btn' title="Next">
            <img src={moins10} alt="" height={21} width={21} />
          </button>
        </div>

        <button className='control-section zoom-section'>
          Zoom
        </button>
      </div>
    </div>
  )
}