// File name: api.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for api functionality

import React from "react";
import { checkAllowedTableNames, checkAllowedPartNames, checkSearchTerms, buildQuery, validateIdentifiers, checkRes, sanitizeData } from "./helpers";
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

        await checkRes(response, data);

		//alert("Build fetched.");
		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error); 
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

		await checkRes(response, data);

		// If data is not correct format
		if (!Array.isArray(data)) {
		  return Object.values(data);
		}
		
		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
		
	}
};


// Fetch different types of data from pages
export const fetchDynamicData = async (page, tableName, partName = "") => {
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

        await checkRes(response, data);
		
		const sanitizedData = sanitizeData(data);
		
		// If data is not correct format
		if (!Array.isArray(sanitizedData)) {
		  return Object.values(sanitizedData);
		}
		
		return sanitizedData;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
	}
};

export const updateDynamicData = async (formFields, tableName, partName = null, id = null) => {
	try {
		console.log(`http://localhost:4000/api/${tableName}/update/${partName}/${id}`);
		console.log(formFields);
		await checkAllowedTableNames(["patchroutes"], `${tableName}${partName ? "/" + partName : ""}${id ? "/" + id : ""}`);
		
		if (partName) {
			await checkAllowedPartNames(partName);
		} else {
			console.log("partName has no value. This might be intentional, but double check to be sure.");
		}
		
		formFields = Object.fromEntries(
				Object.entries(formFields).filter(([_, value]) => value !== "")
			);

		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);
		// api call to register a new user
		const response = await fetch(`http://localhost:4000/api/${tableName}${tableName.includes("/update") ? "" : "/update"}${partName ? "/" + partName : ""}${id ? "/" + id : ""}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

		const data = await response.json();

		await checkRes(response, data);
		
		//alert(`Successfully updated ${partName} with id ${id} from ${tableName}`);

		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
		

	}
};

export const postDynamicData = async (formFields, tableName, partName) => {
	try {
		await checkAllowedTableNames(["postroutes"], tableName);
		
		if (partName) {
			await checkAllowedPartNames(partName);
		} else {
			console.log("partName has no value. This might be intentional, but double check to be sure.");
		}
		
		formFields = Object.fromEntries(
				Object.entries(formFields).filter(([_, value]) => value !== "")
			);

		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);
		// api call to register a new user
		const response = await fetch(`http://localhost:4000/api/${tableName}${partName ? "/" + partName : ""}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

		const data = await response.json();

        await checkRes(response, data);
		
		//alert(`Successfully added ${partName} to ${tableName}`);

		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
		

	}
};

export const deleteDynamicData = async (tableName, partName = null, id = null) => {
	try {
		await checkAllowedTableNames(["deleteroutes"], tableName);
		
		if (partName) {
			await checkAllowedPartNames(partName);
		} else {
			console.log("partName has no value. This might be intentional, but double check to be sure.");
		}

		// api call to register a new user
		const response = await fetch(`http://localhost:4000/api/${tableName}${tableName.includes("/delete") ? "" : "/delete"}/${partName ? "/" + partName : ""}${id ? "/" + id : ""}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
		});

		const data = await response.json();

        await checkRes(response, data);
		
		return true;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
		

	}
};

export const downloadFile = async (tableName, fileName = "downloaded_file.txt") => {
	try {
		await checkAllowedTableNames(["getroutes"], tableName);
		
		const response = await fetch(`http://localhost:4000/api/${tableName}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

        await checkRes(response, null, "Failed to download file!");
		const file = await response.blob();
		
		const url = window.URL.createObjectURL(file);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		link.remove();
		window.URL.revokeObjectURL(url);
		
		return true;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
	}
};

// Search function for users/otherusers
export const fetchSearchData = async (searchTerms, tableName) => {
	try {
		await checkAllowedTableNames(["getroutes"], tableName);
		const correctSearchTerms = await checkSearchTerms(searchTerms);
		
		const query = await buildQuery(correctSearchTerms, false);

		const response = await fetch(`http://localhost:4000/api/${tableName}?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		const data = await response.json();

        await checkRes(response, data);

		const sanitizedData = sanitizeData(data);
		
		// If data is not correct format
		if (!Array.isArray(sanitizedData)) {
		  return Object.values(sanitizedData);
		}
		
		return sanitizedData;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
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

        await checkRes(response, data);

		const sanitizedData = sanitizeData(data);

		// If data is not correct format
		if (!Array.isArray(sanitizedData)) {
		  return Object.values(sanitizedData);
		}
		console.log(sanitizedData);
		
		return sanitizedData;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
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
		
        await checkRes(response, data);

		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
	}
    
};

export const fetchServerRoutes = async () => {
	try {	
		const response = await fetch("http://localhost:4000/api/routes", {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

		const data = await response.json();

        await checkRes(response, data);

		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
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

        await checkRes(response, data);

		const checkPublish = data.content.some((item) => item.Status !== "published");

		if (data.contentMap && data.content && checkPublish) {
			for (const item of data.content) {
				if (item.Status !== "published") {
					if (data.contentMap[item.Site_Identifier]) {
						data.contentMap[item.Site_Identifier][item.Language] = "Content is not published";
					}
				}
			}
		}
		
		const sanitizedData = sanitizeData(data);
		
		// Return only data.contentMap
		if (sanitizedData.contentMap) {
		  return sanitizedData.contentMap;
		}
		
		return sanitizedData;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
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

		const correctSearchTerms = await checkSearchTerms({Site_Identifier: contentIdentifier});

		const query = await buildQuery(correctSearchTerms, true);
		
		const response = await fetch(`http://localhost:4000/api/text-content?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		const data = await response.json();

        await checkRes(response, data);

		if (data.contentMap && data.content) {
			data.content.forEach((item) => {
				if (item.Status !== "published") {
					if (data.contentMap[item.Site_Identifier]) {
						data.contentMap[item.Site_Identifier][item.Language] = "Content is not published";
					}
				}
			});
		}
		
		const sanitizedData = sanitizeData(data);

		// Return only data.contentMap
		if (sanitizedData.content) {
		  return sanitizedData.content;
		}
		
		return sanitizedData;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
	}
};

export const fetchContentIdentifiers = async () => {
	try {	
		const response = await fetch("http://localhost:4000/api/text-content/identifiers", {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		
		const data = await response.json();

        await checkRes(response, data);

		if (typeof data === "object") {
			return Object.values(data);
		}
		
		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
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

        await checkRes(response, data);

		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
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

        await checkRes(response, data);

		return data;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
		

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

			await checkRes(response, data);

			//alert("Successfully signed in!");
			handleUserChange(data.user);
			return data.user;

			}
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
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

        await checkRes(response, data);

		//alert("Signed up successfully");

		return true;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
		

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
			return data;
		} else {
			// If authentication fails
			// User is not signed in (invalid token or other error)
			return data.message;
		}
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
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
		console.error(error);
		throw new Error(error.message || error);
	}
};


// User credential change
export const handleCredentialChange = async (event, formFields) => {
    event.preventDefault();
    try {
		const formData = new FormData();

		for (const [key, value] of Object.entries(formFields)) {
			if (value) formData.append(key, value);
		}
		
		if (formFields.currentPassword === "" || formFields.currentPassword === undefined) throw new Error("Current password is required when submitting new profile info!");

		const response = await fetch("http://localhost:4000/api/profile", {
				method: "PATCH",
				credentials: "include", // Important, because we're using cookies
				body: formData,
			});

		const data = await response.json();

		await checkRes(response, data);
		
		console.log("User updated successfully:", data);
		return true;
    } catch (error) {
		console.error(error);
		throw new Error(error.message || error);
    }
};

export const activateAccount = async (activationToken) => {
	try {
		const tableName = "users/activate";

		await checkAllowedTableNames(["getroutes"], tableName);

		const query = await buildQuery(activationToken, true);
		
		const response = await fetch(`http://localhost:4000/api/${tableName}?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		const data = await response.json();

        await checkRes(response, data);
		
		const sanitizedData = sanitizeData(data);
		
		// If data is not correct format
		if (!Array.isArray(sanitizedData)) {
		  return Object.values(sanitizedData);
		}
		
		return sanitizedData;
	} catch (error) {
		console.error(error);
		throw new Error(error.message || error);
	}
};
