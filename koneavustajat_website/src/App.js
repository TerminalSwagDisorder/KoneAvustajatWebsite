import {Routes, Route, BrowserRouter } from "react-router-dom";
import React, { useState, useEffect } from "react";
import "./style/style.scss";
import Home from "./components/Home";
import Profile from "./components/Profile";
import NavBar from "./components/Nav";
import Signin from "./components/Signin";
import Signup from "./components/Signup";
import Admin from "./components/Admin";
import DashboardAdmin from "./components/DashboardAdmin";
import { ThemeContext, ThemeProvider, fetchUsers, fetchDynamicData, fetchSearchIdData, fetchDataAmount, handleSignin, handleSignup, handleSignout, checkIfSignedIn, refreshProfile, handleCredentialChange } from "./api/api";


function App() {

	const [currentUser, setCurrentUser] = useState(null);

	// Check if the user is signed in on page load
	const fetchUserStatus = async () => {
		try {
			// Initialize currentUser with user data
			const userData = await checkIfSignedIn();
			if (userData) {
				// Refresh profile
				const refreshedUserData = await refreshProfile();
				setCurrentUser(refreshedUserData);
				console.log("userData", userData) // note that userData remains the same until re-login
				console.log("refreshedUserData", refreshedUserData) // Thats why we have refreshedUserData
			} else {
				setCurrentUser(null);
			}
		} catch (error) {
			console.error("Error fetching user status:", error);
			setCurrentUser(null);
		}
	};
	useEffect(() => {
		fetchUserStatus();
	}, []);

	const handleUserChange = (event) => {
		setCurrentUser(event);
	};
	
	const refreshProfileData = async () => {
		const refreshedUserData = await refreshProfile();
		setCurrentUser(refreshedUserData);
		
	}

  return (
	  <ThemeProvider>
		<div className="App">
		<BrowserRouter>
		<NavBar currentUser={currentUser} handleUserChange={handleUserChange} handleSignout={handleSignout} ThemeContext={ThemeContext} /> 
		<Routes>
	  		<Route path="/" element={<Home />} />
		{/*{currentUser && currentUser.role === "admin" && (*/}
		{currentUser && currentUser.role === "ambulance" && (
		<Route path="admin" element={<Admin currentUser={currentUser} />}>
			<Route path="dashboard" element={<DashboardAdmin currentUser={currentUser} />} />

		</Route>
		)}
		{currentUser ? (
			<>
			<Route path="profile" element={<Profile currentUser={currentUser} setCurrentUser={handleUserChange} handleCredentialChange={handleCredentialChange} handleSignout={handleSignout} refreshProfileData={refreshProfileData} />} />
			</>
		):(
			<>
			<Route path="signup" element={<Signup handleSignup={handleSignup} />} />
			<Route path="Signin" element={<Signin handleUserChange={handleUserChange} currentUser={currentUser} handleSignin={handleSignin} checkIfSignedIn={checkIfSignedIn}/>} />
			</>
		)}
		</Routes>
		</BrowserRouter>
		</div>
	</ThemeProvider>
  );
}

export default App;
