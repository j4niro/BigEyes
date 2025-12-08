import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom"; // Import nécessaire
import { useViewListController } from "../Controllers/ViewListController";

interface ViewListProps {
  activeView: "heatmap" | "histogram" | "graph" | "regression";
  setActiveView: (view: "heatmap" | "histogram" | "graph" | "regression") => void;
  viewerHeight: number;
  onHeightChange: (height: number) => void;
  layout: "grid" | "single";
  setLayout: (layout: "grid" | "single") => void;
}

// Descriptions des graphiques
const viewDescriptions = {
  heatmap: "Carte thermique interactive montrant la distribution globale des anomalies.",
  histogram: "Histogramme analysant la fréquence des anomalies par latitude.",
  graph: "Graphique standard visualisant les courbes d'évolution temporelle.",
  regression: "Analyse des tendances climatiques (1880-2025) via régression linéaire."
};

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



export default function ViewList({ 
  activeView, 
  setActiveView, 
  viewerHeight, 
  onHeightChange,
  layout,
  setLayout 
}: ViewListProps) {
  
  const controller = useViewListController({
    viewerHeight,
    onHeightChange,
    setLayout
  });

  // État local pour savoir quel bouton est survolé
  const [hoveredView, setHoveredView] = useState<string | null>(null);

  // Initialisation des refs avec le type précis
  const btnRefs = {
      heatmap: useRef<HTMLButtonElement>(null),
      histogram: useRef<HTMLButtonElement>(null),
      graph: useRef<HTMLButtonElement>(null),
      regression: useRef<HTMLButtonElement>(null),
  };

  return (
    <>
      {/* La poignée de redimensionnement */}
      <div 
        className="resize-handle-trigger"
        onMouseDown={controller.handleMouseDown}
        title="Glisser pour redimensionner"
      >
          <div className="resize-handle-visual"></div>
      </div>

      <div className="graph-viewer-left">
        <div className="views-list-label">Views List</div>

        {/* --- 1. BOUTONS DE LAYOUT (FIXES EN HAUT) --- */}
        <div className="layout-buttons-container">
            <button
                className={`layout-btn ${layout === "grid" ? "active" : ""}`}
                onClick={controller.switchToGrid}
                title="Grille (2x2)"
            >
                ⊞
            </button>
            <button
                className={`layout-btn ${layout === "single" ? "active" : ""}`}
                onClick={controller.switchToSingle}
                title="Ligne (Horizontal)"
            >
                ☰
            </button>
        </div>

        {/* --- 2. LISTE DES VUES (SCROLLABLE) --- */}
        <div className="views-container">
          
          {/* Bouton Heatmap */}
          <button
            ref={btnRefs.heatmap} /* On attache la ref */
            className={`view-button ${activeView === "heatmap" ? "active" : ""}`}
            onClick={() => setActiveView("heatmap")}
            onMouseEnter={() => setHoveredView("heatmap")}
            onMouseLeave={() => setHoveredView(null)}
          >
            <div className="view-icon">🔥</div>
            <div className="view-text">Heatmap</div>
          </button>
          {/* Le tooltip est rendu via le Portal si survolé */}
          {hoveredView === "heatmap" && (
              <TooltipPortal targetRef={btnRefs.heatmap}>{viewDescriptions.heatmap}</TooltipPortal>
          )}

          {/* Bouton Histogram */}
          <button
            ref={btnRefs.histogram}
            className={`view-button ${activeView === "histogram" ? "active" : ""}`}
            onClick={() => setActiveView("histogram")}
            onMouseEnter={() => setHoveredView("histogram")}
            onMouseLeave={() => setHoveredView(null)}
          >
            <div className="view-icon">📊</div>
            <div className="view-text">Histogram</div>
          </button>
          {hoveredView === "histogram" && (
              <TooltipPortal targetRef={btnRefs.histogram}>{viewDescriptions.histogram}</TooltipPortal>
          )}

          {/* ... Fais de même pour Graph et Regression ... */}
           <button
            ref={btnRefs.graph}
            className={`view-button ${activeView === "graph" ? "active" : ""}`}
            onClick={() => setActiveView("graph")}
            onMouseEnter={() => setHoveredView("graph")}
            onMouseLeave={() => setHoveredView(null)}
          >
            <div className="view-icon">📈</div>
            <div className="view-text">Graph</div>
          </button>
          {hoveredView === "graph" && (
              <TooltipPortal targetRef={btnRefs.graph}>{viewDescriptions.graph}</TooltipPortal>
          )}

           <button
            ref={btnRefs.regression}
            className={`view-button ${activeView === "regression" ? "active" : ""}`}
            onClick={() => setActiveView("regression")}
            onMouseEnter={() => setHoveredView("regression")}
            onMouseLeave={() => setHoveredView(null)}
          >
            <div className="view-icon">📏</div>
            <div className="view-text">Regression</div>
          </button>
          {hoveredView === "regression" && (
              <TooltipPortal targetRef={btnRefs.regression}>{viewDescriptions.regression}</TooltipPortal>
          )}

        </div>
      </div>
    </>
  );
}