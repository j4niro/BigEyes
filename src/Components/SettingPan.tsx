import React, { useState } from 'react'
import './SettingPan.css'
import { useAppDispatch, useAppSelector } from '../redux/hooks/StoreHooks'
import { 
  addLatitudeSelected, 
  deleteLatitudeSelected, 
  setYearRange,
  type Latitude 
} from '../redux/Slice/GlobalSlice'

export const SettingPan = () => {
  const dispatch = useAppDispatch()
  const selectedLatitudes = useAppSelector(state => state.globalState.selectedLatitudes)
  const yearRange = useAppSelector(state => state.globalState.yearRange)
  const selectedAreas = useAppSelector(state => state.globalState.selectedAreas)

  const [newLatitude, setNewLatitude] = useState('')
  const [isLatitudeMode, setIsLatitudeMode] = useState(true)

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const year = parseInt(value)
    
    // Permet de vider l'input ou d'entrer des valeurs partielles
    if (value === '' || (year >= 1880 && year <= 2025)) {
      dispatch(setYearRange({ start: year || 1880, end: year || 1880 }))
    }
  }

  const handleYearBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value)
    
    // Validation finale quand on quitte l'input
    if (isNaN(year) || year < 1880) {
      dispatch(setYearRange({ start: 1880, end: 1880 }))
    } else if (year > 2025) {
      dispatch(setYearRange({ start: 2025, end: 2025 }))
    }
  }

  const handleAddLatitude = () => {
    const lat = parseFloat(newLatitude)
    if (!isNaN(lat) && lat >= -88 && lat <= 88) {
      const latitude: Latitude = {
        id: 0,
        lat: lat
      }
      dispatch(addLatitudeSelected(latitude))
      setNewLatitude('')
    }
  }

  const handleLatitudeModeToggle = () => {
    setIsLatitudeMode(true)
  }

  const handleAreaModeToggle = () => {
    setIsLatitudeMode(false)
  }

  const totalSelections = selectedLatitudes.length + selectedAreas.length

  return (
    <div className='container-settingPan'>
      <div className='header'>Setting Pan</div>
      <hr />

      {/* Year Input */}
      <div className='section'>
        <label className='section-label'>Year</label>
        <input 
          type="number" 
          className='year-input'
          min="1880"
          max="2025"
          value={yearRange.start}
          onChange={handleYearChange}
          onBlur={handleYearBlur}
        />
      </div>

      {/* Latitude Input */}
      <div className='section'>
        <label className='section-label'>Latitude</label>
        <div className='input-with-button'>
          <input 
            type="number"
            className='latitude-input'
            placeholder=""
            value={newLatitude}
            onChange={(e) => setNewLatitude(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddLatitude()}
            min="-88"
            max="88"
            step="4"
          />
          <button 
            className='add-button'
            onClick={handleAddLatitude}
          >
            +
          </button>
        </div>
      </div>

      {/* Latitude Select Button */}
      <button 
        className={`mode-button ${isLatitudeMode ? 'active' : ''}`}
        onClick={handleLatitudeModeToggle}
      >
        <span className='cursor-icon'>🖱️</span>
        Latitude select
      </button>

      {/* Area Select Button */}
      <button 
        className={`mode-button ${!isLatitudeMode ? 'active' : ''}`}
        onClick={handleAreaModeToggle}
      >
        <span className='cursor-icon'>🖱️</span>
        Area select
      </button>

      {/* Selections Counter */}
      <div className='selections-counter'>
        <span className='counter-icon'>∨</span>
        <span className='counter-text'>Selections</span>
        <span className='counter-badge'>{totalSelections}</span>
      </div>
    </div>
  )
}