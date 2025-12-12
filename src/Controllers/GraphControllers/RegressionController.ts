/* 
  Controller Regression View

  AI Assistance : ~100% (Except from my own ajustment due to common debugging task)

  GEMINI PROMPT : "
    ça va.
    Je veux maintenant que tu code un nouveau composant graph qui s'inspire de ma structure habituelle que je te mets ci-dessous. 
    Le nouveau graphe doit afficher les droites de regression des anomalies de températures
  "
*/
import type { TempAnomalyArea, TempAnomalyData } from "../../Redux/Slice/DataSlice";
import { setYearRange } from "../../Redux/Slice/GlobalSlice";

interface RegressionLine {
    lat: number;
    slope: number;     // coefficient directeur (a)
    intercept: number; // ordonnée à l'origine (b)
    color: string;
    points: {x: number, y: number}[]; // Points réels pour debug ou scatter plot si besoin
}

export interface regressionControllerProperties {
    allAreas: TempAnomalyData;
    latitudesSelected: number[];
    currentYear: number;
    graphZoneOffset: number;
    dispatcher:(func:any)=>any;
}

export default class RegressionController {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    
    // Données brutes
    private ar: TempAnomalyArea[];
    private lat: number[];
    
    // Données calculées
    private lines: RegressionLine[] = [];

    // Configuration
    private offset: number;
    private offsetX: number;
    private offsetY: number;
    private width: number = 0;
    private height: number = 0;

    private minYear = 1880;
    private maxYear = 2025;

    private yearRef: number;

    private colors = ["purple", "orange", "red", "green", "yellow", "black"];

    private dispatch:(func:any)=>any;

    private isEmpty:boolean = true;

    constructor(props:regressionControllerProperties) {
        this.ar = props.allAreas.tempanomalies;
        this.lat = props.latitudesSelected;
        this.offset = props.graphZoneOffset;
        this.offsetX = this.offset * 1.5;
        this.offsetY = this.offset;
        this.yearRef = props.currentYear;

        this.dispatch = props.dispatcher;
    }

    setYear(year:number) {
        this.dispatch(setYearRange({start:year, end:2025}));
    }

    handleMouseDown = (event: React.MouseEvent) => {
        if(this.isEmpty) return ;
        const year = this.onMouseDown(event);
        if(year === undefined) return ;
        this.setYear(Math.round(year));
    };

    setCanvas(canvas: HTMLCanvasElement | null) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext("2d") || null;

        if (!this.canvas) return;

        this.width = this.canvas.width - this.offset * 2;
        this.height = this.canvas.height - this.offset * 2;
    }

    updateData(ar: TempAnomalyArea[], lat: number[], an:number) {
        this.ar = ar;
        this.lat = lat;
        this.yearRef = an;

        this.drawGraph();
    }

    // Calcul des min/max pour l'échelle Y (Température)
    private extremValues(): { min: number; max: number } {
        let minV = 0;
        let maxV = 0;
        let hasData = false;

        this.lines.forEach(line => {
             // On regarde les points extrêmes de la droite de régression (en 1880 et 2025)
             const y1 = line.slope * this.minYear + line.intercept;
             const y2 = line.slope * this.maxYear + line.intercept;
             
             // On regarde aussi les vraies données pour être sûr que tout rentre
             const dataMin = Math.min(...line.points.map(p => p.y));
             const dataMax = Math.max(...line.points.map(p => p.y));

             const localMin = Math.min(y1, y2, dataMin);
             const localMax = Math.max(y1, y2, dataMax);

             if (!hasData) {
                 minV = localMin;
                 maxV = localMax;
                 hasData = true;
             } else {
                 minV = Math.min(minV, localMin);
                 maxV = Math.max(maxV, localMax);
             }
        });

        // Marge de sécurité
        return { min: minV - 0.5, max: maxV + 0.5 };
    }

    // Algorithme des moindres carrés pour calculer a et b (y = ax + b)
    private calculateLinearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
        const n = data.length;
        if (n === 0) return { slope: 0, intercept: 0 };

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        for (const point of data) {
            sumX += point.x;
            sumY += point.y;
            sumXY += point.x * point.y;
            sumXX += point.x * point.x;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    private drawYearLine(year: number): void {
        if (!this.canvas || !this.ctx) return;

        const scaleX = this.width / 146;
        const xGraph = (year - 1880) * scaleX;
        // console.log("XGRAPH ", xGraph);
        // console.log("WIDTH ", this.width);
        // console.log("YEAR ", year);

        if (xGraph < 0 || xGraph > this.width) return;

        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX + xGraph, this.offsetY);
        this.ctx.lineTo(this.offsetX + xGraph, this.offsetY + this.height);
        this.ctx.strokeStyle = "red";
        this.ctx.lineWidth = 1.5;
        // console.log("LINE DRAWN");
        this.ctx.stroke();
    }

    onMouseDown(event: React.MouseEvent): number|undefined {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        
        const scaleX = this.width / 146;
        const xGraph = clickX - this.offsetX;

        if (xGraph < 0 || xGraph > this.width) return;

        const year = 1880 + xGraph / scaleX;
        this.yearRef = year;
        // console.log("YEAR : ", Math.round(year));

        //this.redrawGraph();
        this.drawYearLine(year);

        return year
    }

    initializeData(): void {
        this.lines = [];

        // Pour chaque latitude sélectionnée
        this.lat.forEach((targetLat, index) => {
            // Trouver la zone correspondante
            const area = this.ar.find(a => a.lat === targetLat);
            if (!area) return;

            // Extraire les données valides (exclure NA)
            // On suppose que data est [{year: number, value: number | "NA"}]
            const cleanData: { x: number; y: number }[] = [];
            
            area.data.forEach(d => {
                if (d.value !== "NA" && typeof d.value === "number") {
                    cleanData.push({ x: d.year, y: d.value });
                }
            });

            if (cleanData.length > 1) {
                const { slope, intercept } = this.calculateLinearRegression(cleanData);
                this.lines.push({
                    lat: targetLat,
                    slope,
                    intercept,
                    color: this.colors[index % this.colors.length],
                    points: cleanData
                });
            }
        });
    }

    drawEmptyData():void{
        if (!this.canvas || !this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.textAlign = "center";
        this.ctx.font = "15px Verdana";
        this.ctx.fillText("No data available...", this.width / 2, this.height*3/4);
        this.ctx.restore();

        this.isEmpty = true ;
        
    }

    drawGraph(): void {
        if (!this.canvas || !this.ctx || this.lat.length === 0) {this.drawEmptyData(); return};

        this.isEmpty = false;

        // Reset
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculs
        this.initializeData();
        
        // Dessin
        this.drawAxis();
        const meta = this.drawGraduations();
        this.drawRegressionLines(meta);
        this.drawLegend();

        //ligne rouge
        this.drawYearLine(this.yearRef);
    }

    redrawGraph() {
        this.drawGraph();
    }

    drawRegressionLines(meta: { scaleY: number, minTemp: number }): void {
        if (!this.ctx) return;

        const { scaleY, minTemp } = meta;
        const h = this.height;

        // Fonction locale pour convertir Année -> Pixel X
        const getX = (year: number) => {
            const rangeYear = this.maxYear - this.minYear;
            return this.offsetX + ((year - this.minYear) / rangeYear) * this.width;
        };

        // Fonction locale pour convertir Temp -> Pixel Y
        const getY = (temp: number) => {
            // Attention: Y grandit vers le bas, donc on inverse
            const heightPix = (temp - minTemp) * scaleY;
            return this.offsetY + h - heightPix;
        };

        this.lines.forEach(line => {
            this.ctx!.beginPath();
            this.ctx!.strokeStyle = line.color;
            this.ctx!.lineWidth = 3;

            // Point de départ (1880)
            const yStart = line.slope * this.minYear + line.intercept;
            const xStartPixel = getX(this.minYear);
            const yStartPixel = getY(yStart);

            // Point de fin (2025)
            const yEnd = line.slope * this.maxYear + line.intercept;
            const xEndPixel = getX(this.maxYear);
            const yEndPixel = getY(yEnd);

            this.ctx!.moveTo(xStartPixel, yStartPixel);
            this.ctx!.lineTo(xEndPixel, yEndPixel);
            this.ctx!.stroke();

            // Optionnel : Dessiner des petits points pour les données réelles (Scatter)
            // Pour alléger, on peut le commenter ou le rendre plus discret
            
            this.ctx!.fillStyle = line.color;
            this.ctx!.globalAlpha = 0.5; // transparent
            line.points.forEach(p => {
                this.ctx!.beginPath();
                this.ctx!.arc(getX(p.x), getY(p.y), 2, 0, Math.PI * 2);
                this.ctx!.fill();
            });
            this.ctx!.globalAlpha = 1.0;
            
        });
    }

    drawLegend(): void {
        if (!this.ctx) return;

        const marginRight = 80;
        this.ctx.font = "10px Verdana";
        this.ctx.textAlign = "left";

        this.lines.forEach((line, i) => {
            this.ctx!.fillStyle = line.color;
            // Positionner la légende en haut
            this.ctx!.fillText(`Lat: ${line.lat}`, (this.offsetX) + i * marginRight, this.offsetY / 2);
        });
    }

    drawAxis(): void {
        if (!this.canvas || !this.ctx) return;

        // this.drawTitle();
        this.drawLegend();

        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = "#000000";

        // Axes
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, this.offsetY);
        this.ctx.lineTo(this.offsetX, this.offsetY + this.height);
        this.ctx.lineTo(this.offsetX + this.width, this.offsetY + this.height);
        this.ctx.stroke();

        // Nom Y
        this.ctx.save();
        this.ctx.translate(this.offsetX / 3, this.width / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText("Mean Anomalies", this.offsetX / 2, 0);
        this.ctx.restore();

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

        // Nom X
        this.ctx.save();
        this.ctx.translate(this.width / 2 + this.offsetX / 3, this.height + (this.offset * 5) / 3);
        this.ctx.fillText("year", this.offsetX / 2, 5);
        this.ctx.restore();

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

    drawGraduations(): { scaleY: number; minTemp: number } {
        if (!this.canvas || !this.ctx) return { scaleY: 1, minTemp: 0 };

        const { min, max } = this.extremValues();
        const rangeTemp = max - min;
        
        // Echelle Y
        const scaleY = rangeTemp === 0 ? 1 : this.height / rangeTemp;

        // Graduations Y (Température)
        const nbGradY = 10;
        this.ctx.textAlign = "right";
        this.ctx.font = "10px Arial";
        this.ctx.strokeStyle = "#e0e0e0"; // Gris clair pour la grille

        for (let i = 0; i <= nbGradY; i++) {
            const val = min + (rangeTemp * i) / nbGradY;
            const yPos = this.offsetY + this.height - (val - min) * scaleY;
            
            this.ctx.beginPath();
            this.ctx.strokeStyle = "black";
            this.ctx.moveTo(this.offsetX, yPos);
            this.ctx.lineTo(this.offsetX - 5, yPos);
            this.ctx.stroke();

            // Texte
            this.ctx.fillStyle = "black";
            this.ctx.fillText(val.toFixed(2), this.offsetX - 5, yPos + 3);
        }

        // Graduations X (Années)
        this.ctx.textAlign = "center";
        let year = 1880;
        this.ctx.lineWidth = 1;
        for (let index = 0; index < this.width && year + index <= 2025; index += 1) {
            const step = this.offsetX + (index * this.width) / 146;
            this.ctx.beginPath();
            this.ctx.moveTo(step, this.height + this.offsetY);
            index % 15 ? this.ctx.lineTo(step, this.height + this.offsetY + 5) : this.ctx.lineTo(step, this.height + this.offsetY + 8);
            this.ctx.stroke();
            this.ctx.save();
            index % 15 || year + index === 2025 ? null : this.ctx.fillText((year + index).toString(), step, this.height + this.offsetY + 16);
            this.ctx.restore();
        }

        return { scaleY, minTemp: min };
    }
}