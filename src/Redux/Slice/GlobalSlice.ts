import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { TempAnomalyArea } from "./DataSlice";

export type viewDisposition = {
  position: "top-left-graph" | "bottom-left-graph";
  id: number;
};

export const TWORAWS: viewDisposition[] = [
  { position: "top-left-graph",    id: 0 },
  { position: "top-left-graph",    id: 1 },
  { position: "bottom-left-graph", id: 2 },
  { position: "bottom-left-graph", id: 3 },
];

export type ONERAWS = {
  disposition: viewDisposition[];
};

export type viewsDisposition = {
  disposition: viewDisposition[];
};



export type YearRange = { // if start === end then only one year is selected
    start:number,
    end:number,
}

export type GlobalState = {
    yearRange : YearRange,
    currentYear : number,

    selectedAreas : Array<TempAnomalyArea>,
    currentArea:TempAnomalyArea|null,

    currentLat:number,
    selectedLatitudes : Array<number>,
    selectedLatitudesVersion : number,
    currentLong:number,

    currentSelectionMode:string|null,

    viewsDisposition?:string,
}

const initialState: GlobalState = {
    
    yearRange : {start:1880, end:2025}, 
    currentYear: 2020,

    selectedAreas : [],
    currentArea: null,

    selectedLatitudes : [0],
    currentLat: 0,
    currentLong: 0,
    selectedLatitudesVersion : 0,

    currentSelectionMode: null,
}

const globalSlice = createSlice({
    name : 'global',
    initialState : initialState,
    reducers: { //TODO: manage the reducers according to the data structure we decide to use 
        addLatitudeSelected : (state, action:PayloadAction<number>)=>{
            state.currentSelectionMode = "lat";

            const tab = [...state.selectedLatitudes];
            tab.push(action.payload);
            state.selectedLatitudes = tab ;
            state.currentLat = action.payload;
            state.selectedLatitudesVersion += 1;
        },

        deleteLatitudeSelected : (state, action:PayloadAction<number>)=>{
            const tab = [...state.selectedLatitudes];
            const lat = action.payload;
            const id = tab.findIndex(item => item === lat);
            const id2 = tab.findIndex(item => item === state.currentLat);
            tab.splice(id, 1);

            if(id===id2) {state.currentLat = tab[0];};

            state.selectedLatitudes = tab ;
            state.selectedLatitudesVersion += 1;

        },

        setCurrentLat : (state, action:PayloadAction<number>)=>{
            state.currentLat = action.payload;
        },

        setCurrentLong : (state, action:PayloadAction<number>)=>{
            state.currentLong = action.payload;
        },

        setYearRange : (state, action:PayloadAction<YearRange>)=>{
            state.yearRange = {...action.payload};
        },

        setCurrentYear : (state, action:PayloadAction<number>)=>{
            state.currentYear = action.payload;
        },

        addAreaSelected : (state, action:PayloadAction<TempAnomalyArea>) =>{
            state.currentSelectionMode = "area";

            state.selectedAreas.push({...action.payload});
            state.currentArea = {...action.payload};

        },

        deleteAreaSelected : (state, action:PayloadAction<TempAnomalyArea>)=>{
            const area = action.payload;
            const id = state.selectedAreas.findIndex(item => {item.lat===area.lat && item.lon===area.lat});
            state.selectedAreas.splice(id, 1);

        }
    }

})

export const {addLatitudeSelected, deleteLatitudeSelected, setYearRange, deleteAreaSelected, addAreaSelected, setCurrentYear, setCurrentLat, setCurrentLong } = globalSlice.actions
export default globalSlice.reducer