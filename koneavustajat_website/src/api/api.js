// File name: api.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for api functionality

import React, { useEffect, useState, createContext, useContext } from "react";
import { checkAllowedTableNames, checkAllowedPartNames, checkSearchTerms, buildQuery } from "./helpers";
import "../style/style.scss";


// Light & Darkmode switch
// Create a context for the theme
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Initialize theme from local storage or default to "light"
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

    // Update local storage when theme changes
    useEffect(() => {
        localStorage.setItem("theme", theme);
        document.body.setAttribute("data-theme", theme);  // Apply the theme to the document body
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const wizardAlgorithm = async (wizard) => {
	console.log("This will be used for the wizard algorithm");
	/*
	const response = await fetch(`http://localhost:4000/api/algorithm`, {
		method: "GET",
		credentials: "include", // Important, because we're using cookies
	});
	 
	 */
	
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
            alert(`HTTP error ${response.status}: ${data.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message}`);
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
            alert(`HTTP error ${response.status}: ${data.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message}`);
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
            alert(`HTTP error ${response.status}: ${data.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message}`);
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
            alert(`HTTP error ${response.status}: ${data.message}`);
            throw new Error(`HTTP error ${response.status}: ${data.message}`);
        }

		// If data is not correct format
		if (!Array.isArray(data)) {
		  return Object.values(data);
		}
		console.log(data)
		
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

        if (!response.ok) {
			alert(`HTTP error ${response.status}: ${response.message}`);
            throw new Error(`HTTP error ${response.status}: ${response.message}`);
        }

		const count = await response.json();
		return count;
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

        if (!response.ok) {
			alert(`HTTP error ${response.status}: ${response.message}`);
            throw new Error(`HTTP error ${response.status}: ${response.message}`);
        }

		const routes = await response.json();
		return routes;
	} catch (error) {
		console.error("Error while getting pagination:", error);
	}
    
};

// Do all of the user data handling async
// Signin
export const handleSignin = async (event, formFields, handleUserChange, userType) => {
	const email = event.target.email.value;
	const password = event.target.password.value;
	// Only allow the specified userTypes
	const allowedUserTypes = ["otheruser", "user"]
	if (!allowedUserTypes.includes(userType) || userType === "") {
		console.error(`userType "${userType}" is not allowed!`)
		alert(`userType "${userType}" is not allowed!`)
	}

	// api call to the server to log in the user
	try {
		if (email && password) {
		// Depending on usertype, create the endpoint
			let responseEndpoint;
			if (userType === "user") {
				responseEndpoint = "users"
			} else if (userType === "otheruser") {
				responseEndpoint = "other/users"
			}

			if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);

			const response = await fetch(`http://localhost:4000/api/${responseEndpoint}/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				credentials: "include", // For all fetch requests, do this!
				body: JSON.stringify({ formFields, userType })
			});
			const data = await response.json();
			//console.log("data.userData", data.user)

			// If successful, set the current user to the provided credentials and return the data
			if (response.ok) {
				alert("Successfully signed in!")
				handleUserChange(data.user);
				return data.user;
			} else {
				console.log(data)
				if (data.message) {
					alert(`HTTP error ${response.status}: ${data.message}`)
					throw new Error(data.error);
				} else {
					alert("Failed sign in. Please try again.");
					throw new Error(data.error);
					}
				}
			}
	} catch (error) {
		console.error("Error signing user in:", error);
	}
};


// Signup, alternative
/*
export const handleSignup = async (event, formFields) => {
	try {
		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);
		console.log(formFields)
		// api call to register a new user
		const response = await fetch(`http://localhost:4000/api/users/signup`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields }),
		});

		const data = await response.json();

		if (response.ok) {
			alert("Signed up successfully");
			return true;
		} else {
			if (data.message) {
				alert(`HTTP error ${response.status}: ${data.message}`)
				throw new Error(data.error);
			} else {
				alert("Failed sign up. Please try again.");
				throw new Error(data.error);
			}
		}
	} catch (error) {
		console.error("Error adding user:", error);
		if (error.message) alert(error.message)
		//throw new Error(error);

	}
};
*/

// Signup
export const handleSignup = async (event, userType, formFields) => {

	// Only allow the specified userTypes
	const allowedUserTypes = ["user", "otheruser"]
	if (!allowedUserTypes.includes(userType) || userType === "") {
		console.error(`userType "${userType}" is not allowed!`)
		alert(`userType "${userType}" is not allowed!`)
	}

	//console.log(name, email, password)
	try {
		// Depending on usertype, create the endpoint
		let responseEndpoint;
		if (userType === "user") {
			formFields.role = "user"
			responseEndpoint = "users"
		} else if (userType === "otheruser") {
			formFields.role = "ambulance"
			responseEndpoint = "other/users"
		}

		if (formFields && typeof formFields === "object" && !Array.isArray(formFields)) formFields = JSON.stringify(formFields);
		console.log(formFields)
		// api call to register a new user
		const response = await fetch(`http://localhost:4000/api/${responseEndpoint}/signup`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include", // Important, because we're using cookies
			body: JSON.stringify({ formFields }),
		});

		const data = await response.json();

		if (response.ok) {
			alert("Signed up successfully");
			return true;
		} else {
			if (data.message) {
				alert(`HTTP error ${response.status}: ${data.message}`)
				throw new Error(data.error);
			} else {
				alert("Failed sign up. Please try again.");
				throw new Error(data.error);
			}
		}
	} catch (error) {
		console.error("Error adding user:", error);
		if (error.message) alert(error.message)

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
		console.log(data)

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
			if (data.message) {
				alert(`HTTP error ${response.status}: ${data.message}`)
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
