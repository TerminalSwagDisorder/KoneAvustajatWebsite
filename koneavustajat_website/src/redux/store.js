// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Defaults to localStorage for web
import shoppingCartReducer from "./shoppingCartSlice";
import wizardReducer from "./wizardSlice";
import { combineReducers } from "redux";

// Configuration for redux-persist
const persistConfig = {
	key: "root", // Key for the persist storage
	storage, // Storage method (localStorage in this case)
	whitelist: ["shoppingCart", "wizard"] // Specify which reducers to persist
};

// Combine all reducers
const rootReducer = combineReducers({
	shoppingCart: shoppingCartReducer,
	wizard: wizardReducer
});

// Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the store with the persisted reducer
export const store = configureStore({
	reducer: persistedReducer
});

export const persistor = persistStore(store); // Create a persistor for the store
