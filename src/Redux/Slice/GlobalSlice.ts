// redux/Slice/GlobalSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Dot = {
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

export type Area = {
    id:number,
    name:string,
    topLeft:Dot,
    bottomRight:Dot,
}

export type SelectionMode = 'latitude' | 'area' | null

export type GlobalState = {
    selectedLatitudes : Array<Latitude>,
    yearRange : YearRange,
    selectedAreas : Array<Area>,
    currentAreaId:number|null,
    currentLatId:number|null,
    currentSelectionMode: SelectionMode, // Type corrigé
}

const initialState: GlobalState = {
    selectedLatitudes : [],
    yearRange : {start:1880, end:2025},
    selectedAreas : [],
    currentAreaId: null,
    currentLatId: null,
    currentSelectionMode: null,
}

const globalSlice = createSlice({
    name : 'global',
    initialState : initialState,
    reducers: {
        addLatitudeSelected : (state, action:PayloadAction<Latitude>)=>{
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
        },

        setSelectionMode : (state, action:PayloadAction<SelectionMode>) => {
            state.currentSelectionMode = action.payload;
        }
    }

})

export const {
    addLatitudeSelected, 
    deleteLatitudeSelected, 
    setYearRange, 
    deleteAreaSelected, 
    addAreaSelected,
    setSelectionMode
} = globalSlice.actions

export default globalSlice.reducer