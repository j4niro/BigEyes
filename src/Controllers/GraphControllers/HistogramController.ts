import GraphBar from "./GraphBar";
import type { TempAnomalyArea, TempAnomalyData } from "../../Redux/Slice/DataSlice";
import type { GraphInterface } from "./GraphInterface";
import { setCurrentLong, addLatitudeSelected, addAreaSelected, setAreaToCache } from "../../Redux/Slice/GlobalSlice";

export interface histogramControllerProperties {
    allAreas: TempAnomalyData;
    latitudesSelected: number[];
    currentYear: number;
    graphZoneOffset: number;
    dispatcher: (func: any) => any;
}

export default class HistogramController implements GraphInterface {
    // --- Canvas & Context ---
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private width: number = 0;
    private height: number = 0;

    // --- Configuration ---
    private offset: number;
    private offsetX: number;
    private offsetY: number;
    private colors = ["purple", "orange", "red", "green", "yellow", "black"];
    private nbBars = 89;
    
    // --- Données ---
    private rawData: TempAnomalyArea[] = [];
    private indexedData: Map<number, TempAnomalyArea[]> = new Map();
    
    // --- État Courant ---
    private lat: number[];
    private an: number;
    private minTemp: number = 0;
    private maxTemp: number = 0;
    private cachedArea:{lat:number, lon:number}|null = null;
    
    // --- Objets Graphiques (Ta classe) ---
    // On stocke les instances ici pour ne pas les recréer à chaque draw()
    private barsRef: GraphBar<{ lat: number, lon: number, temp: number }>[] = [];

    private dispatch: (func: any) => any;

    constructor(props: histogramControllerProperties) {
        this.rawData = props.allAreas.tempanomalies;
        this.lat = props.latitudesSelected;
        this.an = props.currentYear;
        this.offset = props.graphZoneOffset;
        this.dispatch = props.dispatcher;

        this.offsetX = this.offset * 1.5;
        this.offsetY = this.offset;

        // Initialisation de l'index une seule fois au démarrage
        this.buildIndex();
        // Pré-calcul des barres
        this.recalculateBars();
    }

    // ========================================================================
    // 1. OPTIMISATION DES DONNÉES (Indexation)
    // ========================================================================

    /**
     * Construit une Map pour accéder aux zones par latitude en O(1)
     * Ne doit être appelé que si rawData change.
     */
    private buildIndex() {
        this.indexedData.clear();
        for (const element of this.rawData) {
            if (!this.indexedData.has(element.lat)) {
                this.indexedData.set(element.lat, []);
            }
            this.indexedData.get(element.lat)?.push(element);
        }
    }

    /**
     * Met à jour les données depuis React.
     * Détecte les changements pour éviter des calculs inutiles.
     */
    updateData(ar: TempAnomalyArea[], lat: number[], an: number) {
        const dataChanged = this.rawData !== ar;
        const contextChanged = this.an !== an || JSON.stringify(this.lat) !== JSON.stringify(lat);

        this.rawData = ar;
        this.lat = lat;
        this.an = an;

        if (dataChanged) {
            this.buildIndex();
            this.recalculateBars();
        } else if (contextChanged) {
            // Si seulement l'année ou la lat change, on garde l'index mais on refait les barres
            this.recalculateBars();
        }
        
        // Note: Le dessin se fera via l'appel drawGraph() du composant juste après
        this.drawGraph();

    }

    setCanvas(canvas: HTMLCanvasElement | null) {
        if (this.canvas === canvas) return; // Évite re-set inutile
        
        this.canvas = canvas;
        this.ctx = canvas?.getContext("2d") || null;

        if (!this.canvas) return;

        const newWidth = this.canvas.width - this.offset * 2;
        const newHeight = this.canvas.height - this.offset * 2;

        // Si la taille change, on doit recalculer les positions (x,y,h) des barres
        if (this.width !== newWidth || this.height !== newHeight) {
            this.width = newWidth;
            this.height = newHeight;
            this.recalculateBars();
        }
    }

    // ========================================================================
    // 2. CRÉATION DES OBJETS "GraphBar" (Lourdeur contrôlée)
    // ========================================================================

    /**
     * C'est ici que la magie opère. On instancie tes classes GraphBar.
     * Cette fonction n'est appelée QUE si les données ou la taille changent.
     */
    private recalculateBars(): void {
        if (!this.ctx || this.width === 0 || this.height === 0) return;

        // 1. Extraction des valeurs pertinentes (Value Object pattern)
        const activeValues: { value: number; long: number; lat: number }[] = [];
        const validValues: number[] = [];

        for (let lat of this.lat) {
            const areas = this.indexedData.get(lat);
            // console.log("AREAS : ", areas);
            if (!areas) continue;

            for (const area of areas) {
                const yearValue = area.data.find((yv) => yv.year === this.an);
                if (yearValue && typeof yearValue.value === "number") {
                    activeValues.push({ value: yearValue.value, long: area.lon, lat: lat });
                    validValues.push(yearValue.value);
                }
            }
        }

        // 2. Calcul des extremums pour l'échelle
        if (validValues.length > 0) {
            this.minTemp = Math.min(...validValues) - 0.05;
            this.maxTemp = Math.max(...validValues);
        } else {
            this.minTemp = 0; 
            this.maxTemp = 0;
        }

        // 3. Instanciation des GraphBar
        this.barsRef = []; // On vide l'ancien cache
        
        const scaleY = (this.maxTemp - this.minTemp) === 0 ? 0 : this.height / (this.maxTemp - this.minTemp);
        const stepX = this.width / this.nbBars;

        // Fonction locale de mapping Longitude -> Index X
        const getXIndex = (long: number) => (long < -178 || long > 178) ? undefined : (long + 178) / 4;

        for (const item of activeValues) {
            const index = getXIndex(item.long);
            if (index === undefined) continue;

            const heightPix = (item.value - this.minTemp) * scaleY;
            
            // Calcul des coordonnées
            const x = this.offsetX + (index * stepX); 
            // Attention: ta logique X originale utilisait offset*1.5, je l'ai gardée. 
            // Vérifie si ce n'est pas this.offsetX tout court.
            
            const y = (this.offsetY + this.height) - heightPix;

            // Création de TA classe
            const newBar = new GraphBar(
                x + 1,
                y,
                stepX - 1,
                heightPix,
                this.colors[this.lat.indexOf(item.lat) % this.colors.length],
                this.ctx,
                { lat: item.lat, lon: item.long, temp: item.value }
            );

            this.barsRef.push(newBar);
        }

        // 4. Tri Z-Index (les plus grandes valeurs derrière, ou inversement selon ton goût)
        // Ceci assure que les petites barres ne sont pas cachées par les grandes
        this.barsRef.sort((a, b) => b.value.temp - a.value.temp);
    }


    // ========================================================================
    // 3. RENDU (Rapide)
    // ========================================================================

    drawGraph(): void {
        if (!this.canvas || !this.ctx) return;

        // Clear global
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.barsRef.length === 0) {
            this.drawEmptyData(); 
            return;
        }

        // Dessin du décor
        this.drawGraduations();
        this.drawAxis();
        this.drawLegend();

        // Dessin des barres (simple délégation)
        // Ici on ne fait aucun calcul, juste du dessin -> Très performant
        for (const bar of this.barsRef) {
            // On peut passer undefined pour utiliser la couleur par défaut définie dans le constructeur de GraphBar
            bar.draw(); 
        }

        const barselected = this.barsRef.find((o)=>o.getInfo().lat === this.cachedArea?.lat && o.getInfo().lon === this.cachedArea?.lon );
        barselected?.draw("red");
    }
    
    // ========================================================================
    // 4. INTERACTION
    // ========================================================================

    handleMouseDown = (event: React.MouseEvent) => {
        const data = this.detectClick(event);
        if (data) {
            this.cachedArea = {lat:data.lat, lon:data.lon};
            this.dispatch(setAreaToCache(this.cachedArea));
        }
    };

    private detectClick(event: React.MouseEvent) {
        if (!this.canvas) return undefined;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // On parcourt les barres existantes (déjà triées pour l'affichage)
        // On inverse la boucle pour cliquer sur celle qui est "devant" visuellement si superposition
        for (let i = this.barsRef.length - 1; i >= 0; i--) {
            const bar = this.barsRef[i];
            
            if (bar.contains(clickX, clickY)) {
                // Feedback visuel
                this.drawGraph(); // On reset le canvas
                bar.draw("red"); // On redessine celle-ci en rouge
                
                const info = bar.getInfo();
                console.log("Selected:", info);
                return info;
            }
        }
        return undefined;
    }

    setLong(long: number) {
        this.dispatch(setCurrentLong(long));
    }

    // ========================================================================
    // 5. DÉCOR (Axe, Légende, Graduations)
    // ========================================================================

    drawLegend(): void {
        if (!this.ctx) return;
        const marginRight = 80;
        
        for (let lat of this.lat) {
            const i = this.lat.indexOf(lat);
            this.ctx.save();
            this.ctx.font = "10px Verdana";
            this.ctx.textAlign = "left";
            this.ctx.fillStyle = this.colors[i % this.colors.length];
            this.ctx.fillText(`Lat ${lat}`, (this.offsetX) + i * marginRight, this.offsetY / 2);
            this.ctx.restore();
        }
    }

    drawAxis(): void {
        if (!this.ctx) return;
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = "black";

        // Ligne Y
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, this.offsetY);
        this.ctx.lineTo(this.offsetX, this.offsetY + this.height);
        this.ctx.lineTo(this.offsetX + this.width, this.offsetY + this.height);
        this.ctx.stroke();

        // Flèches (simplifiées pour la clarté)
        // Flèche Y
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, this.offsetY);
        this.ctx.lineTo(this.offsetX, this.offsetY - 10);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, this.offsetY - 10);
        this.ctx.lineTo(this.offsetX - 5, this.offsetY - 5);
        this.ctx.lineTo(this.offsetX + 5, this.offsetY - 5);
        this.ctx.lineTo(this.offsetX, this.offsetY - 10);
        this.ctx.fill();

        // Flèche X
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX + this.width, this.offsetY + this.height);
        this.ctx.lineTo(this.offsetX + this.width + 10, this.offsetY + this.height);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX + this.width + 10, this.offsetY + this.height);
        this.ctx.lineTo(this.offsetX + this.width + 5, this.offsetY + this.height - 5);
        this.ctx.lineTo(this.offsetX + this.width + 5, this.offsetY + this.height + 5);
        this.ctx.fill();

    }

    drawGraduations(): void {
        if (!this.ctx) return;
        
        // On s'assure que min/max sont à jour (déjà fait dans recalculateBars)
        const rangeTemp = this.maxTemp - this.minTemp;
        const precise = 10;
        const stepGradY = this.height / precise;

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "black";
        this.ctx.fillStyle = "black";

        // Y Graduations
        for (let i = 0; i <= precise; i++) {
            const yy = this.offsetY + this.height - i * stepGradY;
            const temp = this.minTemp + (rangeTemp * i) / precise;

            // Petit trait noir
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, yy);
            this.ctx.lineTo(this.offsetX - 5, yy);
            this.ctx.stroke();

            // Ligne grise horizontale
            this.ctx.save();
            this.ctx.strokeStyle = "rgba(128,128,128, 0.5)";
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, yy);
            this.ctx.lineTo(this.offsetX + this.width, yy);
            this.ctx.stroke();
            this.ctx.restore();

            this.ctx.fillText(temp.toFixed(2), this.offsetX - 35, yy + 3);
        }

        // X Graduations
        // J'ai nettoyé la logique ici pour utiliser stepX calculé proprement
        const stepX = this.width / this.nbBars;
        for (let i = 0; i <= this.nbBars; i++) {
            const xx = this.offsetX + i * stepX; // Attention au offsetX * 1.5 vs offsetX
            // Ici j'utilise offsetX car c'est le début de l'axe, à ajuster si ton layout est décalé
            
            // Logique d'affichage textuel (tous les 12 points ou fin)
            if (i % 12 === 0 || i === this.nbBars) {
                const lon = -178 + 4 * i;
                this.ctx.beginPath();
                this.ctx.moveTo(xx, this.offsetY + this.height);
                this.ctx.lineTo(xx, this.offsetY + this.height + 10);
                this.ctx.stroke();
                this.ctx.fillText(Math.round(lon).toString(), xx - 5, this.offsetY + this.height + 20);
            }else{
                this.ctx.beginPath();
                this.ctx.moveTo(xx, this.offsetY + this.height);
                this.ctx.lineTo(xx, this.offsetY + this.height + 5);
                this.ctx.stroke();
            }
        }
        
        // Labels axis Y
        this.ctx.save();
        this.ctx.translate(this.offsetX / 3, this.width / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText("Mean Anomalies", this.offsetX / 2, 0);
        this.ctx.restore();

        // Labels axis X
        this.ctx.save();
        this.ctx.textAlign = "center";
        this.ctx.fillText("Longitude", this.width /2 + this.offsetX, this.height + this.offsetY*(5/3)+5); // Position simplifiée
        this.ctx.restore();
    }

    drawEmptyData(): void {
        if (!this.canvas || !this.ctx) return;
        this.ctx.save();
        this.ctx.textAlign = "center";
        this.ctx.font = "15px Verdana";
        this.ctx.fillText("No data available...", this.width / 2 + this.offsetX, this.height / 2 + this.offsetY);
        this.ctx.restore();
    }
}