import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Dot = { // dot on the map
    x: number,
    y: number,
}

export type Latitude = {
    id: number,
    lat: number,
}

export type YearRange = {
    start:number,
    end:number,
}

export type Area = { // area on the map, it's a rectangle we can draw with two dots : top-left & bottom-right
    id:number, // in case no name is provided
    name:string, // for managing several area
    topLeft:Dot,
    bottomRight:Dot,
}

export type GlobalState = {
    selectedLatitudes : Array<Latitude>,
    yearRange : YearRange,
    selectedAreas : Array<Area>,
    currentAreaId:number|null,
    currentLatId:number|null,
    currentSelectionMode:string|null,
}

const initialState: GlobalState = {
    selectedLatitudes : [],
    yearRange : {start:1880, end:2025}, // if start === end then one year is selected
    selectedAreas : [],
    currentAreaId: null,
    currentLatId: null,
    currentSelectionMode: null,
}

const globalSlice = createSlice({
    name : 'global',
    initialState : initialState,
    reducers: { //TODO: manage the reducers according to the data structure we decide to use 
        addLatitudeSelected : (state, action:PayloadAction<Latitude>)=>{
            state.currentSelectionMode = "lat";

            state.selectedLatitudes.push({...action.payload});
            state.currentLatId = state.selectedLatitudes.length-1;
            state.selectedLatitudes[state.currentLatId].id = state.currentLatId;
        },

        deleteLatitudeSelected : (state, action:PayloadAction<number>)=>{
            const id = action.payload;
            state.selectedLatitudes.splice(id, 1);
            for (let index = 0; index < state.selectedLatitudes.length; index++) {
                const element = state.selectedLatitudes[index];
                element.id = index;
            }
        },

        setYearRange : (state, action:PayloadAction<YearRange>)=>{
            state.yearRange = {...action.payload};
        },

        addAreaSelected : (state, action:PayloadAction<Area>) =>{
            state.currentSelectionMode = "area";

            state.selectedAreas.push({...action.payload});
            state.currentAreaId = state.selectedAreas.length-1;
            state.selectedAreas[state.currentAreaId].id = state.currentAreaId;
        },

        deleteAreaSelected : (state, action:PayloadAction<number>)=>{
            const id = action.payload;
            state.selectedAreas.splice(id, 1);
            for (let index = 0; index < state.selectedAreas.length; index++) {
                const element = state.selectedAreas[index];
                element.id = index;
            }
        }
    }

})

export const {addLatitudeSelected, deleteLatitudeSelected, setYearRange, deleteAreaSelected, addAreaSelected, } = globalSlice.actions
export default globalSlice.reducer