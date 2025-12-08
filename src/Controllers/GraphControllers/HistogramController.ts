import GraphBar from "./GraphBar";
import type { TempAnomalyArea, TempAnomalyData } from "../../Redux/Slice/DataSlice";
import type { GraphInterface } from "./GraphInterface";
import { setCurrentLong } from "../../Redux/Slice/GlobalSlice";

export interface histogramControllerProperties {
    allAreas: TempAnomalyData;
    latitudesSelected: number[];
    currentYear: number;
    graphZoneOffset: number;
    dispatcher:(func:any)=>any;
}

export default class HistogramController implements GraphInterface {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private barsRef: GraphBar<{lat:number, lon:number, temp:number}>[] = [];
    private longListData: { value: number | "NA"; long: number; lat:number }[] = [];

    private ar: TempAnomalyArea[];
    private lat: number[];
    private an: number;

    private offset: number;
    private offsetX:number;
    private offsetY:number;

    private width:number = 0;
    private height:number = 0;

    private colors = ["purple", "orange", "red", "green", "yellow", "black"];

    private dispatch:(func:any)=>any;

    constructor(props:histogramControllerProperties) {
        this.ar = props.allAreas.tempanomalies;
        this.lat = props.latitudesSelected;
        this.an = props.currentYear;
        this.offset = props.graphZoneOffset;

        this.offsetX = this.offset*1.5;
        this.offsetY = this.offset;

        this.dispatch = props.dispatcher;

    }

    handleMouseDown = (event: React.MouseEvent) => {
        const data = this.onMouseDown(event);
        if(data===undefined) return;
        this.setLong(data.lon);
    };

    setLong(long:number){
          this.dispatch(setCurrentLong(long));
    }

    setCanvas(canvas: HTMLCanvasElement | null) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext("2d") || null;

        if(!this.canvas) return ;

        this.width = this.canvas.width - this.offset * 2;
        this.height = this.canvas.height - this.offset * 2;
    }

    updateData(ar: TempAnomalyArea[], lat: number[], an: number) {
        this.ar = ar;
        this.lat = lat;
        this.an = an;
    }

    private extremValues(): { min: number; max: number } {
        const allValues = this.longListData.filter((o) => o.value !== "NA");
        const allValuesFiltered = allValues.map((o) => o.value).filter((o) => o !== "NA") as number[];

        let minV = Math.min(...allValuesFiltered);
        let maxV = Math.max(...allValuesFiltered);

        return { min: minV-0.05, max: maxV };
    }

    drawLegend():void{
        if (!this.canvas || !this.ctx) return ;

        const marginRight = 80;
        
        for (let lat of this.lat) {
            const i = this.lat.indexOf(lat);
            this.ctx.save();

            this.ctx.font = "10px Verdana";
            this.ctx.textAlign = "left";
            this.ctx.fillStyle = this.colors[i];
            
            this.ctx.fillText(`Lat ${lat}`, (this.offsetX)+i*marginRight, this.offsetY/2);
            
            this.ctx.restore();
        }
        
    }

    initializeData(): void {


        //------------------------------------------------------------------------------------
        function X(long: number): number | undefined {
            if (long < -178 || long > 178) return undefined;
            return (long + 178)/4;
        }
        //------------------------------------------------------------------------------------
        this.longListData = [];
        for(let lat of this.lat){
            for (const element of this.ar) { 
                if (element.lat === lat) {
                    element.data.forEach((yv) => {
                        if (yv.year === this.an) {
                            this.longListData.push({ value: yv.value, long: element.lon, lat:lat});
                        }
                    });
                }
            }
        }


        if (!this.canvas || !this.ctx) return;
        
        const x = this.offset * 1.5;
        const y = this.offset;
        const h = this.canvas.height - this.offset * 2;

        const { min, } = this.extremValues();

        const meta = this.drawGraduations();
        this.barsRef = [];

        for (let i = 0; i < this.longListData.length; i++) {

            const val = this.longListData[i];
            if (!val || val.value === "NA") continue;

            const index = X(val.long);

            if (index === undefined ) continue ;

            const heightPix = meta.scaleY === -1 ? h : (val.value - min) * meta.scaleY;
            const barX = x + index * meta.stepGrad;

            const newBar = new GraphBar(
                barX + 1,
                y + h - heightPix,
                meta.stepGrad - 1,
                heightPix,
                this.colors[this.lat.indexOf(val.lat)],
                this.ctx,
                {lat:val.lat, lon:val.long, temp:val.value}
            );
            this.barsRef.push(newBar);
        }

    }

    onMouseDown(event: React.MouseEvent): {lat:number, lon:number, temp:number} | undefined {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        function compare(a:number|"NA", b:number|"NA"):number {
            if(a != "NA" && b!= "NA") return a-b;
            return -1
        }
        const bars = [...this.barsRef];
        bars.sort((a, b)=>compare(a.value.temp, b.value.temp));
        for (const bar of bars) {
            if (bar.contains(clickX, clickY)) {
                this.redrawGraph();
                bar.draw("red");
                const info = bar.getInfo();
                console.log(info);
                return info;
            }
        }
    }

    redrawGraph(): void {
        if (!this.canvas || !this.ctx) return;

        // Efface le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Recalcule / recharge la liste des valeurs
        this.barsRef = [];
        this.initializeData();

        // Redessine axes
        this.drawAxis();

        // Redessine chaque barre sa couleur d'origine
        this.drawBars(true);
    }

    drawAxis(): void {
        if (!this.canvas || !this.ctx) return;

        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = "#000000";
        this.ctx.fillStyle = "#000000";


        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, this.offsetY);
        this.ctx.lineTo(this.offsetX, this.offsetY + this.height);
        this.ctx.lineTo(this.offsetX + this.width, this.offsetY + this.height);
        this.ctx.stroke();

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

    drawGraduations(): { stepGrad: number; scaleY: number } {
        if (!this.canvas || !this.ctx) return { stepGrad: 0, scaleY: 0 };

        const extreme = { ...this.extremValues() };
        const minTemp = extreme.min;
        const maxTemp = extreme.max;
        const rangeTemp = maxTemp - minTemp;

        const precise = 10;
        const stepGradY = this.height / precise;

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "#000000";
        this.ctx.fillStyle = "#000000";

        // graduation Y
        for (let i = 0; i <= precise; i++) {
            if(maxTemp-(minTemp+0.05) === 0 && i != precise ) continue ;
            const yy = this.offsetY + this.height - i * stepGradY;
            const temp = minTemp + (rangeTemp * i) / precise;

            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, yy);
            this.ctx.lineTo(this.offsetX - 5, yy);
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.lineWidth = 0.5;
            this.ctx.strokeStyle = "grey";
            this.ctx.moveTo(this.offsetX, yy);
            this.ctx.lineTo(this.offsetX + this.width, yy);
            this.ctx.stroke();
            this.ctx.restore();

            this.ctx.fillText(temp.toFixed(2), this.offsetX - 35, yy + 3);
        }

        // Nom Y
        this.ctx.save();
        this.ctx.translate((this.offset * 1.5) / 3, this.width / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText("mean temperature", (this.offset * 1.5) / 2 - 5, 0);
        this.ctx.restore();

        // graduation X (longitudes) — il y en a 90
        const nbBars = 89;
        const stepX = this.width / nbBars;

        for (let i = 0; i <= nbBars; i++) {
            const xx = this.offsetX + i * stepX;

            this.ctx.beginPath();
            this.ctx.moveTo(xx, this.offsetY + this.height);
            i % 12 ? this.ctx.lineTo(xx, this.offsetY + this.height + 5) : this.ctx.lineTo(xx, this.offsetY + this.height + 10);
            this.ctx.stroke();

            if (i % 12 === 0 || i === 178) {
                const lon = -178 + 4 * i;
                this.ctx.fillText(lon.toString(), xx - 5, this.offsetY + this.height + 20);
            }
        }

        // Nom X
        this.ctx.save();
        this.ctx.translate(this.width / 2 + (this.offset * 1.5) / 3, this.height + (this.offset * 5) / 3);
        this.ctx.fillText("longitude", (this.offset * 1.5) / 2, 5);
        this.ctx.restore();

        return {
            stepGrad: stepX,
            scaleY: rangeTemp === 0 ? -1 : this.height / rangeTemp,
        };

    }

    drawGraph(): void {
        if (!this.canvas || !this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.initializeData();
        this.drawAxis();
        this.drawBars();
    }

    drawBars(reset?:boolean):void{
        this.drawLegend();
        function compare(a:number|"NA", b:number|"NA"):number {
            if(a != "NA" && b!= "NA") return b-a;
            return -1
        }
        const bars = [...this.barsRef];
        bars.sort((a, b)=>compare(a.value.temp, b.value.temp));
        for (const bar of bars) {
            const color = reset ? this.colors[this.lat.indexOf(bar.value.lat)] : undefined ;
            bar.draw(color);
        }
    }
}