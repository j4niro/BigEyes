import React from 'react'
import './SettingPan.css'

export const SettingPan = () => {
  return (
    <div className='container-settingPan'>
        SettingPan
        <hr />
        <div className='YearInput'>
            <label htmlFor="year">Year</label>
            <input type="number" name="year" id="year" />
        </div>
    </div>
  )
}
