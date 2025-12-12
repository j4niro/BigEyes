/* 
  Controller of Graph View (mean anomalies values over years)

  AI Assistance : ~30% (Optimization and common debugging task)
*/
import type { TempAnomalyArea, TempAnomalyData, YearValue } from "../../Redux/Slice/DataSlice";
import { setYearRange } from "../../Redux/Slice/GlobalSlice";


export interface graphControllerProperties {
    allAreas : TempAnomalyData;
    areasIdentifiedByGroupID:{tempA:TempAnomalyArea, groupId:number, color:string}[];
    currentYear: number;
    graphZoneOffset: number;
    dispatcher:(func:any)=>any;
}

export default class GraphController {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    private offset: number; //offset provided via Props. It is the gap between graph canvas container and canvas itself
    private offsetX:number; //offset on X-axis, calculated from 'offset'
    private offsetY:number; //offset on Y-axis

    private width:number = 0;
    private height:number = 0;

    private ar: {tempA:TempAnomalyArea, groupId:number, color:string}[][] = []; 
    private areasProvided:{tempA:TempAnomalyArea, groupId:number, color:string}[];

    private yearRef: number;

    private colors:string[] = [];

    private allMeanData: Array<{
        groupName: string;
        means: YearValue[];
    }> = [];

    private points: Array<{
        x: number;
        y: number;
        value: number;
        year: number;
        color: string;
    }> = [];


    private extremValues = { min: 100, max: -100 };

    private dispatch : (func:any)=>any;

    private isEmpty:boolean = true;

    constructor(props:graphControllerProperties) {
        
        this.yearRef = props.currentYear;

        this.offset = props.graphZoneOffset;
        this.offsetX=this.offset*1.5;
        this.offsetY=this.offset;

        this.areasProvided = props.areasIdentifiedByGroupID;

        this.dispatch = props.dispatcher;
    }

    computeAreaToRender(): void{ // sort and gether all areas retrieved from Props 
        if (this.areasProvided.length === 0) return;

        const groups: Map<number, {tempA:TempAnomalyArea, groupId:number, color:string}[]> = new Map();

        for (const area of this.areasProvided) {
            if (!groups.has(area.groupId)) {
                groups.set(area.groupId, []);
            }
            groups.get(area.groupId)!.push(area);
        }

        const groupedData = Array.from(groups.values());

        this.ar = groupedData;

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

    setYear(year:number) { // store selected year from graph to Redux store
          this.dispatch(setYearRange({start:year, end:2025}));
    }

    handleMouseDown = (event: React.MouseEvent) => {

        if(this.isEmpty) return ;
        const year = this.onMouseDown(event);
        if(year === undefined) return ;
        this.setYear(Math.round(year));
        
    };

    setCanvas(canvas: HTMLCanvasElement | null) { // initialize graph canvas size properties and event callback
        this.canvas = canvas;
        this.ctx = canvas?.getContext("2d") || null;

        if(!this.canvas) return ;

        this.width = this.canvas.width - this.offset * 2;
        this.height = this.canvas.height - this.offset * 2;

        this.canvas.addEventListener("mousemove", this.handleMouseMove);
    }

    updateData(areaP:{tempA:TempAnomalyArea, groupId:number, color:string}[], an: number) { // in case any data from Props change

        this.areasProvided = areaP;
        this.yearRef = an;

        this.computeAreaToRender();
        this.drawGraph();

    }

    private drawYearLine(year: number): void { // draw red line on graph for year indication
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

    private drawTooltip(p: { x: number; y: number; value: number; year: number; color: string }) { // floating box displaying dot details on graph
        if (!this.ctx) return;

        this.ctx.save();
        const text = `${p.year} : ${p.value.toFixed(3)}°C`;
        this.ctx.font = "12px Verdana";

        const padding = 4;
        const w = this.ctx.measureText(text).width + padding * 2;
        const h = 18;

        const x = p.x + 10 + w > this.width ? p.x - w : p.x + 10  ;
        const y = p.y - 10;

        this.ctx.fillStyle = "white";
        this.ctx.fillRect(x, y - h, w, h);

        this.ctx.strokeStyle = p.color;
        this.ctx.strokeRect(x, y - h, w, h);

        this.ctx.fillStyle = "black";
        this.ctx.fillText(text, x + padding, y - 4);
        this.ctx.restore();
    }

    handleMouseMove = (event: MouseEvent) => {
        if (!this.canvas || !this.ctx) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        let hoveredPoint = null;

        for (const p of this.points) {
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            if (Math.sqrt(dx*dx + dy*dy) < 3) {
                hoveredPoint = p;
                break;
            }
        }

        this.drawGraph();

        if (hoveredPoint) {
            this.drawTooltip(hoveredPoint);
        }
    };

    onMouseDown(event: React.MouseEvent): number|undefined {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        
        const scaleX = this.width / 146;
        const xGraph = clickX - this.offsetX;

        if (xGraph < 0 || xGraph > this.width) return;

        const year = 1880 + xGraph / scaleX;
        this.yearRef = year;

        this.drawGraph();
        this.drawYearLine(year);

        return year
    }

    drawAxis(): void {
        if (!this.canvas || !this.ctx) return;

        this.drawLegend();

        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = "#000000";

        // Axis lines
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, this.offsetY);
        this.ctx.lineTo(this.offsetX, this.offsetY + this.height);
        this.ctx.lineTo(this.offsetX + this.width, this.offsetY + this.height);
        this.ctx.stroke();

        // Name Y-Axis
        this.ctx.save();
        this.ctx.translate(this.offsetX / 3, this.width / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText("Mean Anomalies", this.offsetX / 2, 0);
        this.ctx.restore();

        // Arrow Y-Axis
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

        // Name X-Axis
        this.ctx.save();
        this.ctx.translate(this.width / 2 + this.offsetX / 3, this.height + (this.offset * 5) / 3);
        this.ctx.fillText("year", this.offsetX / 2, 5);
        this.ctx.restore();

        // Arrow X-Axis
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

        // Graduation Y-Axis
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

        // Graduation X-Axis
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

    private calculateSingleExtremValues( // extrem values for single group
        ar: {tempA:TempAnomalyArea, groupId:number, color:string}[],
        init?: { min: number; max: number }
    ): { min: number; max: number } {

        let minV = init?.min ?? 100;
        let maxV = init?.max ?? -100;

        for (let e of ar) {
            const vals = e.tempA.data.map((o) => Number(o.value) || 0);
            minV = Math.min(minV, Math.min(...vals));
            maxV = Math.max(maxV, Math.max(...vals));
        }
        return { min: minV, max: maxV };
    }

    initializeData(): void {
        this.extremValues = this.calculateExtremValues();
        this.allMeanData = [];
        this.colors = [];

        for (let groupIndex = 0; groupIndex < this.ar.length; groupIndex++) {
            
            const areaGroup = this.ar[groupIndex];
            this.colors.push(areaGroup[0].color);

            const yearMap = new Map<number, { sum: number; count: number }>();

            for (let serie of areaGroup) {
                for (let yv of serie.tempA.data) {
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
    }

    drawGraph(): void {
        if (!this.canvas || !this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.initializeData();

        if (this.allMeanData.length === 0 ){this.drawEmptyData(); return};

        this.isEmpty = false;

        this.drawAxis();

        const scale = this.drawGraduations();

        for (let i = 0; i < this.allMeanData.length; i++) {
            const serie = this.allMeanData[i].means;
            const color = this.colors[i % this.colors.length];
            this.drawLineAndPoints(serie, scale, color);
        }

        this.drawYearLine(this.yearRef);
    }

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

            this.points.push({
                x: x,
                y: y,
                value: val,
                year: yv.year,
                color: color
            });

        }
    }

    drawEmptyData(): void { // in case no group has been created yet
        if (!this.canvas || !this.ctx) return;
        this.ctx.save();
        this.ctx.textAlign = "center";
        this.ctx.font = "15px Verdana";
        this.ctx.fillText("No data available...", this.width / 2 + this.offsetX, this.height / 2 + this.offsetY);
        this.ctx.restore();

        this.isEmpty = true;
    }
}
