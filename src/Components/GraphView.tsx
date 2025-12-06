import "./GraphView.css";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../Redux/Hooks/StoreHooks";

// Import des contrôleurs
import GraphController, { type graphControllerProperties } from "../Controllers/GraphControllers/GraphControler";
import HeatMapController, { type heatMapControllerProperties } from "../Controllers/GraphControllers/HeatMapControllers";
import HistogramController, { type histogramControllerProperties } from "../Controllers/GraphControllers/HistogramController";
import RegressionController, { type regressionControllerProperties } from "../Controllers/GraphControllers/RegressionController";

// Définition des types de graphes disponibles
export type GraphType = 'standard' | 'heatmap' | 'histogram' | 'regression';

interface Props {
    type: GraphType;
    offset?: number;
}

// Union type pour le contrôleur stocké dans le ref
type AnyController = GraphController | HeatMapController | HistogramController | RegressionController;

export default function GraphView({ type, offset = 40 }: Props) {
    const divRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const controllerRef = useRef<AnyController | null>(null);

    const dispatch = useAppDispatch();

    // --- 1. Récupération centralisée de TOUTES les données nécessaires via Redux ---
    const data = useAppSelector((state) => state.data.tempData);
    const selectedYear = useAppSelector((state) => state.globalState.currentYear);
    
    // Spécifique au graphe Standard
    const areasProvided = useAppSelector((state) => state.globalState.selectedAreas);
    
    // Spécifique aux graphes Histogram et Regression
    const selectedLat = useAppSelector((state) => state.globalState.currentLat);
    const selectedLatVersion = useAppSelector((state) => state.globalState.selectedLatitudesVersion);

    // --- 2. Initialisation du contrôleur (Constructor) ---
    useEffect(() => {
        // On évite de recréer le contrôleur s'il existe déjà pour le même type (optionnel, ici on reset si besoin)
        controllerRef.current = null; 

        if (type === 'standard') {
            const props: graphControllerProperties = {
                allAreas: data,
                graphZoneOffset: offset,
                areasIdentifiedByGroupID: areasProvided,
                currentYear: selectedYear,
                dispatcher: dispatch,
            };
            controllerRef.current = new GraphController(props);

        } else if (type === 'heatmap') {
            const props: heatMapControllerProperties = {
                allAreas: data,
                graphZoneOffset: offset,
                dispatcher: dispatch,
            };
            controllerRef.current = new HeatMapController(props);

        } else if (type === 'histogram') {
            const props: histogramControllerProperties = {
                allAreas: data,
                latitudesSelected: [selectedLat],
                currentYear: selectedYear,
                graphZoneOffset: offset,
                dispatcher: dispatch,
            };
            controllerRef.current = new HistogramController(props);

        } else if (type === 'regression') {
            const props: regressionControllerProperties = {
                allAreas: data,
                latitudesSelected: [selectedLat, 0, -86], // Logique issue de ton composant 4
                currentYear: selectedYear,
                graphZoneOffset: offset,
                dispatcher: dispatch,
            };
            controllerRef.current = new RegressionController(props);
        }

    // On re-initialise si le type change
    }, [type]); 


    // --- 3. Gestion du Rendu et Mise à jour des données (Update & Draw) ---
    useEffect(() => {
        const div = divRef.current;
        const canvas = canvasRef.current;
        const controller = controllerRef.current;

        if (!div || !canvas || !controller) return;

        // Mise à jour des dimensions
        const rect = div.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Configuration du canvas
        controller.setCanvas(canvas);

        // Mise à jour des données selon le type (Logique spécifique à chaque contrôleur)
        switch (type) {
            case 'standard':
                // Cast explicite ou inférence pour accéder à la bonne méthode
                (controller as GraphController).updateData(data, areasProvided, selectedYear);
                break;

            case 'heatmap':
                (controller as HeatMapController).updateData(data.tempanomalies);
                break;

            case 'histogram':
                // Note: Tu avais [selectedLat, 0] en dur dans ton composant 3
                (controller as HistogramController).updateData(data.tempanomalies, [selectedLat, 0], selectedYear);
                break;

            case 'regression':
                (controller as RegressionController).updateData(data.tempanomalies, [selectedLat, 0], selectedYear);
                break;
        }

        // Dessin final
        controller.drawGraph();

    }, [
        // Dépendances : Tout ce qui peut déclencher un re-render
        type, 
        offset, 
        data, 
        selectedYear, 
        areasProvided, 
        selectedLat, 
        selectedLatVersion
    ]);

    // --- 4. Gestion des événements ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (controllerRef.current && controllerRef.current.handleMouseDown) {
            // On s'assure de lier le contexte ou d'appeler la méthode directement
            controllerRef.current.handleMouseDown(e); 
        } else if (controllerRef.current && 'onMouseDown' in controllerRef.current) {
             // Cas où la méthode s'appellerait onMouseDown dans certains contrôleurs (vu dans HistogramController précédent)
             (controllerRef.current as any).onMouseDown(e);
        }
    };

    return (
        <div ref={divRef} className={type === 'histogram' || type === 'regression' ? "histogram-area" : "graph-area"}>
            <canvas ref={canvasRef} onMouseDown={handleMouseDown} />
        </div>
    );
}