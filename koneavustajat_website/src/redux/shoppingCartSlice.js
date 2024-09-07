// src/redux/shoppingCartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	shoppingCart: {}
};

const shoppingCartSlice = createSlice({
	name: "shoppingCart",
	initialState,
	reducers: {
		addToShoppingCart: (state, action) => {
			const item = action.payload;
			const CID = `${item.table}_${item.ID}`;
			if (state.shoppingCart[CID]) {
				state.shoppingCart[CID].quantity += item.quantity;
			} else {
				state.shoppingCart[CID] = { ...item, quantity: item.quantity || 1 };
			}
		},

		removeFromShoppingCart: (state, action) => {
			delete state.shoppingCart[action.payload];
		},

		removeOneFromShoppingCart: (state, action) => {
			const CID = action.payload;
			if (state.shoppingCart[CID]) {
				state.shoppingCart[CID].quantity -= 1;

				if (state.shoppingCart[CID].quantity <= 0) {
					delete state.shoppingCart[CID];
				}
			}
		},

		clearShoppingCart: (state) => {
			state.shoppingCart = {};
		}
	}
});

export const { addToShoppingCart, removeFromShoppingCart, removeOneFromShoppingCart, clearShoppingCart } =
	shoppingCartSlice.actions;
export default shoppingCartSlice.reducer;
