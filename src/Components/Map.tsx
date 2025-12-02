import React from 'react'
import './Map.css'
import '../../public/earth.png'
import plus10 from '../../public/+10button.png'
import moins10 from '../../public/-10button.png'
import pause from  '../../public/Pause_Sign.png'
import start from '../../public/Play_button_arrowhead.png'
import gostart from '../../public/gostart_button.png'
import goend from '../../public/goend_button.png'

export const Map = () => {
  return (
    <div className='map-container'>
      {/* Carte du monde */}
      <div className='map-wrapper'>
        {/*<img 
          src="/earth.png" 
          alt="World Map" 
          className='earth-image'
        />*/}
        
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

        {/* Grille verticale (longitude) */}
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