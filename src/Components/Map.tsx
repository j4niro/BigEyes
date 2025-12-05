import React, { useState, useMemo, useRef, useEffect } from 'react'
import './Map.css'
import { useAppDispatch, useAppSelector } from '../Redux/Hooks/StoreHooks'
import { MapController } from '../Controllers/MapController'
import { AnimationController } from '../Controllers/AnimationController'
import { AnomalyCanvas } from './AnomalyCanvas'
import plus10 from '../../public/+10button.png'
import moins10 from '../../public/-10button.png'
import pause from  '../../public/Pause_Sign.png'
import start from '../../public/Play_button_arrowhead.png'
import gostart from '../../public/gostart_button.png'
import goend from '../../public/goend_button.png'
import earthImage from '../../public/earth.png'
import { setYearRange } from '../Redux/Slice/GlobalSlice'

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
  
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{x: number, y: number} | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<1 | 2 | 5 | 10>(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  const mapController = useMemo(() => new MapController(dispatch), [dispatch])
  const animationController = useMemo(() => new AnimationController(dispatch), [dispatch])

  useEffect(() => {
    mapController.setSelectionMode(currentSelectionMode)
  }, [currentSelectionMode, mapController])

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

  useEffect(() => {
    return () => {
      animationController.cleanup()
    }
  }, [animationController])

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value)
    setCurrentYear(year)
    dispatch(setYearRange({ start: year, end: year }))
  }

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    mapController.handleMapClick(x, y, mapDimensions.width, mapDimensions.height)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || currentSelectionMode !== 'area') return
    const rect = mapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setDragStart({ x, y })
    setDragCurrent({ x, y })
    mapController.handleMouseDown(x, y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || !dragStart || currentSelectionMode !== 'area') return
    const rect = mapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setDragCurrent({ x, y })
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    mapController.handleMouseUp(x, y, mapDimensions.width, mapDimensions.height)
    setDragStart(null)
    setDragCurrent(null)
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      animationController.pause()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      animationController.play(currentYear, (year) => {
        setCurrentYear(year)
      })
    }
  }

  const handlePrevious10 = () => {
    if (isPlaying) {
      animationController.pause()
      setIsPlaying(false)
    }
    animationController.previous10Years(currentYear)
  }

  const handleNext10 = () => {
    if (isPlaying) {
      animationController.pause()
      setIsPlaying(false)
    }
    animationController.next10Years(currentYear)
  }

  const handleGoToStart = () => {
    if (isPlaying) {
      animationController.pause()
      setIsPlaying(false)
    }
    animationController.goToStart()
  }

  const handleGoToEnd = () => {
    if (isPlaying) {
      animationController.pause()
      setIsPlaying(false)
    }
    animationController.goToEnd()
  }

  const handleSpeedChange = (newSpeed: 1 | 2 | 5 | 10) => {
    setSpeed(newSpeed)
    animationController.setSpeed(newSpeed)
    setShowSpeedMenu(false)
    if (isPlaying) {
      animationController.pause()
      animationController.play(currentYear, (year) => {
        setCurrentYear(year)
      })
    }
  }

  const yearPercentage = ((currentYear - 1880) / (2025 - 1880)) * 100

  const latitudeGraduations = useMemo(() => {
    const grads = []
    for (let lat = 88; lat >= -88; lat -= 20) {
      const y = ((90 - lat) / 180) * 100
      grads.push({ lat, y })
    }
    return grads
  }, [])

  const longitudeGraduations = useMemo(() => {
    const grads = []
    for (let lon = -180; lon <= 180; lon += 20) {
      const x = ((lon + 180) / 360) * 100
      grads.push({ lon, x })
    }
    return grads
  }, [])

  // Données pour la légende
  const legendData = [
    { label: '< -3°C', color: 'rgb(0, 10, 100)' },
    { label: '-2.5°C', color: 'rgb(0, 40, 160)' },
    { label: '-2°C', color: 'rgb(0, 80, 200)' },
    { label: '-1.5°C', color: 'rgb(30, 120, 240)' },
    { label: '-1°C', color: 'rgb(60, 160, 255)' },
    { label: '-0.5°C', color: 'rgb(120, 200, 255)' },
    { label: '0°C', color: 'rgb(255, 255, 255)' },
    { label: '+1°C', color: 'rgb(255, 245, 120)' },
    { label: '+1.5°C', color: 'rgb(255, 220, 80)' },
    { label: '+2°C', color: 'rgb(255, 190, 50)' },
    { label: '+2.5°C', color: 'rgb(255, 140, 30)' },
    { label: '+3°C', color: 'rgb(240, 100, 20)' },
    { label: '> +4°C', color: 'rgb(180, 20, 40)' },
  ]

  return (
    <div className='map-container'>
      <div 
        className='map-wrapper'
        ref={mapRef}
        onClick={handleMapClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setDragStart(null)
          setDragCurrent(null)
        }}
        style={{ cursor: currentSelectionMode ? 'crosshair' : 'default' }}
      >
        {mapDimensions.width > 0 && (
          <AnomalyCanvas
            year={currentYear}
            tempData={tempData}
            width={mapDimensions.width}
            height={mapDimensions.height}
            earthImageSrc={earthImage}
          />
        )}

        <div className='latitude-grid'>
          {latitudeGraduations.map(({ lat, y }) => (
            <div key={lat} className='latitude-line' style={{top: `${y}%`}}>
              <span className='latitude-label'>{lat}°</span>
            </div>
          ))}
        </div>

        <div className='longitude-grid'>
          {longitudeGraduations.map(({ lon, x }) => (
            <div key={lon} className='longitude-line' style={{left: `${x}%`}}>
              <span className='longitude-label'>{lon}°</span>
            </div>
          ))}
        </div>

        {selectedLatitudes.map(latitude => {
          const y = mapController.convertLatitudeToMapY(latitude.lat, mapDimensions.height)
          return (
            <div
              key={latitude.id}
              style={{
                position: 'absolute',
                top: `${y}px`,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#FF4444',
                boxShadow: '0 0 8px rgba(255, 68, 68, 0.8)',
                pointerEvents: 'none',
                zIndex: 20
              }}
            />
          )
        })}

        {selectedAreas.map(area => (
          <div
            key={area.id}
            style={{
              position: 'absolute',
              left: `${area.topLeft.x}px`,
              top: `${area.topLeft.y}px`,
              width: `${area.bottomRight.x - area.topLeft.x}px`,
              height: `${area.bottomRight.y - area.topLeft.y}px`,
              border: '2px solid #00FF00',
              backgroundColor: 'rgba(0, 255, 0, 0.15)',
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.6)',
              pointerEvents: 'none',
              zIndex: 20
            }}
          />
        ))}

        {dragStart && dragCurrent && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(dragStart.x, dragCurrent.x)}px`,
              top: `${Math.min(dragStart.y, dragCurrent.y)}px`,
              width: `${Math.abs(dragCurrent.x - dragStart.x)}px`,
              height: `${Math.abs(dragCurrent.y - dragStart.y)}px`,
              border: '2px dashed #00FF00',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              pointerEvents: 'none',
              zIndex: 25,
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.4)'
            }}
          />
        )}

        {/* Légende des couleurs */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 30,
            fontSize: '11px',
            fontFamily: 'montserrat, sans-serif',
            color:'black'
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            fontSize: '12px',
            textAlign: 'center'
          }}>
            Anomalie de température
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {legendData.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '20px',
                    height: '12px',
                    backgroundColor: item.color,
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '2px'
                  }}
                />
                <span style={{ minWidth: '50px' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='year-navigation'>
        <div className='year-slider-container'>
          <div className='year-label' style={{ left: `calc(${yearPercentage}% - 20px)` }}>
            {currentYear}
          </div>
          <div className='year-graduations'>
            {Array.from({length: 146}).map((_, i) => {
              const year = 1880 + i
              const isMajor = year % 10 === 0
              return <div key={year} className={`graduation ${isMajor ? 'major' : ''}`} />
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

      <div className='animation-controls'>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            style={{ 
              background: '#d9d9d9', 
              borderRadius: '4px',
              boxShadow: '0 4px 4px rgba(0, 0, 0, 0.4)',
              border: 'none', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: 'black',
              width: '100%',
              height: '34px',
            }}
          >
            Speed : {speed}x
          </button>
          
          {showSpeedMenu && (
            <div 
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '0',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                marginBottom: '5px',
                zIndex: 100
              }}
            >
              {[1, 2, 5, 10].map(s => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s as 1 | 2 | 5 | 10)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 20px',
                    border: 'none',
                    background: speed === s ? '#5a6b56' : 'white',
                    color: speed === s ? 'white' : 'black',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
    
        <div className='control-section playback-controls'>
          <button className='control-btn' onClick={handlePrevious10} title="-10 ans">
            <img src={moins10} alt="" height={21} width={21} />
          </button>
          <button className='control-btn' onClick={handleGoToStart} title="Début (1880)">
            <img src={gostart} alt="" />
          </button>
          <button className='control-btn play-btn' onClick={handlePlayPause} title={isPlaying ? "Pause" : "Play"}>
            <img src={isPlaying ? pause : start} alt="" />
          </button>
          <button className='control-btn' onClick={handleGoToEnd} title="Fin (2025)">
            <img src={goend} alt=""  />
          </button>
          <button className='control-btn' onClick={handleNext10} title="+10 ans">
            <img src={plus10} alt="" height={21} width={21} />
          </button>
        </div>

        <button className='control-section zoom-section'>
          Zoom
        </button>
      </div>
    </div>
  )
}