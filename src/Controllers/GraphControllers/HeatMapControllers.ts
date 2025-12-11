import GraphBar from "./GraphBar";
import type { TempAnomalyArea, TempAnomalyData } from "../../Redux/Slice/DataSlice";
import getTempAnomalyColor from "../../Utils/tempAnomalyColor";
import type { GraphInterface } from "./GraphInterface";
import { setCurrentLat, setYearRange, addLatitudeSelected } from "../../Redux/Slice/GlobalSlice";

export interface heatMapControllerProperties {
    allAreas : TempAnomalyData;
    graphZoneOffset: number;
    dispatcher:(func:any)=>any;
}

export default class HeatMapController implements GraphInterface {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private heatMatrixPaths: GraphBar<{ lat: number, year: number, temp: number }>[] = [];
    private heatMatrix: number[][] = [];
    private offset: number;
    private offsetX: number;
    private offsetY: number;
    private ar: TempAnomalyArea[];
    // private offscreenCanvas: HTMLCanvasElement | null = null;
    private selectedBar: GraphBar<any> | null = null;


    private dispatch:(func:any)=>any;

    constructor(props:heatMapControllerProperties) {
        this.ar = props.allAreas.tempanomalies;
        this.offset = props.graphZoneOffset;
        this.offsetX = this.offset * 1.5;
        this.offsetY = this.offset;
        this.dispatch = props.dispatcher ;
    }

    handleMouseDown = (event: React.MouseEvent) => {
        
            const info = this.onMouseDown(event);
            if(!info) return ;

            this.setYear(info.year);
            this.setLat(info.lat);
    };

    setYear(year:number) {
            this.dispatch(setYearRange({start:year, end:2025}));
        }
    
    setLat(lat:number){
        //this.dispatch(setCurrentLat(lat));
        this.dispatch(addLatitudeSelected({
            id:0, // will be updated by reducer
            lat:lat,
        }));
    }

    setCanvas(canvas: HTMLCanvasElement | null) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext("2d") || null;
    }

    updateData(ar: TempAnomalyArea[]) {
        this.ar = ar;

        this.drawGraph();
    }

    // Fonctions de conversion
    private X(an: number): number | undefined {
        if (an < 1880 || an > 2025) return undefined;
        return an - 1880;
    }

    private Y(lat: number): number | undefined {
        if (lat < -88 || lat > 88 || lat % 4 !== 0) return undefined;
        return (lat + 88) / 4;
    }

    private tX(an: number): number | undefined {
        if (an < 0 || an > 145) return undefined;
        return an + 1880;
    }

    private tY(lat: number): number | undefined {
        if (lat < 0 || lat > 44) return undefined;
        return 4 * lat - 88;
    }

    initializeData(): void {
        const _heatMatrix: number[][] = [];
        const nbLongitude = 89;

        for (const area of this.ar) {
            const y = this.Y(area.lat);
            if (y === undefined) continue;

            for (const yv of area.data.values()) {
                const x = this.X(yv.year);
                if (x === undefined || yv.value === "NA") continue;

                if (!_heatMatrix[x]) _heatMatrix[x] = [];
                if (_heatMatrix[x][y] === undefined) _heatMatrix[x][y] = 0;

                _heatMatrix[x][y] += yv.value / nbLongitude;
            }
        }

        this.heatMatrix = _heatMatrix;

        //-------------------------------------------------------------

        if (!this.ctx || !this.canvas) return;

        const w = this.canvas.width - this.offset * 2;
        const h = this.canvas.height - this.offset * 2;

        const stepX = w / 146;
        const stepY = h / 45;

        this.heatMatrixPaths = [];

        for (let x = 0; x < this.heatMatrix.length; x++) {
            for (let y = 0; y < this.heatMatrix[x].length; y++) {
                const pos = this.CoordToPos(x, y, stepX, stepY);
                const temp = this.heatMatrix[x][y];
                if (!pos) continue;
                const year = this.tX(x);
                const lat = this.tY(y);

                if (lat === undefined || year === undefined || temp === undefined) continue;

                const newSquare = new GraphBar(
                    pos.x,
                    pos.y,
                    stepX,
                    stepY,
                    getTempAnomalyColor(temp),
                    this.ctx,
                    { year: year, lat: lat, temp: temp }
                );
                this.heatMatrixPaths.push(newSquare);
            }
        }

    }

    onMouseDown(event: React.MouseEvent): { lat: number, year: number, temp: number } | undefined  {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        for (const bar of this.heatMatrixPaths) {
            if (bar.contains(clickX, clickY)) {
                const info = bar.getInfo();
                this.selectedBar = bar; // Mémorisation directe
        
                //this.redrawGraph(); // redessine avec la bonne sélection
                return info;
            }

        }
    }

    redrawGraph(): void {
        if (!this.canvas || !this.ctx) return;

        // Efface le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Redessine axes + graduations
        this.drawGraduations();
        this.drawAxis();

        // Redessine carrés
        for (const bar of this.heatMatrixPaths) {
            const info = bar.getInfo();
            bar.draw(getTempAnomalyColor(info.temp)); // normal

        }
    }

    drawAxis(): void {
        if (!this.canvas || !this.ctx) return;

        const x = this.offset * 1.5;
        const y = this.offset;
        const w = this.canvas.width - this.offset * 2;
        const h = this.canvas.height - this.offset * 2;

        this.ctx.strokeStyle = "#333";
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + h);
        this.ctx.lineTo(x + w, y + h);
        this.ctx.stroke();

        // Flèche Y
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y - 10);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 10);
        this.ctx.lineTo(x - 5, y - 5);
        this.ctx.lineTo(x + 5, y - 5);
        this.ctx.lineTo(x, y - 10);
        this.ctx.fill();

        // Flèche X
        this.ctx.beginPath();
        this.ctx.moveTo(x + w, y + h);
        this.ctx.lineTo(x + w + 10, y + h);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x + w + 10, y + h);
        this.ctx.lineTo(x + w + 5, y + h - 5);
        this.ctx.lineTo(x + w + 5, y + h + 5);
        this.ctx.fill();
    }

    drawGraduations(): { stepX: number; stepY: number } {
        if (!this.canvas || !this.ctx) return { stepX: 0, stepY: 0 };

        const x = this.offset * 1.5;
        const y = this.offset;
        const w = this.canvas.width - this.offset * 2;
        const h = this.canvas.height - this.offset * 2;

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "#000000";
        this.ctx.fillStyle = "#000000";

        const nbBars = 45;
        const nbYears = 146;
        const stepY = h / nbBars;
        const stepX = w / nbYears;

        // Graduations Y
        for (let i = 0; i <= nbBars; i++) {
            const yy = y + i * stepY;

            this.ctx.beginPath();
            this.ctx.moveTo(x, yy);
            i % 4 ? this.ctx.lineTo(x - 5, yy) : this.ctx.lineTo(x - 10, yy);
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.lineWidth = 0.25;
            this.ctx.strokeStyle = "grey";
            this.ctx.moveTo(x, yy);
            this.ctx.lineTo(x + w, yy);
            this.ctx.stroke();
            this.ctx.restore();

            if (i % 4 === 0 || i === -88 || i === 88) {
                const lon = -88 + 4 * i;
                this.ctx.fillText((-lon).toString(), x - 25, yy + 3);
            }
        }

        // Nom Y
        this.ctx.save();
        this.ctx.translate((this.offset * 1.5) / 3, w / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText("Latitude", (this.offset * 1.5) / 2 - 5, 0);
        this.ctx.restore();

        // Graduation X
        let year = 1880;
        this.ctx.lineWidth = 1;
        for (let index = 0; index < w && year + index <= 2025; index += 1) {
            const step = this.offset * 1.5 + (index * w) / 146;

            this.ctx.beginPath();
            this.ctx.moveTo(step, h + this.offset);
            index % 15 ? this.ctx.lineTo(step, h + this.offset + 5) : this.ctx.lineTo(step, h + this.offset + 8);
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.strokeStyle = "grey";
            this.ctx.lineWidth = 0.25;
            this.ctx.beginPath();
            this.ctx.moveTo(step, h + this.offset);
            this.ctx.lineTo(step, this.offset);
            this.ctx.stroke();
            this.ctx.restore();

            this.ctx.save();
            this.ctx.translate(step - 40, h + this.offset + 15);
            index % 15 || year + index === 2025 ? null : this.ctx.fillText((year + index).toString(), (this.offset * 1.5) / 2, 5);
            this.ctx.restore();
        }

        // Nom X
        this.ctx.save();
        this.ctx.translate(w / 2 + (this.offset * 1.5) / 3, h + (this.offset * 5) / 3);
        this.ctx.fillText("Year", (this.offset * 1.5) / 2, 5);
        this.ctx.restore();

        return { stepX, stepY };
    }

    CoordToPos(x: number, y: number, stepX: number, stepY: number): { x: number; y: number } | undefined {
        if (!this.canvas) return;

        const newPos = { x: 0, y: 0 };
        newPos.x = x * stepX + this.offsetX;
        newPos.y = this.canvas.height - this.offsetY - (y + 1) * stepY;

        return { ...newPos };
    }

    drawGraph(): void {
        if (!this.canvas || !this.ctx) return;

        this.initializeData(); // Calcule la matrice

        // 1. Créer ou redimensionner le canvas hors-écran
        // if (!this.offscreenCanvas) {
        //     this.offscreenCanvas = document.createElement('canvas');
        // }
        // this.offscreenCanvas.width = this.canvas.width;
        // this.offscreenCanvas.height = this.canvas.height;

        // const osCtx = this.offscreenCanvas.getContext('2d');
        // if (!osCtx) return;

        // 2. Dessiner sur le canvas HORS-ÉCRAN (offscreen)
        // Note: Il faut temporairement dire à vos méthodes de dessiner sur osCtx
        // ou bien copier le résultat final. 
        // Pour simplifier sans casser vos objets GraphBar, on va dessiner sur le vrai canvas
        // puis sauvegarder le résultat.
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawAxis();        // Dessine sur this.ctx
        this.drawGraduations(); // Dessine sur this.ctx
        
        this.heatMatrixPaths.forEach(square => {
            // Attention: GraphBar dessine probablement sur this.ctx par défaut
            // Assurez-vous qu'il dessine sa couleur "normale" (non sélectionnée) ici
            square.draw(); 
        });

        // 3. COPIER le résultat final dans le canvas hors-écran pour sauvegarde
        // osCtx.drawImage(this.canvas, 0, 0);

        if (this.selectedBar) {
                this.selectedBar.draw("black"); // Dessine juste celui-ci en noir
                console.log("OK BAR");
            }
    }
}