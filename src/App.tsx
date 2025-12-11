import "./App.css"
import "./GraphViewer.css"
import { useEffect, useState } from "react"
import { useAppSelector, useAppDispatch } from "./Redux/Hooks/StoreHooks"
import { loadEarthImage } from "./Redux/Slice/DataThunk"
import { SettingPan } from './Components/SettingPan'
import { Map } from './Components/Map'
import GraphView from "./Components/GraphView"
import ViewList from "./Components/ViewList"
import { setMapHeight, setViewerHeight } from "./Redux/Slice/GlobalSlice"
import type { ViewKey } from "./Redux/Slice/GlobalSlice"

function App() {
  const dispatch = useAppDispatch();
  const mapSize = useAppSelector((state) => state.data.mapSize);
  const mapHeight = useAppSelector((state) => state.globalState.mapHeight);
  const viewerHeight = useAppSelector((state) => state.globalState.viewerHeight);
  
  // Ordre depuis Redux
  const viewOrder = useAppSelector((state) => state.globalState.viewOrder);
  
  const [activeView, setActiveView] = useState<ViewKey>('heatmap')
  const [layout, setLayout] = useState<"grid" | "single">("single")
  const [showSettingPan, setShowSettingPan] = useState(false)
  const showGraphViewer = useAppSelector((state) => state.globalState.showGraphViewer);

  useEffect(() => {
    dispatch(loadEarthImage())
  }, [dispatch])

  useEffect(() => {
    setLayout(viewerHeight > 400 ? "grid" : "single")
    dispatch(setMapHeight(730-viewerHeight)); 
  }, [viewerHeight])

  // --- NOUVEAU : SCROLL AUTOMATIQUE ---
  useEffect(() => {
    // On attend un micro-tick pour s'assurer que le DOM est prêt si l'ordre vient de changer
    const timer = setTimeout(() => {
        const element = document.getElementById(`view-container-${activeView}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 50); // Petit délai de sécurité (parfois utile si Redux met à jour le DOM en même temps)

    return () => clearTimeout(timer);
  }, [activeView, viewOrder]); // On réagit au changement de vue active OU de l'ordre

  const getGraphType = (key: ViewKey) => {
    if (key === 'graph') return 'standard';
    return key;
  }

  if (!mapSize) return <p>Loading map...</p>

  return (
    <div className="app-container">
      
      <button 
        className='toggle-setting-pan-btn'
        onClick={() => setShowSettingPan(!showSettingPan)}
        title={showSettingPan ? "Hide Settings Pan" : "Display Settings Pan"}
      >
        {showSettingPan ? (
          <span style={{ fontSize: "1.2rem" }}>✖</span> // croix
        ) : (
          <span style={{ fontSize: "1.2rem" }}>⚙️</span> // paramètre
        )}
      </button>


      {showSettingPan && (
        <div 
          className='setting-pan-wrapper'
          style={{ maxHeight: `${mapHeight - 40}px` }}
        >
          <SettingPan />
        </div>
      )}
      
      <Map />

      <div className="graph-viewer" style={{ height: `${viewerHeight}px`, visibility : `${showGraphViewer? "visible":"hidden"}`}}> 
        
        <ViewList 
          activeView={activeView} 
          setActiveView={setActiveView}
          viewerHeight={viewerHeight}
          onHeightChange={(h)=>{dispatch(setViewerHeight(h))}}
          layout={layout}
          setLayout={setLayout}
        />

        <div className="graph-viewer-main">
          {/* Ajout de scroll-behavior: smooth en CSS est aussi recommandé sur ce conteneur */}
          <div className={`graph-viewer-content layout-${layout}`}>
            
            {viewOrder.map((viewKey) => (
              <div 
                className="graph-card" 
                key={viewKey}
                // --- AJOUT DE L'ID POUR LE CIBLAGE ---
                id={`view-container-${viewKey}`}
              >
                <GraphView 
                    type={getGraphType(viewKey)} 
                    offset={40} 
                />
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  )
}

export default App