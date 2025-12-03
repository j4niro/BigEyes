import { configureStore } from "@reduxjs/toolkit";
import globalSlice from "../Slice/GlobalSlice";
import dataSlice from "../Slice/DataSlice";


export const store = configureStore({
    reducer : {
        globalState : globalSlice,
        data : dataSlice
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, 
            immutableCheck: false,    
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch