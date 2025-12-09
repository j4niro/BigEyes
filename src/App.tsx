import "./App.css"
import "./GraphViewer.css"
import { useEffect, useState } from "react"
import { useAppSelector, useAppDispatch } from "./Redux/Hooks/StoreHooks"
import { loadEarthImage } from "./Redux/Slice/DataThunk"
import { SettingPan } from './Components/SettingPan'
import { Map } from './Components/Map'
import GraphView from "./Components/GraphView"
import ViewList from "./Components/ViewList"

function App() {
  const dispatch = useAppDispatch()
  const mapSize = useAppSelector((state) => state.data.mapSize)
  const mapHeight = useAppSelector((state) => state.globalState.mapHeight)
  
  const [activeView, setActiveView] = useState<'heatmap' | 'histogram' | 'graph' | 'regression'>('heatmap')
  const [viewerHeight, setViewerHeight] = useState(300)
  const [layout, setLayout] = useState<"grid" | "single">("single")
  const [showSettingPan, setShowSettingPan] = useState(true) // ✅ State toggle

  useEffect(() => {
    dispatch(loadEarthImage())
  }, [dispatch])

  // Mettre à jour le layout selon la hauteur
  useEffect(() => {
    setLayout(viewerHeight > 400 ? "grid" : "single")
  }, [viewerHeight])

  if (!mapSize) return <p>Loading map...</p>

  return (
    <div className="app-container">
      
      {/* ✅ Bouton toggle SettingPan */}
      <button 
        className='toggle-setting-pan-btn'
        onClick={() => setShowSettingPan(!showSettingPan)}
        title={showSettingPan ? "Masquer Settings" : "Afficher Settings"}
      >
        {showSettingPan ? '◀' : '▶'}
      </button>

      {/* SettingPan conditionnel avec animation */}
      {showSettingPan && (
        <div 
          className='setting-pan-wrapper'
          style={{ maxHeight: `${mapHeight - 40}px` }}
        >
          <SettingPan />
        </div>
      )}
      
      {/* Map - Redimensionnable */}
      <Map />

      {/* Graph Viewer - En dessous de la map */}
      <div className="graph-viewer" style={{ height: `${viewerHeight}px` }}> 
        
        {/* Colonne de gauche avec les boutons */}
        <ViewList 
          activeView={activeView} 
          setActiveView={setActiveView}
          viewerHeight={viewerHeight}
          onHeightChange={setViewerHeight}
          layout={layout}
          setLayout={setLayout}
        />

        {/* Zone principale avec les graphiques */}
        <div className="graph-viewer-main">
          <div className={`graph-viewer-content layout-${layout}`}>
            
            <div className="graph-card">
              <GraphView type="heatmap" offset={40} />
            </div>

            <div className="graph-card">
              <GraphView type="histogram" offset={40} />
            </div>

            <div className="graph-card">
              <GraphView type="standard" offset={40} />
            </div>

            <div className="graph-card">
              <GraphView type="regression" offset={40} />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default App