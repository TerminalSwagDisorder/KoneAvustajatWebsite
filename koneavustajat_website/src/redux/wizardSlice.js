// src/redux/wizardSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	wizard: {}
};

const wizardSlice = createSlice({
	name: "wizard",
	initialState,
	reducers: {
		addToWizard: (state, action) => {
			const item = action.payload;
			const CID = `${item.table}_${item.ID || item.PartID}`;
			console.log(CID, item);
			if (CID) {
				//state.wizard[CID] = item;
				state.wizard[CID] = { ...item };
			}
		},

		removeFromWizard: (state, action) => {
			delete state.wizard[action.payload];
		},

		clearWizard: (state) => {
			state.wizard = {};
		}
	}
});

export const { addToWizard, removeFromWizard, clearWizard } = wizardSlice.actions;
export default wizardSlice.reducer;
