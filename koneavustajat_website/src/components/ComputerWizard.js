import React from "react";
import { Outlet } from "react-router-dom";

const ComputerWizard = () => {
	return (
		<div>
			<Outlet />
		</div>
	);
};

export default ComputerWizard;
