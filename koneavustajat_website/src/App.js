import {Routes, Route, BrowserRouter, Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import "./style/style.scss";
import Home from "./components/Home";
import Profile from "./components/Profile";
import NavBar from "./components/Nav";
import Signin from "./components/Signin";
import Signup from "./components/Signup";
import Admin from "./components/Admin";
import DashboardAdmin from "./components/DashboardAdmin";
import UsersAdmin from "./components/UsersAdmin";
import PartsDisplay from "./components/PartsDisplay";
import ComputerWizard from './components/ComputerWizard';
import ComputerWizardBrowse from './components/ComputerWizardBrowse';
import ComputerWizardWizard from './components/ComputerWizardWizard';
import ComputerWizardBuild from './components/ComputerWizardBuild';
import UsedParts from './components/UsedParts';
import UsedPartsBrowse from './components/UsedPartsBrowse';
import UsedPartsPurchase from './components/UsedPartsPurchase';
import UsedPartsBuild from './components/UsedPartsBuild';
import UsedPartsModify from './components/UsedPartsModify';
import ShoppingCart from './components/ShoppingCart';
import { ThemeContext, ThemeProvider, fetchUsers, fetchDynamicData, fetchSearchIdData, fetchDataAmount, handleSignin, handleSignup, handleSignout, checkIfSignedIn, refreshProfile, handleCredentialChange, wizardAlgorithm } from "./api/api";
import { useSelector, useDispatch } from "react-redux";



function App() {
	const [currentUser, setCurrentUser] = useState(null);

	const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
	const wizard = useSelector((state) => state.wizard.wizard);
	const completedBuild = useSelector((state) => state.wizard.completedBuild);
	const dispatch = useDispatch();
	const cartItems = Object.values(shoppingCart);
	const wizardItems = Object.values(wizard);
	const completedBuildItems = Object.values(completedBuild);
  	const totalCartItems = cartItems.reduce((total, item) => total + item.quantity || 1, 0);
  	const totalWizardItems = wizardItems.length;
  	const totalCompletedBuildItems = completedBuildItems.length;

	//console.log("shoppingCart ", shoppingCart);
	console.log("cartItems ", cartItems);

	//console.log("wizard ", wizard);
	//console.log("wizardItems ", wizardItems);

	console.log("totalCartItems ", totalCartItems);
	console.log("totalWizardItems ", totalWizardItems);
	console.log("totalCompletedBuildItems ", totalCompletedBuildItems);

	// Check if the user is signed in on page load
	const fetchUserStatus = async () => {
		try {
			// Initialize currentUser with user data
			const userData = await checkIfSignedIn();
			if (userData) {
				// Refresh profile
				const refreshedUserData = await refreshProfile();
				setCurrentUser(refreshedUserData);
				console.log("userData", userData); // note that userData remains the same until re-login
				console.log("refreshedUserData", refreshedUserData); // Thats why we have refreshedUserData
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
		{currentUser && currentUser.isAdmin && (
                            <Route path="admin" element={<Admin currentUser={currentUser} />}>
                                <Route path="dashboard" element={<DashboardAdmin currentUser={currentUser} />} />
                                <Route path="users" element={<UsersAdmin currentUser={currentUser} fetchUsers={fetchUsers} />} />
								<Route path="parts" element={<PartsDisplay fetchDynamicData={fetchDynamicData} />} />
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
			<Route path="computerwizard" element={<ComputerWizard />}>
				<Route path="browse" element={<ComputerWizardBrowse fetchDynamicData={fetchDynamicData} fetchDataAmount={fetchDataAmount} />} />
				<Route path="wizard" element={<ComputerWizardWizard wizardAlgorithm={wizardAlgorithm} />} />
				<Route path="build" element={<ComputerWizardBuild />} />
			</Route>
			<Route path="usedparts" element={<UsedPartsBrowse fetchDynamicData={fetchDynamicData} fetchDataAmount={fetchDataAmount} />} />

			{shoppingCart && totalCartItems && totalCartItems > 0 && (
				<Route path="shoppingcart" element={<ShoppingCart />} />
			)}
		</Routes>
		</BrowserRouter>
		</div>
	</ThemeProvider>
  );
}

export default App;
