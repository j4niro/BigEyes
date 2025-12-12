// components/SettingPan.tsx - Settings panel for interactive map controls and selections
// AI Assistance: ~35% (Redux state management patterns, form validation logic, and dropdown interaction handling)

import React, { useState, useEffect, useMemo } from 'react'
import './SettingPan.css'
import { useAppDispatch, useAppSelector } from '../Redux/Hooks/StoreHooks'
import { 
  setSelectionMode,
  deleteLatitudeSelected,
  deleteAreaSelected,
  createAreaGroup,
  addAreaToGroup,
  removeAreaFromGroup,
  deleteGroup,
  updateAreaName,
} from '../Redux/Slice/GlobalSlice'
import { SettingPanController } from '../Controllers/SettingPanController'
import cursor from '../../public/Cursor_Latitude_Select.png'
import areaCursor from '../../public/area_select.png'

// Predefined color palette for area groups
const GROUP_COLORS = [
  '#9d0000ff', '#00524cff', '#005115ff', '#d26200ff', 
  '#3c2400ff', '#9a045eff', '#440061ff', '#4900afff'
]

export const SettingPan = () => {
  const dispatch = useAppDispatch()
  
  // Select relevant state from Redux store
  const selectedLatitudes = useAppSelector(state => state.globalState.selectedLatitudes)
  const yearRange = useAppSelector(state => state.globalState.yearRange)
  const selectedAreas = useAppSelector(state => state.globalState.selectedAreas)
  const areaGroups = useAppSelector(state => state.globalState.areaGroups)
  const currentSelectionMode = useAppSelector(state => state.globalState.currentSelectionMode)

  // Memoize controller to avoid recreation on every render
  const controller = useMemo(() => new SettingPanController(dispatch), [dispatch])

  // Local state for form inputs and UI interactions
  const [newLatitude, setNewLatitude] = useState('')
  const [yearInput, setYearInput] = useState(yearRange.start.toString())
  const [errorMessage, setErrorMessage] = useState('')
  const [showSelections, setShowSelections] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null)
  const [editingAreaName, setEditingAreaName] = useState('')

  // Sync local year input with Redux state when it changes externally
  useEffect(() => {
    setYearInput(yearRange.start.toString())
  }, [yearRange.start])

  // Handle year input change without immediate validation
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYearInput(e.target.value)
  }

  // Validate and apply year when input loses focus
  const handleYearBlur = () => {
    const result = controller.validateAndSetYear(yearInput)
    setYearInput(result.correctedYear.toString())
  }

  // Allow Enter key to trigger year validation
  const handleYearKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleYearBlur()
    }
  }

  // Add latitude from manual input
  const handleAddLatitude = () => {
    const result = controller.addLatitudeFromInput(newLatitude)
    
    if (result.success) {
      setNewLatitude('')
      setErrorMessage('')
    } else {
      // Display error message temporarily
      setErrorMessage(result.message || 'Error')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  // Switch to latitude selection mode
  const handleLatitudeModeToggle = () => {
    dispatch(setSelectionMode('latitude'))
  }

  // Switch to area selection mode
  const handleAreaModeToggle = () => {
    dispatch(setSelectionMode('area'))
  }

  // Remove selected latitude from map
  const handleRemoveLatitude = (id: number) => {
    dispatch(deleteLatitudeSelected(id))
  }

  // Remove selected area from map
  const handleRemoveArea = (id: number) => {
    dispatch(deleteAreaSelected(id))
  }

  // Create new area group with chosen name and color
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      dispatch(createAreaGroup({
        name: newGroupName,
        color: GROUP_COLORS[selectedColorIndex]
      }))
      // Reset form state
      setNewGroupName('')
      setShowCreateGroup(false)
      setSelectedColorIndex(0)
    }
  }

  // Assign area to existing group
  const handleAddAreaToGroup = (areaId: number, groupId: number) => {
    dispatch(addAreaToGroup({ areaId, groupId }))
  }

  // Ungroup area (remove from its current group)
  const handleRemoveAreaFromGroup = (areaId: number) => {
    dispatch(removeAreaFromGroup(areaId))
  }

  // Delete entire group (areas remain but become ungrouped)
  const handleRemoveGroup = (groupId: number) => {
    if (window.confirm('Delete this group? Areas will be preserved.')) {
      dispatch(deleteGroup(groupId))
    }
  }

  // Enable inline editing mode for area name
  const handleStartEditArea = (areaId: number, currentName: string) => {
    setEditingAreaId(areaId)
    setEditingAreaName(currentName)
  }

  // Save edited area name and exit edit mode
  const handleSaveAreaName = () => {
    if (editingAreaId !== null && editingAreaName.trim()) {
      dispatch(updateAreaName({ id: editingAreaId, name: editingAreaName.trim() }))
    }
    setEditingAreaId(null)
    setEditingAreaName('')
  }

  // Filter areas that haven't been assigned to any group
  const ungroupedAreas = selectedAreas.filter(area => !area.groupId)
  
  // Calculate total selections for badge display
  const totalSelections = controller.getTotalSelections(
    selectedLatitudes.length, 
    selectedAreas.length
  )

  return (
    <div className='container-settingPan'>
      <div className='header'>Settings Pan</div>
      <hr />

      {/* Year input section */}
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

      {/* Manual latitude input section */}
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
            title="Add latitude line to map"
          >
            +
          </button>
        </div>
        {errorMessage && (
          <div className='error-message'>{errorMessage}</div>
        )}
      </div>

      {/* Selection mode toggles and dropdown */}
      <div className='mode-buttons-section'>
        {/* Latitude selection mode button */}
        <button 
          className={`mode-button ${currentSelectionMode === 'latitude' ? 'active' : ''}`}
          onClick={handleLatitudeModeToggle}
          title="Click on map to select latitude"
        >
          <span className='cursor-icon'>
            <img src={cursor} alt="cursor" />
          </span>
          Latitude select
        </button>

        {/* Area selection mode button */}
        <button 
          className={`mode-button ${currentSelectionMode === 'area' ? 'active' : ''}`}
          onClick={handleAreaModeToggle}
          title="Drag to select area on map"
        >
          <span className='cursor-icon'>
            <img src={areaCursor} alt="cursor" />
          </span>
          Area select
        </button>

        {/* Dropdown for managing all selections */}
        <div className='selections-dropdown-container'>
          <button 
            className='selections-counter'
            onClick={() => setShowSelections(!showSelections)}
          >
            <span className='counter-icon'>∨</span>
            <span className='counter-text'>Selections</span>
            <span className='counter-badge'>{totalSelections}</span>
          </button>

          {/* Dropdown content - only shown when selections exist */}
          {showSelections && totalSelections > 0 && (
            <div className='selections-dropdown'>
              {/* Create group button - only shown when areas exist and form is hidden */}
              {selectedAreas.length > 0 && !showCreateGroup && (
                <button
                  className='create-group-btn-dropdown'
                  onClick={() => setShowCreateGroup(true)}
                >
                  + Create group
                </button>
              )}

              {/* Group creation form */}
              {showCreateGroup && (
                <div className='create-group-form-dropdown'>
                  <input
                    type='text'
                    placeholder='Group name'
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
                    className='group-name-input-dropdown'
                    autoFocus
                  />
                  {/* Color picker with predefined palette */}
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

              {/* List of selected latitudes */}
              {selectedLatitudes.length > 0 && (
                <div className='dropdown-section'>
                  <div className='dropdown-header'>Latitudes</div>
                  {selectedLatitudes.map(lat => (
                    <div key={lat.id} className='selection-item'>
                      <span className='selection-label'>{lat.lat}°</span>
                      <button
                        className='remove-btn'
                        onClick={() => handleRemoveLatitude(lat.id)}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Area groups with their member areas */}
              {areaGroups.length > 0 && (
                <div className='dropdown-section'>
                  <div className='dropdown-header'>Groups</div>
                  {areaGroups.map(group => (
                    <div key={group.id} className='group-item'>
                      {/* Group header with color indicator */}
                      <div className='group-header-dropdown' style={{ borderLeftColor: group.color }}>
                        <span className='group-name-dropdown'>{group.name}</span>
                        <button
                          className='remove-btn'
                          onClick={() => handleRemoveGroup(group.id)}
                          title="Delete group"
                        >
                          ×
                        </button>
                      </div>
                      {/* Areas belonging to this group */}
                      {selectedAreas
                        .filter(area => area.groupId === group.id)
                        .map(area => (
                          <div key={area.id} className='area-in-group'>
                            {/* Inline name editing */}
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
                                title="Click to rename"
                              >
                                • {area.name}
                              </span>
                            )}
                            {/* Ungroup button */}
                            <button
                              className='ungroup-btn-small'
                              onClick={() => handleRemoveAreaFromGroup(area.id)}
                              title="Remove from group"
                            >
                              ↗
                            </button>
                            {/* Delete area button */}
                            <button
                              className='remove-btn-small'
                              onClick={() => handleRemoveArea(area.id)}
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Ungrouped areas section */}
              {ungroupedAreas.length > 0 && (
                <div className='dropdown-section'>
                  <div className='dropdown-header'>Ungrouped areas</div>
                  {ungroupedAreas.map(area => (
                    <div key={area.id} className='selection-item-area'>
                      {/* Inline name editing for ungrouped areas */}
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
                          title="Click to rename"
                        >
                          {area.name}
                        </span>
                      )}
                      {/* Dropdown to assign area to group */}
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
                        title="Delete"
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