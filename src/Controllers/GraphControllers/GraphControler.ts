import type { TempAnomalyArea, TempAnomalyData, YearValue } from "../../Redux/Slice/DataSlice";
import { setCurrentYear } from "../../Redux/Slice/GlobalSlice";
import type { GraphInterface } from "./GraphInterface";


export interface graphControllerProperties {
    allAreas : TempAnomalyData;
    areasIdentifiedByGroupID:TempAnomalyArea[];
    currentYear: number;
    graphZoneOffset: number;
    dispatcher:(func:any)=>any;
}

export default class GraphController implements GraphInterface {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    private offset: number;
    private offsetX:number;
    private offsetY:number;

    private width:number = 0;
    private height:number = 0;

    private ar: TempAnomalyArea[][];   // <--- plusieurs groupes
    private allAreas:TempAnomalyData;
    private areasProvided:TempAnomalyArea[];

    // private an: number;
    private yearRef: number;

    private colors:string[] = ["blue", "red", "green", "orange", "purple", "black"];

    private allMeanData: Array<{
        groupName: string;
        means: YearValue[];
    }> = [];

    private extremValues = { min: 100, max: -100 };

    private dispatch : (func:any)=>any;

    constructor(props:graphControllerProperties) {
        
        //console.log("LEN", this.ar.length);
        // this.an = an;
        this.yearRef = props.currentYear;
        this.offset = props.graphZoneOffset;

        this.offsetX=this.offset*1.5;
        this.offsetY=this.offset;

        this.dispatch = props.dispatcher;

        this.areasProvided = props.areasIdentifiedByGroupID;
        this.allAreas = props.allAreas;

        const _areasProvided = [this.getAreaToRender()];

        //Simulation de plusieurs groupes de plusieurs area
        _areasProvided[0] !== undefined ? this.ar = [[..._areasProvided[0].slice(0, 5)], [..._areasProvided[0].slice(1100, 3000)], [..._areasProvided[0].slice(3100, 4000)]] : this.ar = [];
        console.log("AREAS", this.ar);
    }

    getAreaToRender(): TempAnomalyArea[] | undefined {
        //TODO : prendre toutes les Area dans this.areasProvided et les regrouper par tableau de Area ayan le même Group ID puis 
        if (this.areasProvided.length === 0) {
            if (this.allAreas.tempanomalies.length === 0) {
                return ;
            }
            return this.allAreas.tempanomalies ;
        };
        return this.areasProvided ;
    }

    drawLegend():void{
        if (!this.canvas || !this.ctx) return ;

        const marginRight = 80;
                
        for (let i=0; i<this.ar.length; i++) {
            this.ctx.save();

            this.ctx.font = "10px Verdana";
            this.ctx.textAlign = "left";
            this.ctx.fillStyle = this.colors[i];

            this.ctx.fillText(`Group ${i}`, (this.offsetX)+i*marginRight, this.offsetY/2);
            
            this.ctx.restore();
        }
        
    }

    setYear(year:number) {
          this.dispatch(setCurrentYear(year));
    }

    handleMouseDown = (event: React.MouseEvent) => {
        
            const year = this.onMouseDown(event);
            if(year === undefined) return ;
            this.setYear(Math.round(year));
        
    };

    setCanvas(canvas: HTMLCanvasElement | null) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext("2d") || null;

        if(!this.canvas) return ;

        this.width = this.canvas.width - this.offset * 2;
        this.height = this.canvas.height - this.offset * 2;
    }

    updateData(allA:TempAnomalyData, areaP:TempAnomalyArea[], an: number) {

        this.areasProvided = areaP;
        this.allAreas = allA;
        const _areasProvided = [this.getAreaToRender()];
        _areasProvided[0] !== undefined ? this.ar = [[..._areasProvided[0].slice(0, 5)], [..._areasProvided[0].slice(1100, 3000)], [..._areasProvided[0].slice(3100, 4000)]] : this.ar = [];
        // this.an = an;
        this.yearRef = an;
    }

    private drawYearLine(year: number): void {
        if (!this.canvas || !this.ctx) return;

        const scaleX = this.width / 146;
        const xGraph = (year - 1880) * scaleX;

        if (xGraph < 0 || xGraph > this.width) return;

        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX + xGraph, this.offsetY);
        this.ctx.lineTo(this.offsetX + xGraph, this.offsetY + this.height);
        this.ctx.strokeStyle = "red";
        this.ctx.lineWidth = 1.5;
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
        console.log("YEAR : ", Math.round(year));

        this.redrawGraph();
        this.drawYearLine(year);

        return year
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
        this.ctx.fillText("mean temperature", this.offsetX / 2, 0);
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

    drawGraduations(): { scaleX: number; scaleY: number } {
        if (!this.canvas || !this.ctx) return { scaleX: 0, scaleY: 0 };

        const minTemp = this.extremValues.min;
        const maxTemp = this.extremValues.max;

        // Graduation Y
        let temp = minTemp;
        this.ctx.lineWidth = 1;
        for (let index = 0; temp < maxTemp; index += 15) {
            const step = this.offsetY + this.height - index;
            temp = minTemp + (index * (maxTemp - minTemp)) / this.height;
            if (temp < maxTemp) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.offsetX, step);
                this.ctx.lineTo(this.offsetX - 5, step);
                this.ctx.stroke();
                this.ctx.save();
                this.ctx.translate(this.offsetX - 30, step);
                this.ctx.fillText(temp.toFixed(1), 0, 0);
                this.ctx.restore();
            }
        }

        // Graduation X
        let year = 1880;
        this.ctx.lineWidth = 1;
        for (let index = 0; index < this.width && year + index <= 2025; index += 1) {
            const step = this.offsetX + (index * this.width) / 146;
            this.ctx.beginPath();
            this.ctx.moveTo(step, this.height + this.offsetY);
            index % 15 ? this.ctx.lineTo(step, this.height + this.offsetY + 5) : this.ctx.lineTo(step, this.height + this.offsetY + 8);
            this.ctx.stroke();
            this.ctx.save();
            this.ctx.translate(step-40, this.height + this.offsetY + 15);
            index % 15 || year + index === 2025 ? null : this.ctx.fillText((year + index).toString(), this.offsetX / 2, 5);
            this.ctx.restore();
        }

        return { scaleX: this.width / 146, scaleY: (maxTemp - minTemp) / this.height };
    }

    //----------------------------------------------
    // EXTREM VALUES FOR ALL GROUPS
    //----------------------------------------------
    private calculateExtremValues(): { min: number; max: number } {
        let minV = 100;
        let maxV = -100;

        for (const group of this.ar) {
            const res = this.calculateSingleExtremValues(group, { min: minV, max: maxV });
            minV = res.min;
            maxV = res.max;
        }

        return { min: minV, max: maxV };
    }

    private calculateSingleExtremValues(
        ar: TempAnomalyArea[],
        init?: { min: number; max: number }
    ): { min: number; max: number } {

        let minV = init?.min ?? 100;
        let maxV = init?.max ?? -100;

        for (let e of ar) {
            const vals = e.data.map((o) => Number(o.value) || 0);
            minV = Math.min(minV, Math.min(...vals));
            maxV = Math.max(maxV, Math.max(...vals));
        }
        return { min: minV, max: maxV };
    }

    //----------------------------------------------
    // BUILD MEAN DATA FOR EACH GROUP
    //----------------------------------------------
    initializeData(): void {
        this.extremValues = this.calculateExtremValues();
        this.allMeanData = [];

        for (let groupIndex = 0; groupIndex < this.ar.length; groupIndex++) {
            //console.log("LEN : ", this.ar.length, "STEP : ", groupIndex);
            const areaGroup = this.ar[groupIndex];

            const yearMap = new Map<number, { sum: number; count: number }>();

            for (let serie of areaGroup) {
                for (let yv of serie.data) {
                    const year = yv.year;
                    const val = Number(yv.value);
                    if (!yearMap.has(year)) yearMap.set(year, { sum: 0, count: 0 });
                    if (!isNaN(val)) {
                        const e = yearMap.get(year)!;
                        e.sum += val;
                        e.count++;
                    }
                }
            }

            const means = [...yearMap.entries()]
                .map(([year, { sum, count }]) => ({
                    year,
                    value: sum / count,
                }))
                .sort((a, b) => a.year - b.year);

            this.allMeanData.push({
                groupName: `Group ${groupIndex + 1}`,
                means,
            });
        }

        //console.log("ALL MEAN", this.allMeanData);
    }

    //----------------------------------------------
    // DRAW GRAPH (MULTI SERIES)
    //----------------------------------------------
    drawGraph(): void {
        if (!this.canvas || !this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.initializeData();
        this.drawAxis();

        const scale = this.drawGraduations();

        // --- MULTISERIES DRAW ---

        for (let i = 0; i < this.allMeanData.length; i++) {
            const serie = this.allMeanData[i].means;
            const color = this.colors[i % this.colors.length];
            this.drawLineAndPoints(serie, scale, color);
        }

        this.drawYearLine(this.yearRef);
    }

    //----------------------------------------------
    // DRAW A SINGLE SERIES
    //----------------------------------------------
    private drawLineAndPoints(
        data: YearValue[],
        scale: { scaleX: number; scaleY: number },
        color: string
    ): void {
        if (!this.canvas || !this.ctx) return;

        const height = this.canvas.height - this.offset * 2;
        const minTemp = this.extremValues.min;

        // ---- LINE ----
        this.ctx.beginPath();
        let started = false;

        for (let yv of data) {
            const val = Number(yv.value);
            if (!val) continue;

            const x = this.offsetX + (yv.year - 1880) * scale.scaleX;
            const y = this.offsetY + height - (val - minTemp) / scale.scaleY;

            if (!started) {
                this.ctx.moveTo(x, y);
                started = true;
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // ---- POINTS ----
        for (let yv of data) {
            const val = Number(yv.value);
            if (!val) continue;

            const x = this.offsetX + (yv.year - 1880) * scale.scaleX;
            const y = this.offsetY + height - (val - minTemp) / scale.scaleY;

            this.ctx.beginPath();
            this.ctx.arc(x, y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }
    }

    //----------------------------------------------
    redrawGraph() {
        this.drawGraph();
    }

    // (le reste identique : drawAxis, drawGraduations, onMouseDown…)
}
