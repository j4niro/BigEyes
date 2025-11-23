import { createSlice } from "@reduxjs/toolkit";
import JSONdata from "../../Utils/tempanomaly_4x4grid_v2.json"
import { loadEarthImage } from "./DataThunk";


export type YearValue = {
    year: number;
    value: number | "NA";
}

export type  TempAnomalyArea = {
    lat: number;
    lon: number;
    data: YearValue[];
}

export type TempAnomalyData = {
    tempanomalies: TempAnomalyArea [];
}

export type DataStore = {
    tempData : TempAnomalyData;
    mapSize? : {width:number, height:number};
} 

const initialState: DataStore = {
    tempData: JSONdata as TempAnomalyData,
}

const dataSlice = createSlice({
    name: 'tempData',
    initialState : initialState,
    reducers: {},
    extraReducers: builder => {
    builder.addCase(loadEarthImage.fulfilled, (state, action) => {
      state.mapSize = action.payload;
    });
  }
});

export const {  } = dataSlice.actions;
export default dataSlice.reducer;