// Redux/Slice/GlobalSlice.ts
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
    groupId?: number,
}

export type AreaGroup = {
    id: number,
    name: string,
    color: string,
    areaIds: number[],
}

export type SelectionMode = 'latitude' | 'area' | null

export type GlobalState = {
    selectedLatitudes : Array<Latitude>,
    yearRange : YearRange,
    selectedAreas : Array<Area>,
    areaGroups: Array<AreaGroup>,
    currentAreaId:number|null,
    currentLatId:number|null,
    currentSelectionMode: SelectionMode,
    nextGroupId: number,
}

const initialState: GlobalState = {
    selectedLatitudes : [],
    yearRange : {start:1880, end:2025},
    selectedAreas : [],
    areaGroups: [],
    currentAreaId: null,
    currentLatId: null,
    currentSelectionMode: null,
    nextGroupId: 1,
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
            const area = state.selectedAreas[id];
            
            if (area?.groupId) {
                const group = state.areaGroups.find(g => g.id === area.groupId);
                if (group) {
                    group.areaIds = group.areaIds.filter(areaId => areaId !== id);
                }
            }
            
            state.selectedAreas.splice(id, 1);
            for (let index = 0; index < state.selectedAreas.length; index++) {
                const element = state.selectedAreas[index];
                element.id = index;
            }
        },

        updateAreaName: (state, action: PayloadAction<{id: number, name: string}>) => {
            const area = state.selectedAreas[action.payload.id];
            if (area) {
                area.name = action.payload.name;
            }
        },

        setSelectionMode : (state, action:PayloadAction<SelectionMode>) => {
            state.currentSelectionMode = action.payload;
        },

        createAreaGroup: (state, action: PayloadAction<{name: string, color: string}>) => {
            state.areaGroups.push({
                id: state.nextGroupId++,
                name: action.payload.name,
                color: action.payload.color,
                areaIds: []
            });
        },

        addAreaToGroup: (state, action: PayloadAction<{areaId: number, groupId: number}>) => {
            const area = state.selectedAreas[action.payload.areaId];
            const group = state.areaGroups.find(g => g.id === action.payload.groupId);
            
            if (area && group) {
                if (area.groupId) {
                    const oldGroup = state.areaGroups.find(g => g.id === area.groupId);
                    if (oldGroup) {
                        oldGroup.areaIds = oldGroup.areaIds.filter(id => id !== action.payload.areaId);
                    }
                }
                
                area.groupId = action.payload.groupId;
                if (!group.areaIds.includes(action.payload.areaId)) {
                    group.areaIds.push(action.payload.areaId);
                }
            }
        },

        removeAreaFromGroup: (state, action: PayloadAction<number>) => {
            const area = state.selectedAreas[action.payload];
            if (area?.groupId) {
                const group = state.areaGroups.find(g => g.id === area.groupId);
                if (group) {
                    group.areaIds = group.areaIds.filter(id => id !== action.payload);
                }
                area.groupId = undefined;
            }
        },

        deleteGroup: (state, action: PayloadAction<number>) => {
            const groupId = action.payload;
            
            state.selectedAreas.forEach(area => {
                if (area.groupId === groupId) {
                    area.groupId = undefined;
                }
            });
            
            state.areaGroups = state.areaGroups.filter(g => g.id !== groupId);
        },

        updateGroupName: (state, action: PayloadAction<{id: number, name: string}>) => {
            const group = state.areaGroups.find(g => g.id === action.payload.id);
            if (group) {
                group.name = action.payload.name;
            }
        },
    }
})

export const {
    addLatitudeSelected, 
    deleteLatitudeSelected, 
    setYearRange, 
    deleteAreaSelected, 
    addAreaSelected,
    updateAreaName,
    setSelectionMode,
    createAreaGroup,
    addAreaToGroup,
    removeAreaFromGroup,
    deleteGroup,
    updateGroupName,
} = globalSlice.actions

export default globalSlice.reducer