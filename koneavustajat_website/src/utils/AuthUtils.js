import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./Contexts";

export const ProtectedRoute = ({ children, adminOnly = false, unloggedOnly = false }) => {
	if (typeof adminOnly !== "boolean") throw new Error("Invalid type for 'adminOnly'. Only a boolean value is allowed!'");
	if (typeof unloggedOnly !== "boolean") throw new Error("Invalid type for 'unloggedOnly'. Only a boolean value is allowed!'");
	const { currentUser } = useAuth();

	if (!currentUser && !unloggedOnly) {
		return <Navigate to="/signin" />;
	}
	
	if (currentUser && unloggedOnly) {
		return <Navigate to="/profile" />;
	}

	if (adminOnly && !currentUser.isAdmin) {
		console.warn(`Unauthorized access attempt by user: ${currentUser.UserID || "Undefined"}`);
		return <Navigate to="/signin" />;
	}

	return children;
};
