import React, { useState, useMemo, useRef, useEffect } from 'react'
import './Map.css'
import { useAppDispatch, useAppSelector } from '../Redux/Hooks/StoreHooks'
import { MapController } from '../Controllers/MapController'
import { AnomalyCanvas } from './AnomalyCanvas'
import plus10 from '../../public/+10button.png'
import moins10 from '../../public/-10button.png'
import pause from  '../../public/Pause_Sign.png'
import start from '../../public/Play_button_arrowhead.png'
import gostart from '../../public/gostart_button.png'
import goend from '../../public/goend_button.png'
import earthImage from '../../public/earth.png'

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

  const controller = useMemo(() => new MapController(dispatch), [dispatch])

  useEffect(() => {
    controller.setSelectionMode(currentSelectionMode)
  }, [currentSelectionMode, controller])

  useEffect(() => {
    setCurrentYear(yearRange.start)
  }, [yearRange.start])

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

  // Générer les graduations de latitude
  const latitudeGraduations = useMemo(() => {
    const grads = []
    for (let lat = 80; lat >= -80; lat -= 20) {
      const y = ((90 - lat) / 180) * 100
      grads.push({ lat, y })
    }
    return grads
  }, [])

  // Générer les graduations de longitude
  const longitudeGraduations = useMemo(() => {
    const grads = []
    for (let lon = -150; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * 100
      grads.push({ lon, x })
    }
    return grads
  }, [])

  return (
    <div className='map-container'>
      <div 
        className='map-wrapper'
        ref={mapRef}
        onClick={handleMapClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ cursor: currentSelectionMode ? 'crosshair' : 'default' }}
      >
        {/* Canvas avec Terre + Anomalies */}
        {mapDimensions.width > 0 && (
          <AnomalyCanvas
            year={currentYear}
            tempData={tempData}
            width={mapDimensions.width}
            height={mapDimensions.height}
            earthImageSrc={earthImage}
          />
        )}

        {/* Grille de latitude */}
        <div className='latitude-grid'>
          {latitudeGraduations.map(({ lat, y }) => (
            <div
              key={lat}
              className='latitude-line'
              style={{top: `${y}%`}}
            >
              <span className='latitude-label'>{lat}°</span>
            </div>
          ))}
        </div>

        {/* Grille de longitude */}
        <div className='longitude-grid'>
          {longitudeGraduations.map(({ lon, x }) => (
            <div 
              key={lon} 
              className='longitude-line' 
              style={{left: `${x}%`}}
            >
              <span className='longitude-label'>{lon}°</span>
            </div>
          ))}
        </div>

        {/* Latitudes sélectionnées */}
        {selectedLatitudes.map(latitude => {
          const y = controller.convertLatitudeToMapY(latitude.lat, mapDimensions.height)
          return (
            <div
              key={latitude.id}
              style={{
                position: 'absolute',
                top: `${y}px`,
                left: 0,
                right: 0,
                height: '3px',
                backgroundColor: '#FFD700',
                boxShadow: '0 0 10px #FFD700, 0 0 20px #FFD700',
                pointerEvents: 'none',
                zIndex: 20
              }}
            />
          )
        })}

        {/* Zones sélectionnées */}
        {selectedAreas.map(area => (
          <div
            key={area.id}
            style={{
              position: 'absolute',
              left: `${area.topLeft.x}px`,
              top: `${area.topLeft.y}px`,
              width: `${area.bottomRight.x - area.topLeft.x}px`,
              height: `${area.bottomRight.y - area.topLeft.y}px`,
              border: '3px solid #00FF00',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              boxShadow: '0 0 15px rgba(0, 255, 0, 0.8)',
              pointerEvents: 'none',
              zIndex: 20
            }}
          />
        ))}
      </div>

      {/* Barre de navigation années */}
      <div className='year-navigation'>
        <div className='year-slider-container'>
          <div 
            className='year-label'
            style={{ left: `calc(${yearPercentage}% - 20px)` }}
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