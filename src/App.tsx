import "./App.css";
import "./GraphViewer.css";
import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "./Redux/Hooks/StoreHooks";
import  {loadEarthImage}  from "./Redux/Slice/DataThunk";
import { SettingPan } from './Components/SettingPan';
import { Map } from './Components/Map';
import GraphView from "./Components/GraphView";
import ViewList from "./Components/ViewList";


function App() {
  const dispatch = useAppDispatch();
  const mapSize = useAppSelector((state)=> state.data.mapSize);
  const mapHeight = useAppSelector((state) => state.globalState.mapHeight)
  
  const [activeView, setActiveView] = useState<'heatmap' | 'histogram' | 'graph' | 'regression'>('heatmap');
  const [viewerHeight, setViewerHeight] = useState(300); // Hauteur initiale
  const [layout, setLayout] = useState<"grid" | "single">("single");

   useEffect(() => {
    dispatch(loadEarthImage());
    if (viewerHeight > 400) {
      setLayout("grid");
    } else {
      setLayout("single");
    }
  }, [viewerHeight, dispatch]);

  if (!mapSize) return <p>Loading map...</p>;

  return (
    <div className="app-container" style={{ width: "100%", minHeight: "100vh", paddingBottom: `${viewerHeight}px` }}>
      
      <div 
        className='setting-pan-wrapper'
        style={{ maxHeight: `${mapHeight - 40}px`, overflowY: 'auto' }}
        >
              <SettingPan />
      </div>
      
      <Map />

      {/* ----------- GRAPH VIEW INTEGRATION -----------  */}
      <div className="graph-viewer" style={{ height: `${viewerHeight}px` }}> 
        
        {/* Barre de redimensionnement fine tout en haut du composant */}
        <div className="resize-handle-container">
            {/* La logique de drag est gérée par ViewList, mais visuellement la barre est ici via CSS */}
        </div>

        {/* Colonne de gauche avec les boutons de vue */}
        <ViewList 
          activeView={activeView} 
          setActiveView={setActiveView}
          viewerHeight={viewerHeight}
          onHeightChange={setViewerHeight}
          layout={layout}
          setLayout={setLayout}
        />

        {/* Zone principale avec tous les graphiques */}
        <div className="graph-viewer-main">
          {/* Zone inférieure dynamique */}
          <div className={`graph-viewer-content layout-${layout}`}>
            
            {/* Graphique 1 */}
            <div className="graph-card">
              <GraphView type="heatmap" offset={40} />
            </div>

            {/* Graphique 2 */}
            <div className="graph-card">
              <GraphView type="histogram" offset={40} />
            </div>

            {/* Graphique 3 */}
            <div className="graph-card">
              <GraphView type="standard" offset={40} />
            </div>

            {/* Graphique 4 */}
            <div className="graph-card">
              <GraphView type="regression" offset={40} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;