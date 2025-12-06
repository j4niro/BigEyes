import "./App.css";
import "./GraphViewer.css";
import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "./Redux/Hooks/StoreHooks";
import { loadEarthImage } from "./Redux/Slice/DataThunk";
import GraphView from "./Components/GraphView";

import ViewList from "./Components/ViewList";


function App() {
  const dispatch = useAppDispatch();
  const mapSize = useAppSelector((state) => state.data.mapSize);
  const selectedLat = useAppSelector((state)=> state.globalState.currentLat);
  const selectedLong = useAppSelector((state)=> state.globalState.currentLong);
  const selectedYear = useAppSelector((state)=> state.globalState.currentYear);
  
  const [activeView, setActiveView] = useState<'heatmap' | 'histogram' | 'graph' | 'regression'>('heatmap');
  const [viewerHeight, setViewerHeight] = useState(300); // Hauteur initiale
  const [layout, setLayout] = useState<"grid" | "single">("single");

  useEffect(() => {
    dispatch(loadEarthImage());
  }, [dispatch]);

  // Logique automatique : Si on agrandit la fenêtre vers le haut (> 500px), on passe en 2x2
  useEffect(() => {
    if (viewerHeight > 400) {
      setLayout("grid");
    } else {
      setLayout("single");
    }
  }, [viewerHeight]);

  if (!mapSize) return <p>Loading map...</p>;

  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: `${viewerHeight}px` }}>
      <h1>Welcome to BigEyes</h1>

      <h2>Selected Year : {selectedYear}</h2>
      <h2>Selected Lat : {selectedLat}</h2>
      <h2>Selected Long : {selectedLong}</h2>

      <p>Map Size : H = {mapSize?.height} W = {mapSize?.width}</p>
      
      {/* Simulation de contenu pour voir l'effet sticky du graph viewer en bas */}
      <div style={{ padding: "20px" }}>
        <p>Le contenu de la page est ici...</p>
      </div>

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