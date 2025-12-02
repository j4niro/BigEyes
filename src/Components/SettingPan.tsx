import React, { useState, useEffect, useMemo } from 'react'
import './SettingPan.css'
import { useAppDispatch, useAppSelector } from '../Redux/Hooks/StoreHooks'
import { 
  addLatitudeSelected, 
  setYearRange,
  setSelectionMode,
  type Latitude 
} from '../Redux/Slice/GlobalSlice'
import { SettingPanController } from '../Controllers/SettingPanController'
import cursor from '../../public/Cursor_Latitude_Select.png'
import areaCursor from '../../public/area_select.png'

export const SettingPan = () => {
  const dispatch = useAppDispatch()
  const selectedLatitudes = useAppSelector(state => state.globalState.selectedLatitudes)
  const yearRange = useAppSelector(state => state.globalState.yearRange)
  const selectedAreas = useAppSelector(state => state.globalState.selectedAreas)
  const currentSelectionMode = useAppSelector(state => state.globalState.currentSelectionMode)

  const controller = useMemo(() => new SettingPanController(dispatch), [dispatch])

  const [newLatitude, setNewLatitude] = useState('')
  const [yearInput, setYearInput] = useState(yearRange.start.toString())
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setYearInput(yearRange.start.toString())
  }, [yearRange.start])

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYearInput(e.target.value)
  }

  const handleYearBlur = () => {
    const result = controller.validateAndSetYear(yearInput)
    setYearInput(result.correctedYear.toString())
  }

  const handleYearKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleYearBlur()
    }
  }

  const handleAddLatitude = () => {
    const result = controller.addLatitudeFromInput(newLatitude)
    
    if (result.success) {
      setNewLatitude('')
      setErrorMessage('')
    } else {
      setErrorMessage(result.message || 'Erreur')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleLatitudeModeToggle = () => {
    dispatch(setSelectionMode('latitude'))
  }

  const handleAreaModeToggle = () => {
    dispatch(setSelectionMode('area'))
  }

  const totalSelections = controller.getTotalSelections(
    selectedLatitudes.length, 
    selectedAreas.length
  )

  return (
    <div className='container-settingPan'>
      <div className='header'>Setting Pan</div>

      <div className='section'>
        <label className='section-label'>Year</label>
        <input 
          type="number" 
          className='year-input'
          min="1880"
          max="2025"
          value={yearInput}
          onChange={handleYearChange}
          onBlur={handleYearBlur}
          onKeyPress={handleYearKeyPress}
        />
      </div>

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
            title="Ajouter une ligne de latitude sur la carte"
          >
            +
          </button>
        </div>
        {errorMessage && (
          <div className='error-message'>{errorMessage}</div>
        )}
      </div>

      <div className='mode-buttons-section'>
        <button 
          className={`mode-button ${currentSelectionMode === 'latitude' ? 'active' : ''}`}
          onClick={handleLatitudeModeToggle}
          title="Cliquer sur la carte pour sélectionner une latitude"
        >
          <span className='cursor-icon'>
            <img src={cursor} alt="cursor" />
          </span>
          Latitude select
        </button>

        <button 
          className={`mode-button ${currentSelectionMode === 'area' ? 'active' : ''}`}
          onClick={handleAreaModeToggle}
          title="Sélectionner une zone sur la carte"
        >
          <span className='cursor-icon'>
            <img src={areaCursor} alt="cursor" />
          </span>
          Area select
        </button>

        <div className='selections-counter'>
          <span className='counter-icon'>∨</span>
          <span className='counter-text'>Selections</span>
          <span className='counter-badge'>{totalSelections}</span>
        </div>
      </div>
    </div>
  )
}