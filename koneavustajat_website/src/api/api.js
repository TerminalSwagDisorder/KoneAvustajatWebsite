// File name: api.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for api functionality

import React, { useEffect, useState } from "react";
import { checkAllowedTableNames, checkAllowedPartNames, checkSearchTerms, buildQuery, validateIdentifiers } from "./helpers";
import "../style/style.scss";

export const wizardAlgorithm = async (formFields) => {
	try {
		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);

		const response = await fetch("http://localhost:4000/api/algorithm", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // For all fetch requests, do this!
			body: JSON.stringify({ formFields })
		});
		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		alert("Build fetched.");
		return data;
	} catch (error) {
		console.error("Error while fetching build:", error);
	}
};


// All of the user data handling
// Fetch users using pagination
export const fetchUsers = async (page) => {
	try {
		const response = await fetch(`http://localhost:4000/api/users?page=${page}&items=50`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		// If data is not correct format
		if (!Array.isArray(data)) {
		  return Object.values(data);
		}
		
		return data;
	} catch (error) {
		console.error(error);
		
	}
};


// Fetch different types of data from pages
export const fetchDynamicData = async (page, tableName, partName) => {
	try {
		await checkAllowedTableNames(["getroutes"], tableName);
		
		if (partName) {
			await checkAllowedPartNames(partName);
		} else {
			console.log("partName has no value. This might be intentional, but double check to be sure.");
		}

		const correctSearchTerms = await checkSearchTerms({page: page, partName: partName});

		const query = await buildQuery(correctSearchTerms, true);
		
		const response = await fetch(`http://localhost:4000/api/${tableName}?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		// If data is not correct format
		if (!Array.isArray(data)) {
		  return Object.values(data);
		}
		
		return data;
	} catch (error) {
		console.error(error);
	}
};

export const updateDynamicData = async (formFields, tableName, partName, id) => {
	try {
		console.log(`http://localhost:4000/api/${tableName}/update/${partName}/${id}`);
		console.log(formFields);
		await checkAllowedTableNames(["patchroutes"], tableName);
		
		if (partName) {
			await checkAllowedPartNames(partName);
		} else {
			console.log("partName has no value. This might be intentional, but double check to be sure.");
		}

		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);
		// api call to register a new user
		const response = await fetch(`http://localhost:4000/api/${tableName}${tableName.includes("/update") ? "" : "/update"}/${partName}/${id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }
		
		alert(`Successfully updated ${partName} with id ${id} from ${tableName}`);

		return data;
	} catch (error) {
		console.error("Error updating data:", error);
		if (error.message) alert(error.message);

	}
};

export const deleteDynamicData = async (tableName, partName, id) => {
	try {
		console.log(`http://localhost:4000/api/${tableName}/delete/${partName}/${id}`);
		await checkAllowedTableNames(["deleteroutes"], tableName);
		
		if (partName) {
			await checkAllowedPartNames(partName);
		} else {
			console.log("partName has no value. This might be intentional, but double check to be sure.");
		}

		// api call to register a new user
		const response = await fetch(`http://localhost:4000/api/${tableName}/delete/${partName}/${id}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
		});

		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }
		alert(`Successfully deleted ${partName} with id ${id} from ${tableName}`);
		return true;
	} catch (error) {
		console.error("Error adding user:", error);
		if (error.message) alert(error.message);

	}
};

// Search function for users/otherusers
export const fetchSearchData = async (searchTerms, tableName) => {
	try {
		await checkAllowedTableNames(["getroutes"], tableName);
		const correctSearchTerms = await checkSearchTerms(searchTerms);
		
		const query = await buildQuery(correctSearchTerms, false);

		const response = await fetch(`http://localhost:4000/api/${tableName}/search?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		// If data is not correct format
		if (!Array.isArray(data)) {
		  return Object.values(data);
		}
		
		return data;
	} catch (error) {
		console.error(error);
	}
};

// Search function for users/otherusers using id
export const fetchSearchIdData = async (id, tableName, partName) => {
	console.log(id, tableName);
	try {
		await checkAllowedTableNames(["getroutes"], tableName);
		await checkAllowedPartNames(partName);
		
		const correctSearchTerms = await checkSearchTerms([partName, id]);
		const query = await buildQuery(correctSearchTerms, true);
		
		const response = await fetch(`http://localhost:4000/api/${tableName}?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		const data = await response.json(); // Note for some reason this is a different format from email search

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		// If data is not correct format
		if (!Array.isArray(data)) {
		  return Object.values(data);
		}
		console.log(data);
		
		return data;
	} catch (error) {
		console.error(error);
	}
};

// For pagination
export const fetchDataAmount = async (tableName) => {
	try {
		await checkAllowedPartNames(tableName);

		const correctSearchTerms = await checkSearchTerms(tableName);
		const query = await buildQuery(correctSearchTerms, true);

		const response = await fetch(`http://localhost:4000/api/count?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		
		const data = await response.json();
		
        if (!response.ok) {
			alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		return data;
	} catch (error) {
		console.error("Error while getting pagination:", error);
	}
    
};

export const fetchServerRoutes = async () => {
	try {	
		const response = await fetch("http://localhost:4000/api/routes", {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

		const data = await response.json();

        if (!response.ok) {
			alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		return data;
	} catch (error) {
		console.error("Error while getting pagination:", error);
	}
    
};

export const fetchContent = async (identifiers) => {
	try {
		await checkAllowedTableNames(["getroutes"], "text-content");

		if (!identifiers) {
			throw new Error("No identifiers defined!");
		}
		
		if (typeof identifiers !== "object") {
			throw new Error("Identifiers must be an object!");
		}

		const identifierKeys = Object.keys(identifiers);
		const validKeys = ["page", "section", "specific"];
		if (identifierKeys.length > 3 || identifierKeys.length < 1) {
			throw new Error("Identifier amount is not allowed");
		}
		if (identifierKeys.some((item) => !validKeys.includes(item))) {
			throw new Error("Found invalid key in indentifiers");
		}
		const validIdentifiers = await validateIdentifiers(identifiers);
		if (!validIdentifiers) {
			throw new Error("Identifier hierarchy is incorrect");
		}
		
		const identifierValues = validKeys
			.map(key => identifiers[key])
			.filter(value => value !== undefined && value !== "");
		const contentIdentifier = identifierValues.join(".");

		const correctSearchTerms = await checkSearchTerms({Site_Identifier: contentIdentifier});

		const query = await buildQuery(correctSearchTerms, true);
		
		const response = await fetch(`http://localhost:4000/api/text-content?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		// Return only data.contentMap
		if (data.contentMap) {
		  return data.contentMap;
		}
		
		return data;
	} catch (error) {
		console.error(error);
	}
};

export const fetchWholeContent = async (identifiers) => {
	try {
		await checkAllowedTableNames(["getroutes"], "text-content");

		if (!identifiers) {
			throw new Error("No identifiers defined!");
		}
		
		if (typeof identifiers !== "object") {
			throw new Error("Identifiers must be an object!");
		}

		const identifierKeys = Object.keys(identifiers);
		const validKeys = ["page", "section", "specific"];
		if (identifierKeys.length > 3 || identifierKeys.length < 1) {
			throw new Error("Identifier amount is not allowed");
		}
		if (identifierKeys.some((item) => !validKeys.includes(item))) {
			throw new Error("Found invalid key in indentifiers");
		}
		const validIdentifiers = await validateIdentifiers(identifiers);
		if (!validIdentifiers) {
			throw new Error("Identifier hierarchy is incorrect");
		}
		
		const identifierValues = validKeys
			.map(key => identifiers[key])
			.filter(value => value !== undefined && value !== "");
		const contentIdentifier = identifierValues.join(".");

		const correctSearchTerms = await checkSearchTerms({site_identifier: contentIdentifier});

		const query = await buildQuery(correctSearchTerms, true);
		
		const response = await fetch(`http://localhost:4000/api/text-content?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		// Return only data.contentMap
		if (data.content) {
		  return data.content;
		}
		
		return data;
	} catch (error) {
		console.error(error);
	}
};

export const fetchContentIdentifiers = async () => {
	try {	
		const response = await fetch("http://localhost:4000/api/text-content/identifiers", {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		
		const data = await response.json();

        if (!response.ok) {
			alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		if (typeof data === "object") {
			return Object.values(data);
		}
		
		return data;
	} catch (error) {
		console.error("Error while getting content identifiers:", error);
	}
};

export const addContent = async (formFields) => {
	try {

		if (formFields && formFields.Identifiers) {
			formFields.Site_Identifier = `${formFields.Identifiers.page}.${formFields.Identifiers.section}.${formFields.Identifiers.specific}`;
		}

		formFields = {
			Site_Identifier: formFields.Site_Identifier,
			Language: formFields.Language,
			Version: formFields.Version,
			Main_Tag: formFields.Main_Tag,
			Content_Text: formFields.Content_Text,
			Content_Type: formFields.Content_Type,
			Status: formFields.Status	
		};

		await checkAllowedTableNames(["postroutes"], "text-content/add");

		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);

		const response = await fetch("http://localhost:4000/api/text-content/add", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // For all fetch requests, do this!
			body: JSON.stringify({ formFields })
		});
		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		return data;
	} catch (error) {
		console.error("Error while adding content:", error);
	}
};

export const updateContent = async (formFields) => {
	try {
		formFields = {
			Site_Identifier: formFields.Site_Identifier,
			Language: formFields.Language,
			Version: formFields.Version,
			Main_Tag: formFields.Main_Tag,
			Content_Text: formFields.Content_Text,
			Content_Type: formFields.Content_Type,
			Status: formFields.Status	
		};
		console.log("Submitting form:", formFields);
		if (formFields.Site_Identifier === "" || formFields.Language === "") throw new Error("Identifier fields not populated!");
		await checkAllowedTableNames(["patchroutes"], "text-content/update");

		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);
		// api call to register a new user
		const response = await fetch("http://localhost:4000/api/text-content/update", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		return data;
	} catch (error) {
		console.error("Error adding user:", error);
		if (error.message) alert(error.message);

	}
};

// Do all of the user data handling async
// Signin
export const handleSignin = async (event, formFields, handleUserChange) => {
	const email = event.target.Email.value;
	const password = event.target.Password.value;

	// api call to the server to log in the user
	try {
		if (email && password) {
			if (formFields && typeof formFields === "object" && Array.isArray(formFields)) formFields = JSON.stringify(formFields);

			const response = await fetch("http://localhost:4000/api/users/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				credentials: "include", // For all fetch requests, do this!
				body: JSON.stringify({ formFields })
			});
			const data = await response.json();
			console.log(data.user);

			if (!response.ok) {
				console.log(data);
				alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
				throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
			}

			alert("Successfully signed in!");
			handleUserChange(data.user);
			return data.user;

			}
	} catch (error) {
		console.error("Error signing user in:", error);
	}
};

// Signup
export const handleSignup = async (event, formFields) => {
	try {
		if (formFields && typeof formFields === "object" && Array.isArray(formFields)) formFields = JSON.stringify(formFields);
		// api call to register a new user
		const response = await fetch("http://localhost:4000/api/users/signup", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

		const data = await response.json();

        if (!response.ok) {
            alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
        }

		alert("Signed up successfully");

		return true;
	} catch (error) {
		console.error("Error adding user:", error);
		if (error.message) alert(error.message);

	}
};

// Signout
export const handleSignout = async (handleUserChange) => {
	
	// api call to log out the user
	const response = await fetch("http://localhost:4000/api/logout", {
		method: "POST",
		credentials: "include",  // Important, because we're using cookies
	});

	const data = await response.json();
	
	// If successful, reload the current window
	if (response.ok) {
		localStorage.removeItem("accessToken");
		sessionStorage.removeItem("accessToken");
		
		window.location.reload();
		return "Logged out successfully";
	} else {
		console.error(data.error);
	}
};


// Signin status check
export const checkIfSignedIn = async () => {

	// api call to get the user's profile information
	try {
		const response = await fetch("http://localhost:4000/api/profile", {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

		const data = await response.json();
		console.log(data);

		// If the user is authenticated, return user data
		if (response.ok) {
			return data.userData;
		} else {
			// If authentication fails
			// User is not signed in (invalid token or other error)
			return null;
		}
	} catch (error) {
		console.error("Error while fetching user:", error);
	}
};


// Profile refresh
export const refreshProfile = async () => {

	// api call to get the user's profile information
	try {
		const response = await fetch("http://localhost:4000/api/profile/refresh", {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

		const data = await response.json();

		// If the user is authenticated, return user data
		if (response.ok) {
			//handleUserChange(data.userData)
			return data.userData;
		} else {
			// If authentication fails
			// User is not signed in (invalid token or other error)
			return null;
		}
	} catch (error) {
		console.error("Error while fetching user:", error);
	}
};


// User credential change
export const handleCredentialChange = async (event, formFields) => {
    event.preventDefault();
    try {
		if (formFields.currentPassword === "" || formFields.currentPassword === undefined) throw new Error("Current password is required when submitting new profile info!");
		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);

		const response = await fetch("http://localhost:4000/api/profile", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json"
				},
				credentials: "include", // Important, because we're using cookies
				body: JSON.stringify({ formFields }),
			});

		const data = await response.json();

		// Handle update
		if (response.ok) {
			console.log("User updated successfully:", data);
			alert("Successfully changed credentials!");
			return true;
		} else {
			if (data.message ? data.message : response.message) {
				alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
				throw new Error(data.error);
			} else {
				alert("Failed change credentials. Please try again.");
				throw new Error(data.error);
			}
		}
    } catch (error) {
        console.error("Error updating credentials:", error);
    }
};
