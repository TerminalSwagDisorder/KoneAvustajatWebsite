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
import ContentManagementModal from './components/ContentManagementModal';
import {
	fetchUsers,
	fetchDynamicData,
	fetchSearchIdData,
	fetchDataAmount,
	handleSignin,
	handleSignup,
	handleSignout,
	checkIfSignedIn,
	refreshProfile,
	handleCredentialChange,
	wizardAlgorithm,
	updateDynamicData,
	postDynamicData,
	deleteDynamicData,
	fetchContent,
	fetchContentIdentifiers,
	fetchWholeContent,
	addContent,
	updateContent
} from "./api/api";
import { ContentProvider, ModalProvider, useAuth, PaymentProvider } from "./utils/Contexts";
import { ProtectedRoute } from "./utils/AuthUtils";
import { useSelector, useDispatch } from "react-redux";
import { PaymentUtil } from "./utils/PaymentUtil";



function App() {
	const { currentUser } = useAuth();
	
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

  return (
		<BrowserRouter>
			<ModalProvider>
				<ContentProvider fetchContent={fetchContent}>
					<PaymentProvider>
						<PaymentUtil>
						<div className="App">
						<NavBar handleSignout={handleSignout} /> 
						<ContentManagementModal fetchWholeContent={fetchWholeContent} fetchContentIdentifiers={fetchContentIdentifiers} addContent={addContent} updateContent={updateContent} />
						<Routes>
							<Route path="/" element={<Home />} />
						{/*{currentUser && currentUser.role === "admin" && (*/}

						<Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>}>
							<Route path="dashboard" element={<DashboardAdmin />} />
							<Route path="users" element={<UsersAdmin fetchDynamicData={fetchDynamicData} fetchDataAmount={fetchDataAmount} />} />
							<Route path="parts" element={<PartsDisplay fetchDynamicData={fetchDynamicData} />} />
						</Route>

						<Route path="profile" element={<ProtectedRoute><Profile handleCredentialChange={handleCredentialChange} handleSignout={handleSignout} fetchDynamicData={fetchDynamicData} updateDynamicData={updateDynamicData} postDynamicData={postDynamicData} /></ProtectedRoute>} />
						<Route path="signup" element={<ProtectedRoute unloggedOnly><Signup handleSignup={handleSignup} /></ProtectedRoute>} />
						<Route path="Signin" element={<ProtectedRoute unloggedOnly><Signin handleSignin={handleSignin} checkIfSignedIn={checkIfSignedIn}/></ProtectedRoute>} />
						<Route path="computerwizard" element={<ComputerWizard />}>
							<Route path="browse" element={<ComputerWizardBrowse fetchDynamicData={fetchDynamicData} fetchDataAmount={fetchDataAmount} updateDynamicData={updateDynamicData} deleteDynamicData={deleteDynamicData} />} />
							<Route path="wizard" element={<ComputerWizardWizard wizardAlgorithm={wizardAlgorithm} />} />
							<Route path="build" element={<ComputerWizardBuild />} />
						</Route>
						<Route path="usedparts" element={<UsedPartsBrowse fetchDynamicData={fetchDynamicData} fetchDataAmount={fetchDataAmount} postDynamicData={postDynamicData} updateDynamicData={updateDynamicData} />} />
							{shoppingCart && totalCartItems && totalCartItems > 0 && (
									<Route path="shoppingcart" element={<ShoppingCart postDynamicData={postDynamicData}/>} />
							)}
						</Routes>
						</div>
					</PaymentUtil>
				</PaymentProvider>
			</ContentProvider>
		</ModalProvider>
	</BrowserRouter>
  );
}

export default App;
