import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useSelector } from "react-redux";
import torusInfoSlice from "./features/torusInfo-slice";
import buttonStateSlice from "./features/buttonState-slice";

export const store = configureStore({
    reducer: {
        torusInfo : torusInfoSlice,
        buttonState: buttonStateSlice,
    },
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;