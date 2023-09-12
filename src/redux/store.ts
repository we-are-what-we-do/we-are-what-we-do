"use client";

import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useSelector } from "react-redux";
import torusInfoSlice from "./features/torusInfo-slice";

export const store = configureStore({
    reducer: {
        torusInfo: torusInfoSlice,
    },
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;