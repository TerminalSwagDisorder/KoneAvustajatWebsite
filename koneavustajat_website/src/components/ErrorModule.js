// components/ErrorModule.js
import React from "react";
import { Alert } from "react-bootstrap";
import { useError } from "../utils/Contexts";

const ErrorModule = () => {
	const { errorContent, type, displayError, clearError } = useError();

	const alertVariants = {
		error: "danger",
		success: "success",
		warning: "warning",
		info: "info"
	};
	
	if (!errorContent) return null;

	return (
		<div className="error-module">
			<Alert variant={alertVariants[type] || "danger"} onClose={clearError} dismissible>
				{errorContent}
			</Alert>
		</div>
	);
};

export default ErrorModule;
