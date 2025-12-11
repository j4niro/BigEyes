import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom"; // Import nécessaire
import { useViewListController } from "../Controllers/ViewListController";
import { useDispatch, useSelector } from "react-redux"; 
import type { RootState } from "../Redux/Store/Store"; 
import { reorderViews, setViewerLayout, type ViewKey } from "../Redux/Slice/GlobalSlice";
import { useAppSelector } from "../Redux/Hooks/StoreHooks";


interface ViewListProps {
  activeView: "heatmap" | "histogram" | "graph" | "regression";
  setActiveView: (view: "heatmap" | "histogram" | "graph" | "regression") => void;
  onHeightChange: (height: 0|0.8|0.4) => void;
}

// Composant utilitaire pour le Tooltip Portail
const TooltipPortal = ({ 
    children, 
    targetRef 
}: { 
    children: React.ReactNode, 
    targetRef: React.RefObject<HTMLElement | null> 
}) => {
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useEffect(() => {
        // Sécurité : on ne calcule que si l'élément existe vraiment dans le DOM
        if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top + (rect.height / 2),
                left: rect.right + 12
            });
        }
    }, [targetRef]);

    // Si la ref est vide (cas rare mais possible au montage), on n'affiche rien
    if (!targetRef.current) return null;

    return ReactDOM.createPortal(
        <div 
            className="view-tooltip" 
            style={{ 
                top: coords.top, 
                left: coords.left,
                position: "fixed",
                transform: "translateY(-50%)" 
            }}
        >
            {children}
        </div>,
        document.body
    );
};

// Configuration constante (ne change pas)
const viewConfig: Record<ViewKey, { icon: string; label: string; desc: string }> = {
  heatmap: { icon: "🔥", label: "Heatmap", desc: "A heatmap showing the evolution of temperature anomalies over time for each latitude" },
  histogram: { icon: "📊", label: "Histogram", desc: "A histogram showing the data of each longitude for the selected latitudes" },
  graph: { icon: "📈", label: "Graph", desc: "A graph showing the mean values of the selected areas for each year." },
  regression: { icon: "📏", label: "Regression", desc: "A graph showing anomalies regressions over years for each latitude" }
};

export default function ViewList({ 
  activeView, 
  setActiveView, 
  onHeightChange,
}: ViewListProps) {
  
  const dispatch = useDispatch();
  
  // 1. Lecture de l'ordre depuis Redux (Source de vérité)
  const viewOrder = useSelector((state: RootState) => state.globalState.viewOrder);

  //gestion du layout de l'écran
  const viewerLayout = useAppSelector((state)=>state.globalState.screenLayout.viewerLayout);

  useViewListController({onHeightChange});
  
  // Refs pour le Drag & Drop
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  
  // État local purement visuel (pour savoir qui est 'dimmed')
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredView, setHoveredView] = useState<string | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // --- LOGIQUE REDUX DND ---

  const handleDragStart = (index: number) => {
    dragItemIndex.current = index;
    setDraggingIndex(index); // Déclenche le re-render pour le style visuel
  };

  const handleDragEnter = (index: number) => {
    dragOverItemIndex.current = index;

    // Si on survole un élément différent de celui qu'on tient
    if (dragItemIndex.current !== null && dragItemIndex.current !== dragOverItemIndex.current) {
      
      // 1. Copie du tableau actuel (immutable)
      const newOrder = [...viewOrder];
      
      // 2. On récupère l'élément déplacé
      const draggedItemContent = newOrder[dragItemIndex.current];
      
      // 3. Suppression à l'ancienne position
      newOrder.splice(dragItemIndex.current, 1);
      
      // 4. Insertion à la nouvelle position
      newOrder.splice(dragOverItemIndex.current, 0, draggedItemContent);

      // 5. Mise à jour des références pour que la logique continue
      dragItemIndex.current = dragOverItemIndex.current;
      setDraggingIndex(dragOverItemIndex.current); // Met à jour l'index visuel

      // 6. DISPATCH REDUX : C'est ici que le DOM sera mis à jour par React
      dispatch(reorderViews(newOrder));
    }
  };

  const handleDragEnd = () => {
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
    setDraggingIndex(null); // Reset du style
  };

  return (
    <>

      <div className="graph-viewer-left">
        <div className="views-list-label">Views List</div>

        {/* --- 1. BOUTONS DE LAYOUT (FIXES EN HAUT) --- */}
        <div className="layout-buttons-container">
            <button
                className={`layout-btn ${viewerLayout === 0.8 ? "active" : ""}`}
                onClick={()=>{dispatch(setViewerLayout(0.8))}}
                title="Grille (2x2)"
            >
                ⊞
            </button>
            <button
                className={`layout-btn ${viewerLayout === 0.4 ? "active" : ""}`}
                onClick={()=>{dispatch(setViewerLayout(0.4))}}
                title="Ligne (Horizontal)"
            >
                ☰
            </button>
        </div>
        
        <div className="views-container">
          {viewOrder.map((key, index) => {
            const config = viewConfig[key];
            const isDragging = draggingIndex === index; // Style conditionnel pur React

            return (
              <React.Fragment key={key}>
                <button
                  ref={(el) => { btnRefs.current[key] = el; }}
                  
                  // Classes dynamiques basées sur l'état
                  className={`view-button ${activeView === key ? "active" : ""} ${isDragging ? "view-button-dragging" : ""}`}
                  
                  onClick={() => setActiveView(key)}
                  onMouseEnter={() => setHoveredView(key)}
                  onMouseLeave={() => setHoveredView(null)}
                  
                  // Attributs Drag & Drop
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()} // Obligatoire
                  
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                >
                  <div className="view-icon">{config.icon}</div>
                  <div className="view-text">{config.label}</div>
                </button>

                {hoveredView === key && !isDragging && (
                   <TooltipPortal targetRef={{ current: btnRefs.current[key] }}>
                      {config.desc}
                   </TooltipPortal>
                )}
              </React.Fragment>
            );
          })}

        </div>
      </div>
    </>
  );
}