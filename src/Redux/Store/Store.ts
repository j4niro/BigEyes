import { configureStore } from "@reduxjs/toolkit";
import globalSlice from "../Slice/GlobalSlice";
import dataSlice from "../Slice/dataSlice";


export const store = configureStore({
    reducer : {
        globalState : globalSlice,
        data : dataSlice
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch