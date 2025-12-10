export interface Graph {
    /**
     * Called when a single data item is selected.
     * @param data - the selected data item
     */

    onMouseDown(data: unknown): void;

    draw(data: unknown): void;


}

export interface GraphInterface {
}
