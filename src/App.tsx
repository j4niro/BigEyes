import "./App.css"
import "./GraphViewer.css"
import { useEffect, useState } from "react"
import { useAppSelector, useAppDispatch } from "./Redux/Hooks/StoreHooks"
import { loadEarthImage } from "./Redux/Slice/DataThunk"
import { SettingPan } from './Components/SettingPan'
import { Map } from './Components/Map'
import GraphView from "./Components/GraphView"
import ViewList from "./Components/ViewList"
// import { setMapHeight, setViewerHeight } from "./Redux/Slice/GlobalSlice"
import { setViewerLayout, type ViewKey } from "./Redux/Slice/GlobalSlice"

function App() {
  const dispatch = useAppDispatch();
  const mapSize = useAppSelector((state) => state.data.mapSize);

  const screenLayout = useAppSelector((state) => state.globalState.screenLayout);

  // Ordre depuis Redux
  const viewOrder = useAppSelector((state) => state.globalState.viewOrder);
  
  const [activeView, setActiveView] = useState<ViewKey>('heatmap')
  const [showSettingPan, setShowSettingPan] = useState(false)

  const [mapHeight, setMapHeight] = useState(window.innerHeight * 0.6);
  // const [viewerHeight, setViewerHeight] = useState(window.innerHeight * 0.4);

  useEffect(() => {
    dispatch(loadEarthImage())
  }, [dispatch])

  useEffect(() => {
    setMapHeight(window.innerHeight * screenLayout.mapLayout);
  }, [screenLayout.mapLayout])

  useEffect(() => {
    setMapHeight(window.innerHeight * screenLayout.viewerLayout);
  }, [screenLayout.viewerLayout])

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

  const setViewerLayoutFromViewList = (h:0|0.8|0.4) =>{
    dispatch(setViewerLayout(h));
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

      <div className="graph-viewer" style={{ height: `${window.innerHeight * screenLayout.viewerLayout}px`, visibility : `${screenLayout.viewerLayout !== 0 ? "visible":"hidden"}`}}> 
        
        <ViewList 
          activeView={activeView} 
          setActiveView={setActiveView}
          onHeightChange={(h)=>{h === 0 || h === 0.8 || h === 0.4 ? setViewerLayoutFromViewList(h) : null}}
        />

        <div className="graph-viewer-main">
          {/* Ajout de scroll-behavior: smooth en CSS est aussi recommandé sur ce conteneur */}
          <div className={`graph-viewer-content layout-${screenLayout.viewerLayout === 0.8 ? "grid" : "single"}`}>
            
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