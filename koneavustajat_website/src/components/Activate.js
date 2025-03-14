import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useError } from "../utils/Contexts";

const Activate = ({ activateAccount }) => {
	const { displayError } = useError();
	const location = useLocation();
	const params = new URLSearchParams(location.search);
	const activationToken = params.get("activationToken");
	
	const [activationStatus, setActivationStatus] = useState(false);
	const activationAttemptedRef = useRef(false);
	
	const handleActivation = useCallback(async () => {
		if (!activationToken || activationAttemptedRef.current) return;
		activationAttemptedRef.current = true;

		try {
			const activate = await activateAccount({ activationToken });
			if (!activate) {
				throw new Error("Failed to activate account!");
			}
			setActivationStatus(true);
			displayError("Successfully activated account!", "success");
		} catch (error) {
			displayError(error);
		}
	}, [activationToken, activateAccount, displayError]);

	useEffect(() => {
		if (!activationStatus && activationToken && !activationAttemptedRef.current) {
			const delay = setTimeout(handleActivation, 3000);
			return () => {
				clearTimeout(delay);
			};
		}
	}, [activationToken, activationStatus, handleActivation]);
	
	const renderActivationStatus = () => {
		if (!activationToken || activationAttemptedRef.current) {
			displayError("Invalid or used activation token!");
			return <Navigate to="/profile" />;
		}
		if (!activationStatus) {
			return <h2>Activating account...</h2>;
		}
		return <Navigate to="/profile" />;
	};

	return (
		<>
			{renderActivationStatus()}
		</>
	);
};

export default Activate;
