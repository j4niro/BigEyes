import React, { useState, useEffect, useMemo } from 'react'
import './SettingPan.css'
import { useAppDispatch, useAppSelector } from '../Redux/Hooks/StoreHooks'
import { 
  addLatitudeSelected, 
  setYearRange,
  setSelectionMode,
  deleteLatitudeSelected,
  deleteAreaSelected,
  createAreaGroup,
  addAreaToGroup,
  removeAreaFromGroup,
  deleteGroup,
  updateAreaName,
  type Latitude 
} from '../Redux/Slice/GlobalSlice'
import { SettingPanController } from '../Controllers/SettingPanController'
import cursor from '../../public/Cursor_Latitude_Select.png'
import areaCursor from '../../public/area_select.png'

const GROUP_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
]

export const SettingPan = () => {
  const dispatch = useAppDispatch()
  const selectedLatitudes = useAppSelector(state => state.globalState.selectedLatitudes)
  const yearRange = useAppSelector(state => state.globalState.yearRange)
  const selectedAreas = useAppSelector(state => state.globalState.selectedAreas)
  const areaGroups = useAppSelector(state => state.globalState.areaGroups)
  const currentSelectionMode = useAppSelector(state => state.globalState.currentSelectionMode)

  const controller = useMemo(() => new SettingPanController(dispatch), [dispatch])

  const [newLatitude, setNewLatitude] = useState('')
  const [yearInput, setYearInput] = useState(yearRange.start.toString())
  const [errorMessage, setErrorMessage] = useState('')
  const [showSelections, setShowSelections] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null)
  const [editingAreaName, setEditingAreaName] = useState('')

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

  const handleRemoveLatitude = (id: number) => {
    dispatch(deleteLatitudeSelected(id))
  }

  const handleRemoveArea = (id: number) => {
    dispatch(deleteAreaSelected(id))
  }

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      dispatch(createAreaGroup({
        name: newGroupName,
        color: GROUP_COLORS[selectedColorIndex]
      }))
      setNewGroupName('')
      setShowCreateGroup(false)
      setSelectedColorIndex(0)
    }
  }

  const handleAddAreaToGroup = (areaId: number, groupId: number) => {
    dispatch(addAreaToGroup({ areaId, groupId }))
  }

  const handleRemoveAreaFromGroup = (areaId: number) => {
    dispatch(removeAreaFromGroup(areaId))
  }

  const handleRemoveGroup = (groupId: number) => {
    if (window.confirm('Supprimer ce groupe ? Les aires seront conservées.')) {
      dispatch(deleteGroup(groupId))
    }
  }

  const handleStartEditArea = (areaId: number, currentName: string) => {
    setEditingAreaId(areaId)
    setEditingAreaName(currentName)
  }

  const handleSaveAreaName = () => {
    if (editingAreaId !== null && editingAreaName.trim()) {
      dispatch(updateAreaName({ id: editingAreaId, name: editingAreaName.trim() }))
    }
    setEditingAreaId(null)
    setEditingAreaName('')
  }

  const ungroupedAreas = selectedAreas.filter(area => !area.groupId)
  const totalSelections = controller.getTotalSelections(
    selectedLatitudes.length, 
    selectedAreas.length
  )

  return (
    <div className='container-settingPan'>
      <div className='header'>Setting Pan</div>
      <hr />

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

        <div className='selections-dropdown-container'>
          <button 
            className='selections-counter'
            onClick={() => setShowSelections(!showSelections)}
          >
            <span className='counter-icon'>∨</span>
            <span className='counter-text'>Selections</span>
            <span className='counter-badge'>{totalSelections}</span>
          </button>

          {showSelections && totalSelections > 0 && (
            <div className='selections-dropdown'>
              {/* Bouton créer groupe */}
              {selectedAreas.length > 0 && !showCreateGroup && (
                <button
                  className='create-group-btn-dropdown'
                  onClick={() => setShowCreateGroup(true)}
                >
                  + Créer un groupe
                </button>
              )}

              {/* Formulaire création groupe */}
              {showCreateGroup && (
                <div className='create-group-form-dropdown'>
                  <input
                    type='text'
                    placeholder='Nom du groupe'
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
                    className='group-name-input-dropdown'
                    autoFocus
                  />
                  <div className='color-picker-dropdown'>
                    {GROUP_COLORS.map((color, index) => (
                      <div
                        key={index}
                        className={`color-dot-dropdown ${selectedColorIndex === index ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColorIndex(index)}
                      />
                    ))}
                  </div>
                  <div className='form-actions-dropdown'>
                    <button onClick={handleCreateGroup} className='btn-save-dropdown'>OK</button>
                    <button onClick={() => setShowCreateGroup(false)} className='btn-cancel-dropdown'>×</button>
                  </div>
                </div>
              )}

              {/* Liste des latitudes */}
              {selectedLatitudes.length > 0 && (
                <div className='dropdown-section'>
                  <div className='dropdown-header'>Latitudes</div>
                  {selectedLatitudes.map(lat => (
                    <div key={lat.id} className='selection-item'>
                      <span className='selection-label'>{lat.lat}°</span>
                      <button
                        className='remove-btn'
                        onClick={() => handleRemoveLatitude(lat.id)}
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Groupes d'aires */}
              {areaGroups.length > 0 && (
                <div className='dropdown-section'>
                  <div className='dropdown-header'>Groupes</div>
                  {areaGroups.map(group => (
                    <div key={group.id} className='group-item'>
                      <div className='group-header-dropdown' style={{ borderLeftColor: group.color }}>
                        <span className='group-name-dropdown'>{group.name}</span>
                        <button
                          className='remove-btn'
                          onClick={() => handleRemoveGroup(group.id)}
                          title="Supprimer le groupe"
                        >
                          ×
                        </button>
                      </div>
                      {selectedAreas
                        .filter(area => area.groupId === group.id)
                        .map(area => (
                          <div key={area.id} className='area-in-group'>
                            {editingAreaId === area.id ? (
                              <input
                                type='text'
                                value={editingAreaName}
                                onChange={(e) => setEditingAreaName(e.target.value)}
                                onBlur={handleSaveAreaName}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveAreaName()}
                                className='area-name-edit-input'
                                autoFocus
                              />
                            ) : (
                              <span 
                                className='area-label-editable'
                                onClick={() => handleStartEditArea(area.id, area.name)}
                                title="Cliquer pour renommer"
                              >
                                • {area.name}
                              </span>
                            )}
                            <button
                              className='ungroup-btn-small'
                              onClick={() => handleRemoveAreaFromGroup(area.id)}
                              title="Retirer du groupe"
                            >
                              ↗
                            </button>
                            <button
                              className='remove-btn-small'
                              onClick={() => handleRemoveArea(area.id)}
                              title="Supprimer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Aires non groupées */}
              {ungroupedAreas.length > 0 && (
                <div className='dropdown-section'>
                  <div className='dropdown-header'>Aires non groupées</div>
                  {ungroupedAreas.map(area => (
                    <div key={area.id} className='selection-item-area'>
                      {editingAreaId === area.id ? (
                        <input
                          type='text'
                          value={editingAreaName}
                          onChange={(e) => setEditingAreaName(e.target.value)}
                          onBlur={handleSaveAreaName}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveAreaName()}
                          className='area-name-edit-input'
                          autoFocus
                        />
                      ) : (
                        <span 
                          className='area-label-editable'
                          onClick={() => handleStartEditArea(area.id, area.name)}
                          title="Cliquer pour renommer"
                        >
                          {area.name}
                        </span>
                      )}
                      {areaGroups.length > 0 && (
                        <select
                          className='group-select-small'
                          onChange={(e) => handleAddAreaToGroup(area.id, parseInt(e.target.value))}
                          value=''
                        >
                          <option value=''>→</option>
                          {areaGroups.map(group => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        className='remove-btn'
                        onClick={() => handleRemoveArea(area.id)}
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}