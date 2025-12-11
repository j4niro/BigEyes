import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { TempAnomalyArea } from "./DataSlice";

export type Latitude = {
    id: number,
    lat: number,
}

export type Dot = {
    x: number,
    y: number,
}

export type Area = {
    id:number,
    name:string,
    topLeft:Dot,
    bottomRight:Dot,
    groupId?: number,
    scaledMetaData?:{
        minLat:number,
        maxLat:number,
        minLong:number,
        maxLong:number,
    }
}

export type AreaGroup = {
    id: number,
    name: string,
    color: string,
    areaIds: number[],
}

export type SelectionMode = 'latitude' | 'area' | null

export type ViewKey = "heatmap" | "histogram" | "graph" | "regression";

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

export type screenLayoutState = {
    mapLayout : 1 | 0.6 | 0.2 ;
    viewerLayout : 0 | 0.4 | 0.8 ;
}

export type YearRange = { // if start === end then only one year is selected
    start:number,
    end:number,
}

export type GlobalState = {

    currentAreaId:number|null,
    currentLatId:number|null,

    currentSelectionMode: SelectionMode,

    mapHeightIndicator: number|null,

    yearRange : YearRange,
    // currentYear : number,

    selectedAreasResolved : Array<TempAnomalyArea>,
    selectedAreas : Array<Area>,

    areaGroups: Array<AreaGroup>,
    nextGroupId: number,

    currentArea:TempAnomalyArea|null,

    currentLat:number,
    // selectedLatitudes : Array<number>,
    selectedLatitudes : Array<Latitude>,
    selectedLatitudesVersion : number,
    currentLong:number,

    viewOrder: ViewKey[],

    mapDimensions:{width:number, height:number},

    showGraphViewer:boolean,

    areaCached:{lat:number, lon:number}|null,

    viewerIsInGrid:boolean,

    screenLayout:screenLayoutState,
}

const initialState: GlobalState = {
    
    yearRange : {start:1880, end:2025}, 
    // currentYear: 2020,

    selectedAreas : [],
    selectedAreasResolved : [],
    currentArea: null,

    selectedLatitudes : [],
    currentLat: 0,
    currentLong: 0,
    selectedLatitudesVersion : 0,

    currentSelectionMode: null,

    currentLatId: null,
    currentAreaId: null,
    areaGroups: [],
    nextGroupId: 1,
    mapHeightIndicator : null,
    viewerIsInGrid : false,

    mapDimensions:{width:0, height:0},

    viewOrder: ["heatmap", "histogram", "graph", "regression"],

    showGraphViewer:true,

    areaCached:null,

    screenLayout:{
        mapLayout : 1,
        viewerLayout : 0,
    }
}

const globalSlice = createSlice({
    name : 'global',
    initialState : initialState,
    reducers: { //TODO: manage the reducers according to the data structure we decide to use 
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

        setCurrentLat : (state, action:PayloadAction<number>)=>{
            state.currentLat = action.payload;
        },

        setAreaToCache : (state, action:PayloadAction<{lat:number, lon:number}>)=>{
            state.areaCached = action.payload;
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


        setCurrentLong : (state, action:PayloadAction<number>)=>{
            state.currentLong = action.payload;
        },

        updateGroupName: (state, action: PayloadAction<{id: number, name: string}>) => {
            const group = state.areaGroups.find(g => g.id === action.payload.id);
            if (group) {
                group.name = action.payload.name;
            }
        },

        // setCurrentYear : (state, action:PayloadAction<number>)=>{
        //     state.currentYear = action.payload;
        // },

        alertMapHeight: (state, action: PayloadAction<number>) => {
            state.mapHeightIndicator = action.payload;
        },

        reorderViews: (state, action: PayloadAction<ViewKey[]>) => {
            state.viewOrder = action.payload;
        },

        showGraphViewer : (state, action: PayloadAction<string>) =>{
            state.showGraphViewer = action.payload === "show" ? true : false;
        },

        setMapLayout : (state, action: PayloadAction<1 | 0.6 | 0.2>) =>{
            state.screenLayout.mapLayout = action.payload ;
            switch (state.screenLayout.mapLayout) {
                case 1:
                    state.screenLayout.viewerLayout = 0
                    break;

                case 0.6:
                    state.screenLayout.viewerLayout = 0.4
                    break;

                case 0.2:
                    state.screenLayout.viewerLayout = 0.8
                    break;
            }
        },

        setViewerLayout : (state, action: PayloadAction<0 | 0.4 | 0.8>) =>{
            state.screenLayout.viewerLayout = action.payload ;
            switch (state.screenLayout.viewerLayout) {
                case 0:
                    state.screenLayout.mapLayout = 1
                    break;

                case 0.4:
                    state.screenLayout.mapLayout = 0.6
                    break;

                case 0.8:
                    state.screenLayout.mapLayout = 0.2
                    break;
            }
        },

        switchViewerLayout : (state, action: PayloadAction<string>) =>{
            state.viewerIsInGrid = action.payload === "grid" ? true : false;
        },


        setAreaScaledCoordinates : (state, action:PayloadAction<Area>)=>{
            const areaToUpdate = state.selectedAreas.find((area)=>area.id === action.payload.id);

            const latTop = 90 - (action.payload.topLeft.y / state.mapDimensions.height) * 180;
            const latBottom = 90 - (action.payload.bottomRight.y / state.mapDimensions.height) * 180;
            const lonLeft = (action.payload.topLeft.x / state.mapDimensions.width) * 360 - 180;
            const lonRight = (action.payload.bottomRight.x / state.mapDimensions.width) * 360 - 180;

            if(areaToUpdate){
                if(!areaToUpdate.scaledMetaData){
                    areaToUpdate.scaledMetaData = {
                        minLat:0,
                        maxLat:0,
                        minLong:0,
                        maxLong:0,
                    }
                }
                areaToUpdate.scaledMetaData.maxLat = latTop;
                areaToUpdate.scaledMetaData.minLat = latBottom;
                areaToUpdate.scaledMetaData.minLong = lonLeft;
                areaToUpdate.scaledMetaData.maxLong = lonRight;
            }

        },

        setMapDimensions:(state, action:PayloadAction<{width:number, height:number}>)=>{
            state.mapDimensions = {...action.payload};
        }
    }

})

export const {
    addLatitudeSelected, 
    deleteLatitudeSelected, 
    setYearRange, 
    deleteAreaSelected, 
    reorderViews,
    addAreaSelected,
    updateAreaName,
    setSelectionMode,
    createAreaGroup,
    addAreaToGroup,
    removeAreaFromGroup,
    deleteGroup,
    updateGroupName,
    alertMapHeight,
    setCurrentLat,
    setCurrentLong,
    setMapDimensions,
    setAreaScaledCoordinates,
    showGraphViewer,
    setAreaToCache,
    switchViewerLayout,

    setMapLayout,
    setViewerLayout,
} = globalSlice.actions
export default globalSlice.reducer// Redux/Slice/GlobalSlice.ts
