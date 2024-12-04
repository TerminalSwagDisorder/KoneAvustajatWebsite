import React from "react";
import { Outlet, Navigate, useMatch } from "react-router-dom";

const ComputerWizard = () => {
	const match = useMatch("/computerwizard");
	const matchSlash = useMatch("/computerwizard/");

	if (match || matchSlash) {
		return <Navigate to="/computerwizard/browse" replace />;
	}

	return (
		<div>
			<Outlet />
		</div>
	);
};

export default ComputerWizard;
