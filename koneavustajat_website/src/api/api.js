// File name: api.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for api functionality

import { checkAllowedTableNames, checkAllowedPartNames, checkSearchTerms, buildQuery, validateIdentifiers, checkRes, sanitizeData, handleError, checkOrderBy } from "./helpers";
import "../style/style.scss";

const apiUrl = process.env.REACT_APP_API_URL;

export const wizardAlgorithm = async (formFields) => {
	try {
		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);

		const response = await fetch(`${apiUrl}/api/algorithm`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // For all fetch requests, do this!
			body: JSON.stringify({ formFields })
		});
        await checkRes(response);

		const data = await response.json();

		//alert("Build fetched.");
		return data;
	} catch (error) {
		handleError(error.message || error);
	}
};


// All of the user data handling
// Fetch users using pagination
export const fetchUsers = async (page) => {
	try {
		const response = await fetch(`${apiUrl}/api/users?page=${page}&items=50`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

		await checkRes(response);

		const data = await response.json();

		// If data is not correct format
		if (!Array.isArray(data)) {
		  return Object.values(data);
		}
		
		return data;
	} catch (error) {
		handleError(error.message || error);
		
	}
};


// Fetch different types of data from pages
export const fetchDynamicData = async (page, tableName, partName = "", orderBy = "") => {
	try {
		await checkAllowedTableNames(["getroutes"], tableName);
		
		if (partName) {
			await checkAllowedPartNames(partName);
		} else {
			console.log("partName has no value. This might be intentional, but double check to be sure.");
		}

		let orderArr;
		if (orderBy || orderBy.length !== 0) {
			orderArr = checkOrderBy(orderBy);
		}

		const correctSearchTerms = await checkSearchTerms({page: page, partName: partName});

		if (orderArr) {
			correctSearchTerms.orderBy = encodeURIComponent(orderArr.join(";"));
		}

		const query = await buildQuery(correctSearchTerms, true);
		
		console.log("query", query)
		
		const response = await fetch(`${apiUrl}/api/${tableName}?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

        await checkRes(response);
		
		const data = await response.json();

		const sanitizedData = sanitizeData(data);
		
		// If data is not correct format
		if (!Array.isArray(sanitizedData)) {
		  return Object.values(sanitizedData);
		}
		
		return sanitizedData;
	} catch (error) {
		handleError(error.message || error);
	}
};

export const updateDynamicData = async (formFields, tableName, partName = null, id = null) => {
	try {
		console.log(`${apiUrl}/api/${tableName}/update/${partName}/${id}`);
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
		console.log(formFields);
		
		// api call to register a new user
		const response = await fetch(`${apiUrl}/api/${tableName}${tableName.includes("/update") ? "" : "/update"}${partName ? "/" + partName : ""}${id ? "/" + id : ""}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

		await checkRes(response);

		const data = await response.json();
		
		//alert(`Successfully updated ${partName} with id ${id} from ${tableName}`);

		return data;
	} catch (error) {
		handleError(error.message || error);
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
		const response = await fetch(`${apiUrl}/api/${tableName}${partName ? "/" + partName : ""}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

        await checkRes(response);

		const data = await response.json();
		
		//alert(`Successfully added ${partName} to ${tableName}`);

		return data;
	} catch (error) {
		handleError(error.message || error);
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
		const response = await fetch(`${apiUrl}/api/${tableName}${tableName.includes("/delete") ? "" : "/delete"}/${partName ? "/" + partName : ""}${id ? "/" + id : ""}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
		});

        await checkRes(response);

		const data = await response.json();
		
		return true;
	} catch (error) {
		handleError(error.message || error);
	}
};

export const downloadFile = async (tableName, fileName = "downloaded_file.txt") => {
	try {
		await checkAllowedTableNames(["getroutes"], tableName);
		
		const response = await fetch(`${apiUrl}/api/${tableName}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

        await checkRes(response, "Failed to download file!");
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
		handleError(error.message || error);
	}
};

// Search function for users/otherusers
export const fetchSearchData = async (searchTerms, tableName, orderBy = "") => {
	try {
		await checkAllowedTableNames(["getroutes"], tableName);
		
		let orderArr;
		if (orderBy || orderBy.length !== 0) {
			orderArr = checkOrderBy(orderBy);
		}

		const correctSearchTerms = await checkSearchTerms({...searchTerms});
		
		if (orderArr) {
			correctSearchTerms.orderBy = encodeURIComponent(orderArr.join(";"));
		}

		const query = await buildQuery(correctSearchTerms, false);
		console.log(query);
		const response = await fetch(`${apiUrl}/api/${tableName}?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

        await checkRes(response);

		const data = await response.json();

		const sanitizedData = sanitizeData(data);
		
		// If data is not correct format
		if (!Array.isArray(sanitizedData)) {
		  return Object.values(sanitizedData);
		}
		
		return sanitizedData;
	} catch (error) {
		handleError(error.message || error);
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
		
		const response = await fetch(`${apiUrl}/api/${tableName}?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

        await checkRes(response);

		const data = await response.json();

		const sanitizedData = sanitizeData(data);

		// If data is not correct format
		if (!Array.isArray(sanitizedData)) {
		  return Object.values(sanitizedData);
		}
		console.log(sanitizedData);
		
		return sanitizedData;
	} catch (error) {
		handleError(error.message || error);
	}
};

// For pagination
export const fetchDataAmount = async (tableName) => {
	try {
		await checkAllowedPartNames(tableName);

		const correctSearchTerms = await checkSearchTerms(tableName);
		const query = await buildQuery(correctSearchTerms, true);

		const response = await fetch(`${apiUrl}/api/count?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		
        await checkRes(response);
		
		const data = await response.json();

		return data;
	} catch (error) {
		handleError(error.message || error);
	}
    
};

export const fetchServerRoutes = async () => {
	try {	
		const response = await fetch(`${apiUrl}/api/routes`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

        await checkRes(response);

		const data = await response.json();

		return data;
	} catch (error) {
		handleError(error.message || error);
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

		const response = await fetch(`${apiUrl}/api/text-content?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
        await checkRes(response);

		const data = await response.json();

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
		handleError(error.message || error);
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
		
		const response = await fetch(`${apiUrl}/api/text-content?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
        await checkRes(response);

		const data = await response.json();

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
		handleError(error.message || error);
	}
};

export const fetchContentIdentifiers = async () => {
	try {	
		const response = await fetch(`${apiUrl}/api/text-content/identifiers`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
		
        await checkRes(response);

		const data = await response.json();

		if (typeof data === "object") {
			return Object.values(data);
		}
		
		return data;
	} catch (error) {
		handleError(error.message || error);
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

		const response = await fetch(`${apiUrl}/api/text-content/add`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // For all fetch requests, do this!
			body: JSON.stringify({ formFields })
		});
        await checkRes(response);

		const data = await response.json();

		return data;
	} catch (error) {
		handleError(error.message || error);
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
		const response = await fetch(`${apiUrl}/api/text-content/update`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

        await checkRes(response);

		const data = await response.json();

		return data;
	} catch (error) {
		handleError(error.message || error);
		

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

			const response = await fetch(`${apiUrl}/api/users/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				credentials: "include", // For all fetch requests, do this!
				body: JSON.stringify({ formFields })
			});
			await checkRes(response);

			const data = await response.json();
			console.log(data.user);

			//alert("Successfully signed in!");
			handleUserChange(data.user);
			return data.user;

			}
	} catch (error) {
		handleError(error.message || error);
	}
};

// Signup
export const handleSignup = async (event, formFields) => {
	try {
		if (formFields && typeof formFields === "object" && Array.isArray(formFields)) formFields = JSON.stringify(formFields);
		// api call to register a new user
		const response = await fetch(`${apiUrl}/api/users/signup`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields })
		});

        await checkRes(response);

		const data = await response.json();

		//alert("Signed up successfully");

		return true;
	} catch (error) {
		handleError(error.message || error);
	}
};

// Signout
export const handleSignout = async (handleUserChange) => {
	try {
		// api call to log out the user
		const response = await fetch(`${apiUrl}/api/logout`, {
			method: "POST",
			credentials: "include",  // Important, because we're using cookies
		});

		await checkRes(response);

		const data = await response.json();

		// If successful, reload the current window
		localStorage.removeItem("accessToken");
		sessionStorage.removeItem("accessToken");

		window.location.reload();
		return "Logged out successfully";
		
	} catch (error) {
		handleError(error.message || error);
	}
};


// Signin status check
export const checkIfSignedIn = async () => {

	// api call to get the user's profile information
	try {
		const response = await fetch(`${apiUrl}/api/profile`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});


		const data = await response.json();
		
		if (!response.ok) return data;

		await checkRes(response);

		return data;
	} catch (error) {
		handleError(error.message || error);
	}
};


// Profile refresh
export const refreshProfile = async () => {

	// api call to get the user's profile information
	try {
		const response = await fetch(`${apiUrl}/api/profile/refresh`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});

		const data = await response.json();
		
		if (!response.ok) return data;

		await checkRes(response);
		
		return data.userData;
	} catch (error) {
		handleError(error.message || error);
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

		const response = await fetch(`${apiUrl}/api/profile`, {
				method: "PATCH",
				credentials: "include", // Important, because we're using cookies
				body: formData,
			});

		await checkRes(response);

		const data = await response.json();
		
		console.log("User updated successfully:", data);
		return true;
    } catch (error) {
		handleError(error.message || error);
    }
};

export const activateAccount = async (activationToken) => {
	try {
		const tableName = "users/activate";

		await checkAllowedTableNames(["getroutes"], tableName);

		const query = await buildQuery(activationToken, false);
		
		const response = await fetch(`${apiUrl}/api/${tableName}?${query}`, {
			method: "GET",
			credentials: "include", // Important, because we're using cookies
		});
        await checkRes(response);

		const data = await response.json();
		
		const sanitizedData = sanitizeData(data);
		
		// If data is not correct format
		if (!Array.isArray(sanitizedData)) {
		  return Object.values(sanitizedData);
		}
		
		return sanitizedData;
	} catch (error) {
		handleError(error.message || error);
	}
};
