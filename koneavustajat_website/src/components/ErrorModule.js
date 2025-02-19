// components/ErrorModule.js
import React, { useMemo } from "react";
import { Alert } from "react-bootstrap";
import { useError } from "../utils/Contexts";

const ErrorModule = () => {
	const { errorContent, type, displayError, clearError } = useError();
	let contentDisplay;

	const alertVariants = useMemo(() => ({
		error: "danger",
		success: "success",
		warning: "warning",
		info: "info"
	}), []);
	
	if (!errorContent) return null;

	if (typeof errorContent === "object") {
		if (errorContent.message) {
			contentDisplay = errorContent.message;
		} else {
			try {
				contentDisplay = JSON.stringify(errorContent, null, 2);
			} catch (error) {
				contentDisplay = `${errorContent}`;
			}
		}
	} else {
		contentDisplay = errorContent;
	}

	return (
		<div className="error-module">
			<Alert variant={alertVariants[type] || "danger"} onClose={clearError} dismissible>
				{contentDisplay}
			</Alert>
		</div>
	);
};

export default ErrorModule;
