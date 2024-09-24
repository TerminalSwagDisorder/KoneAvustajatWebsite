// src/redux/wizardSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	wizard: {},
	completedBuild: {}
};

const checkTable = (newItem, oldItem) => {
	let oldPartTable = oldItem.table;
	let newPartTable = newItem.table;

	const partTypeMapping = {
		1: "chassis",
		2: "cpu",
		3: "cpu_cooler",
		4: "gpu",
		5: "memory",
		6: "motherboard",
		7: "psu",
		8: "storage"
	};

	if (oldPartTable === "usedParts") {
		if (!oldItem.PartTypeID || Number.isNaN(oldItem.PartTypeID)) {
			console.error("PartTypeID is not a number or does not exist!");
			return null;
		}
		oldPartTable = partTypeMapping[oldItem.PartTypeID];
	}

	if (newPartTable === "usedParts") {
		if (!newItem.PartTypeID || Number.isNaN(newItem.PartTypeID)) {
			console.error("PartTypeID is not a number or does not exist!");
			return null;
		}
		newPartTable = partTypeMapping[newItem.PartTypeID];
	}

	if (newPartTable === oldPartTable) {
		return true;
	} else {
		return false;
	}
};

const mapCID = (newItem) => {
	let newPartTable = newItem.table;

	const partTypeMapping = {
		1: "chassis",
		2: "cpu",
		3: "cpu_cooler",
		4: "gpu",
		5: "memory",
		6: "motherboard",
		7: "psu",
		8: "storage"
	};

	if (newPartTable === "usedParts") {
		if (!newItem.PartTypeID || Number.isNaN(newItem.PartTypeID)) {
			console.error("PartTypeID is not a number or does not exist!");
			return null;
		}
		newPartTable = partTypeMapping[newItem.PartTypeID];
	}

	return newPartTable;
};

const wizardSlice = createSlice({
	name: "wizard",
	initialState,
	reducers: {
		addToWizard: (state, action) => {
			const item = action.payload;
			const CID = "wizard";
			if (state.wizard[CID]) {
				const sameTable = checkTable(item, state.wizard[CID]);
				if (sameTable) {
					state.wizard[CID] = { ...item };
				}
			} else {
				state.wizard[CID] = { ...item };
			}
		},

		addToCompletedBuild: (state, action) => {
			const item = action.payload;
			const CID = mapCID(item);
			if (state.completedBuild[CID]) {
				const sameTable = checkTable(item, state.completedBuild[CID]);
				if (sameTable) {
					state.completedBuild[CID] = { ...item };
				}
			} else {
				state.completedBuild[CID] = { ...item };
			}
		},

		removeFromWizard: (state, action) => {
			delete state.wizard[action.payload];
		},

		removeFromCompletedBuild: (state, action) => {
			delete state.completedBuild[action.payload];
		},

		clearWizard: (state) => {
			state.wizard = {};
		},

		clearCompletedBuild: (state) => {
			state.completedBuild = {};
		},

		syncWizardToCompleted: (state) => {
			state.completedBuild = { ...state.wizard };
		}
	}
});

export const {
	addToWizard,
	addToCompletedBuild,
	removeFromWizard,
	removeFromCompletedBuild,
	clearWizard,
	clearCompletedBuild,
	syncWizardToCompleted
} = wizardSlice.actions;
export default wizardSlice.reducer;
