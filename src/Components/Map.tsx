import React, { useState, useMemo, useRef, useEffect } from 'react'
import './Map.css'
import { useAppDispatch, useAppSelector } from '../Redux/Hooks/StoreHooks'
import { MapController } from '../Controllers/MapController'
import { AnimationController } from '../Controllers/AnimationController'
import { FiMaximize, FiMinimize } from "react-icons/fi";
import { AnomalyCanvas } from './AnomalyCanvas'
import plus10 from '../../public/+10button.png'
import moins10 from '../../public/-10button.png'
import pause from  '../../public/Pause_Sign.png'
import start from '../../public/Play_button_arrowhead.png'
import gostart from '../../public/gostart_button.png'
import goend from '../../public/goend_button.png'
import earthImage from '../../public/earth.png'
import { setYearRange, setMapHeight, setMapDimensions, setAreaScaledCoordinates, showGraphViewer } from '../Redux/Slice/GlobalSlice'

export const Map = () => {
  const dispatch = useAppDispatch()
  const tempData = useAppSelector(state => state.data.tempData)
  const selectedLatitudes = useAppSelector(state => state.globalState.selectedLatitudes)
  const selectedAreas = useAppSelector(state => state.globalState.selectedAreas)
  const areaGroups = useAppSelector(state => state.globalState.areaGroups)
  const yearRange = useAppSelector(state => state.globalState.yearRange)
  const currentSelectionMode = useAppSelector(state => state.globalState.currentSelectionMode)
  const mapHeight = useAppSelector(state => state.globalState.mapHeight) 
  const mapDimensions = useAppSelector(state => state.globalState.mapDimensions) 
  const showingGraphViewer = useAppSelector(state => state.globalState.showGraphViewer) 
  const areaInCache = useAppSelector(state => state.globalState.areaCached) 

  const mapWrapperRef = useRef<HTMLDivElement>(null)
  const [currentYear, setCurrentYear] = useState(yearRange.start)
  const [yearProgress, setYearProgress] = useState(0)
  
  // Dimensions de référence (première initialisation)
  const [referenceDimensions, setReferenceDimensions] = useState({ width: 0, height: 0 })
  
  // Coordonnées originales des areas à leur création
  const [originalAreaCoords, setOriginalAreaCoords] = useState<{
    [key: number]: {
      topLeft: { x: number, y: number }
      bottomRight: { x: number, y: number }
    }
  }>({})
  
  const [hoveredArea, setHoveredArea] = useState<number | null>(null)
  
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{x: number, y: number} | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  const [isResizing, setIsResizing] = useState(false)

  const mapController = useMemo(() => new MapController(dispatch), [dispatch])
  const animationController = useMemo(() => new AnimationController(dispatch), [dispatch])

  useEffect(() => {
    mapController.setSelectionMode(currentSelectionMode)
  }, [currentSelectionMode, mapController])

  useEffect(() => {
    if(!areaInCache) return;
    mapController.selectSquareAtCoordinates(areaInCache.lat, areaInCache.lon, mapDimensions.width, mapDimensions.height);
  }, [areaInCache])

  useEffect(() => {
    setCurrentYear(yearRange.start)
  }, [yearRange.start])

  // ✅ Initialiser les dimensions de référence une seule fois
  useEffect(() => {
    if (mapDimensions.width > 0 && mapDimensions.height > 0 && referenceDimensions.width === 0) {
      // console.log('Initialisation dimensions référence:', mapDimensions)
      setReferenceDimensions({
        width: mapDimensions.width,
        height: mapDimensions.height
      })
      
      // Sauvegarder les coordonnées originales des areas existantes
      const coords: typeof originalAreaCoords = {}
      selectedAreas.forEach(area => {
        coords[area.id] = {
          topLeft: { x: area.topLeft.x, y: area.topLeft.y },
          bottomRight: { x: area.bottomRight.x, y: area.bottomRight.y }
        }
        console.log(`💾 Area ${area.id} - Coords originales:`, coords[area.id])
      })
      setOriginalAreaCoords(coords)
    }
  }, [mapDimensions, referenceDimensions.width, selectedAreas])

  // ✅ Sauvegarder les coordonnées originales des nouvelles areas
  useEffect(() => {
    if (referenceDimensions.width === 0) return // Pas encore de référence
    
    selectedAreas.forEach(area => {
      if (!originalAreaCoords[area.id]) {
        console.log(`➕ Nouvelle area ${area.id} détectée, sauvegarde coords originales`)
        setOriginalAreaCoords(prev => ({
          ...prev,
          [area.id]: {
            topLeft: { x: area.topLeft.x, y: area.topLeft.y },
            bottomRight: { x: area.bottomRight.x, y: area.bottomRight.y }
          }

        }))
      }
      dispatch(setAreaScaledCoordinates(getScaledAreaCoordinates(area)));
    })
  }, [selectedAreas, originalAreaCoords, referenceDimensions.width])

  // Mettre à jour les dimensions du canvas
  useEffect(() => {
    if (mapWrapperRef.current) {
      const updateDimensions = () => {
        const rect = mapWrapperRef.current!.getBoundingClientRect()
        dispatch(setMapDimensions({
          width: rect.width,
          height: rect.height
        }))
      }
      
      updateDimensions()
      
      const resizeObserver = new ResizeObserver(updateDimensions)
      resizeObserver.observe(mapWrapperRef.current)
      
      return () => resizeObserver.disconnect()
    }
  }, [mapHeight])

  useEffect(() => {
    return () => {
      animationController.cleanup()
    }
  }, [animationController])

  // Gestion du resize
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = e.clientY
      dispatch(setMapHeight(newHeight))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, dispatch])

  // Calculer les coordonnées scalées depuis l'ORIGINAL
  const getScaledAreaCoordinates = (area: typeof selectedAreas[0]) => {
    // Pas encore de dimensions de référence
    if (referenceDimensions.width === 0 || referenceDimensions.height === 0) {
      return area
    }

    // Pas de coordonnées originales sauvegardées pour cette area
    const originalCoords = originalAreaCoords[area.id]
    if (!originalCoords) {
      return area
    }

    // Calculer le ratio depuis la RÉFÉRENCE (première taille de la map)
    const scaleX = mapDimensions.width / referenceDimensions.width
    const scaleY = mapDimensions.height / referenceDimensions.height

    const scaled = {
      ...area,
      topLeft: {
        x: originalCoords.topLeft.x * scaleX,
        y: originalCoords.topLeft.y * scaleY
      },
      bottomRight: {
        x: originalCoords.bottomRight.x * scaleX,
        y: originalCoords.bottomRight.y * scaleY
      }
    }
    return scaled
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value)
    setCurrentYear(year)
    dispatch(setYearRange({ start: year, end: year }))
  }

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapWrapperRef.current) return
    const rect = mapWrapperRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    mapController.handleMapClick(x, y, mapDimensions.width, mapDimensions.height)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapWrapperRef.current || currentSelectionMode !== 'area') return
    const rect = mapWrapperRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setDragStart({ x, y })
    setDragCurrent({ x, y })
    mapController.handleMouseDown(x, y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapWrapperRef.current || !dragStart || currentSelectionMode !== 'area') return
    const rect = mapWrapperRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setDragCurrent({ x, y })
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapWrapperRef.current) return
    const rect = mapWrapperRef.current.getBoundingClientRect()
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
      animationController.play(currentYear, (year, progress) => {
        setCurrentYear(year)
        setYearProgress(progress)
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

  const handleZoomClick = () => {
    dispatch(showGraphViewer());
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

  const handleSpeedChange = (newSpeed : 1 | 1.5 | 2) => {
    setSpeed(newSpeed)
    animationController.setSpeed(newSpeed)
    setShowSpeedMenu(false)
    if (isPlaying) {
      animationController.pause()
      animationController.play(currentYear, (year, progress) => {
        setCurrentYear(year)
        setYearProgress(progress)
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

  const legendData = [
    { label: '< -3°C', color: 'rgb(0, 10, 100)' },
    { label: '-2.5°C', color: 'rgb(0, 40, 160)' },
    { label: '-2°C', color: 'rgb(0, 80, 200)' },
    { label: '-1.5°C', color: 'rgb(30, 120, 240)' },
    { label: '-1°C', color: 'rgb(60, 160, 255)' },
    { label: '-0.5°C', color: 'rgb(120, 200, 255)' },
    { label: '0°C', color: 'rgba(162, 162, 162, 1)' },
    { label: '+1°C', color: 'rgb(255, 245, 120)' },
    { label: '+1.5°C', color: 'rgb(255, 220, 80)' },
    { label: '+2°C', color: 'rgb(255, 190, 50)' },
    { label: '+2.5°C', color: 'rgb(255, 140, 30)' },
    { label: '+3°C', color: 'rgb(240, 100, 20)' },
    { label: '> +4°C', color: 'rgb(180, 20, 40)' },
  ]

  return (
    <div className='map-container' style={{ height: `${mapHeight}px` }}>
      <div 
        className='map-wrapper'
        ref={mapWrapperRef}
        onClick={handleMapClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setDragStart(null)
          setDragCurrent(null)
          setHoveredArea(null)
        }}
        style={{ cursor: currentSelectionMode ? 'crosshair' : 'default' }}
      >
        {mapDimensions.width > 0 && mapDimensions.height > 0 && (
          <AnomalyCanvas
            year={currentYear}
            yearProgress={yearProgress}
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
                height: '1px',
                backgroundColor: '#FF4444',
                boxShadow: '0 0 8px rgba(255, 68, 68, 0.8)',
                pointerEvents: 'none',
                zIndex: 20
              }}
            />
          )
        })}

        {/* Areas avec scaling depuis coordonnées originales */}
        {selectedAreas.map(area => {
          const scaledArea = getScaledAreaCoordinates(area)
          const group = areaGroups.find(g => g.id === area.groupId)
          const borderColor = group ? group.color : '#25c900ff'
          
          return (
            <div
              key={area.id}
              style={{
                position: 'absolute',
                left: `${scaledArea.topLeft.x}px`,
                top: `${scaledArea.topLeft.y}px`,
                width: `${scaledArea.bottomRight.x - scaledArea.topLeft.x}px`,
                height: `${scaledArea.bottomRight.y - scaledArea.topLeft.y}px`,
                border: `2px solid ${borderColor}`,
                backgroundColor: group ? `${borderColor}20` : 'rgba(0, 255, 0, 0.15)',
                boxShadow: `0 0 10px ${borderColor}99`,
                pointerEvents: 'auto',
                zIndex: 20,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={() => setHoveredArea(area.id)}
              onMouseLeave={() => setHoveredArea(null)}
            />
          )
        })}

        {/* ✅ Tooltip métadonnées area */}
        {hoveredArea !== null && (() => {
          const area = selectedAreas.find(a => a.id === hoveredArea)
          if (!area) return null
          
          const scaledArea = getScaledAreaCoordinates(area)
          const group = areaGroups.find(g => g.id === area.groupId)
          
          const latTop = 90 - (scaledArea.topLeft.y / mapDimensions.height) * 180
          const latBottom = 90 - (scaledArea.bottomRight.y / mapDimensions.height) * 180
          const lonLeft = (scaledArea.topLeft.x / mapDimensions.width) * 360 - 180
          const lonRight = (scaledArea.bottomRight.x / mapDimensions.width) * 360 - 180
          
          return (
            <div
              className='area-tooltip'
              style={{
                position: 'absolute',
                left: `${scaledArea.bottomRight.x + 10}px`,
                top: `${scaledArea.topLeft.y}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                padding: '10px 12px',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 100,
                pointerEvents: 'none',
                fontSize: '11px',
                fontFamily: 'montserrat, sans-serif',
                minWidth: '180px',
                border: group ? `2px solid ${group.color}` : '2px solid #25c900ff'
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '12px', 
                marginBottom: '6px',
                color: group ? group.color : '#25c900ff'
              }}>
                {area.name}
              </div>
              
              {group && (
                <div style={{ 
                  fontSize: '10px', 
                  color: '#666',
                  marginBottom: '6px',
                  padding: '3px 6px',
                  backgroundColor: `${group.color}20`,
                  borderRadius: '3px',
                  display: 'inline-block'
                }}>
                  Groupe: {group.name}
                </div>
              )}
              
              <div style={{ fontSize: '10px', color: '#333', lineHeight: '1.5' }}>
                <div><strong>Latitude:</strong> {latTop.toFixed(1)}° à {latBottom.toFixed(1)}°</div>
                <div><strong>Longitude:</strong> {lonLeft.toFixed(1)}° à {lonRight.toFixed(1)}°</div>
                <div><strong>Dimensions:</strong> {(scaledArea.bottomRight.x - scaledArea.topLeft.x).toFixed(0)}×{(scaledArea.bottomRight.y - scaledArea.topLeft.y).toFixed(0)} px</div>
              </div>
            </div>
          )
        })()}

        {dragStart && dragCurrent && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(dragStart.x, dragCurrent.x)}px`,
              top: `${Math.min(dragStart.y, dragCurrent.y)}px`,
              width: `${Math.abs(dragCurrent.x - dragStart.x)}px`,
              height: `${Math.abs(dragCurrent.y - dragStart.y)}px`,
              border: '2px dashed #25c900ff',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              pointerEvents: 'none',
              zIndex: 25,
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.4)'
            }}
          />
        )}

        {/* Légende horizontale */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '5px 12px',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            zIndex: 30,
            fontSize: '9px',
            fontFamily: 'montserrat, sans-serif',
            color:'black',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            maxWidth: 'fit-content',
          }}
        >
          <span style={{ 
            fontWeight: 'bold', 
            fontSize: '10px',
            whiteSpace: 'nowrap',
            marginRight: '4px'
          }}>
            Anomalies:
          </span>
          
          {legendData.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '3px',
              whiteSpace: 'nowrap'
            }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: item.color,
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: '2px',
                  flexShrink: 0
                }}
              />
              <span style={{ fontSize: '8px' }}>{item.label}</span>
            </div>
          ))}
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
              {[1, 1.5, 2].map(s => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s as 1 | 1.5 | 2)}
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

        <button
          className='control-section zoom-section'
          onClick={handleZoomClick}
        >
          {showingGraphViewer ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
        </button>
      </div>

      <div 
        className='map-resize-handle'
        onMouseDown={handleResizeMouseDown}
        style={{ cursor: 'ns-resize' }}
      >
        <div className='resize-bar' />
      </div>
    </div>
  )
}