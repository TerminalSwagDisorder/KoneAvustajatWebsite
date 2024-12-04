import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./Contexts";

export const ProtectedRoute = ({ children, adminOnly = false, unloggedOnly = false }) => {
	if (typeof adminOnly !== "boolean") throw new Error("Invalid type for 'adminOnly'. Only a boolean value is allowed!'");
	if (typeof unloggedOnly !== "boolean") throw new Error("Invalid type for 'unloggedOnly'. Only a boolean value is allowed!'");
	if (unloggedOnly && adminOnly) throw new Error("You cannot have both 'adminOnly' and 'unloggedOnly'. Please choose only one.");
	const { currentUser } = useAuth();
	console.log(currentUser);
	
	if (!adminOnly && unloggedOnly && currentUser) {
		console.warn(`User (${currentUser.UserID || "Undefined"}) tried to access a page that requires to not be logged in while being logged in.`);
		return <Navigate to="/profile" />;
	}

	if (!adminOnly && !unloggedOnly && !currentUser) {
		console.warn(`User tried to access a page that requires login while not being logged in.`);
		return <Navigate to="/signin" />;
	}

	if (adminOnly && !unloggedOnly && (!currentUser || !currentUser.isAdmin)) {
		console.warn(`Unauthorized admin access attempt by user: ${currentUser ? currentUser.UserID : "Undefined"}`);
		return <Navigate to="/signin" />;
	}

	return children;
};
