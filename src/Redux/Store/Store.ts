import { configureStore } from "@reduxjs/toolkit";
import globalSlice from "../Slice/GlobalSlice";

export const store = configureStore({
    reducer : {
        globalState : globalSlice
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch