export interface Graph {
    /**
     * Called when a single data item is selected.
     * @param data - the selected data item
     */

    onMouseDown(data: unknown): void;

    draw(data: unknown): void;


}

export interface GraphInterface {
    initializeData(...args: any[]): any;

    setCanvas(...args: any[]): any;

    updateData(...args: any[]): any;

    onMouseDown(...args: any[]): any;

    drawGraph(...args: any[]): any;

    redrawGraph(...args: any[]): any;

    drawAxis(...args: any[]): any;

    drawGraduations(...args: any[]): any;
}
