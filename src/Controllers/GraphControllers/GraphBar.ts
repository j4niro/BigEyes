/* 
  This class is used for interactive bars and squares displayed on histogram and heatmap

  AI Assistance : ~0% (Except common debugging errors)
*/
export default class GraphBar<T> {
  public shape: Path2D;
  public width: number;
  public height: number;
  public color: string;
  public origin: { x: number; y: number };
  public ctx: CanvasRenderingContext2D;
  public value: T;

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    c: string,
    ctx: CanvasRenderingContext2D,
    value: T
  ) {
    this.shape = new Path2D();
    this.width = w;
    this.height = h;
    this.color = c;
    this.origin = { x, y };
    this.ctx = ctx;
    this.value = value;

    this.shape.rect(x, y, w, h);
  }

  draw(color?: string) { // render the bar on graph canvas
    this.ctx.save();

    this.ctx.fillStyle = this.color;

    if (color && color !== this.color) {
      this.ctx.fillStyle = color;
      console.log("COLOR : ", color);
    }

    this.ctx.fill(this.shape);
    this.ctx.restore();
  }

  contains(x: number, y: number): boolean { //check if the bar is the one clicked by user
    return this.ctx.isPointInPath(this.shape, x, y);
  }

  getInfo(): T { //return single bar information details
    return this.value;
  }
}
