/* 
  Generic GraphView component

  WARNING : ONLY FOR GRAPH 'Graph View :)' PLEASE CREATE GROUP, EVEN FOR A SINGLE AREA SELECTED (We decided to plot data for areas groups only)

  WARNING : WHEN YOU CLICK A HISTOGRAM BAR, THE AREA CORRESPONDING APPEAR ON THE RED LATITUDE LINE ON THE MAP, BUT IT IS QUITE SMALL, SO, PLEASE PAY ATTENTION

  AI Assistance : ~90% (Ajusted after being generated from multiple components we coded. )

  GEMINI PROMPT : "
    - J'ai presque terminé mon projet, je suis entrain de le nettoyer.
    Voici la liste des composants de type graph que j'ai développés. Je veux un composant générique pour tous à qui on passe les propriétés appropriées en fonction du graphique que l'on veut afficher :...
  "
*/
import "./GraphView.css";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../Redux/Hooks/StoreHooks";

// Import des contrôleurs
import GraphController, { type graphControllerProperties } from "../Controllers/GraphControllers/GraphControler";
import HeatMapController, { type heatMapControllerProperties } from "../Controllers/GraphControllers/HeatMapControllers";
import HistogramController, { type histogramControllerProperties } from "../Controllers/GraphControllers/HistogramController";
import RegressionController, { type regressionControllerProperties } from "../Controllers/GraphControllers/RegressionController";
import type { TempAnomalyArea } from "../Redux/Slice/DataSlice";

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
    const selectedYear = useAppSelector((state) => state.globalState.yearRange.start);
    
    // Spécifique au graphe Standard
    const areasProvided = useAppSelector((state) => state.globalState.selectedAreas);
    const areasGroups = useAppSelector((state) => state.globalState.areaGroups);
    
    // Spécifique aux graphes Histogram et Regression
    const selectedLat = useAppSelector((state) => state.globalState.selectedLatitudes);
    const selectedLatVersion = useAppSelector((state) => state.globalState.selectedLatitudesVersion);

    function getAreaComputed():{tempA:TempAnomalyArea, groupId:number, color:string}[] {
        let areasComputed:{tempA:TempAnomalyArea, groupId:number, color:string}[] = [];

        for (const areaG of areasGroups) {
            for (const areaId of areaG.areaIds) {
                const area = areasProvided.find((o)=>o.id === areaId);
                for (const tempA of data.tempanomalies) {
                    if(!area?.scaledMetaData) continue;
                    if (tempA.lat>=area.scaledMetaData.minLat && tempA.lat<=area.scaledMetaData.maxLat && tempA.lon>=area.scaledMetaData.minLong && tempA.lon<=area.scaledMetaData.maxLong) {
                        areasComputed.push(
                            {
                                tempA : tempA,
                                groupId : areaG.id,
                                color: areaG.color
                            }
                        )
                    }
                }
            }
        }

        return areasComputed;
    }

    // --- 2. Initialisation du contrôleur (Constructor) ---
    useEffect(() => {
        // On évite de recréer le contrôleur s'il existe déjà pour le même type (optionnel, ici on reset si besoin)
        controllerRef.current = null; 

        if (type === 'standard') {

            const props: graphControllerProperties = {
                allAreas: data,
                graphZoneOffset: offset,
                areasIdentifiedByGroupID: getAreaComputed(),
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
                latitudesSelected: selectedLat.map((o)=>o.lat),
                currentYear: selectedYear,
                graphZoneOffset: offset,
                dispatcher: dispatch,
            };
            controllerRef.current = new HistogramController(props);

        } else if (type === 'regression') {
            const props: regressionControllerProperties = {
                allAreas: data,
                latitudesSelected: selectedLat.map((o)=>o.lat),
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
        canvas.height = 240; //rect.height;

        // Configuration du canvas
        controller.setCanvas(canvas);

        // Mise à jour des données selon le type (Logique spécifique à chaque contrôleur)
        switch (type) {
            case 'standard':
                // Cast explicite ou inférence pour accéder à la bonne méthode
                (controller as GraphController).updateData(getAreaComputed(), selectedYear);
                break;

            case 'heatmap':
                (controller as HeatMapController).updateData(data.tempanomalies);
                break;

            case 'histogram':
                (controller as HistogramController).updateData(data.tempanomalies, selectedLat.map((o)=>o.lat), selectedYear);
                break;

            case 'regression':
                (controller as RegressionController).updateData(data.tempanomalies, selectedLat.map((o)=>o.lat), selectedYear);
                break;
        }

    }, [
        // Dépendances : Tout ce qui peut déclencher un re-render
        type, 
        offset, 
        data, 
        selectedYear, 
        areasProvided.length,
        areasGroups.length, 
        selectedLat.map((o)=>o.lat), 
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