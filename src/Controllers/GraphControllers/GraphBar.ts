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

  draw(color?: string) {
    this.ctx.save();

    this.ctx.fillStyle = this.color;

    if (color && color !== this.color) {
      this.ctx.fillStyle = color;
    }
    
    this.ctx.fill(this.shape);
    this.ctx.restore();
  }

  contains(x: number, y: number): boolean {
    return this.ctx.isPointInPath(this.shape, x, y);
  }

  getInfo(): T {
    //console.log(this.value);
    return this.value;
  }
}
