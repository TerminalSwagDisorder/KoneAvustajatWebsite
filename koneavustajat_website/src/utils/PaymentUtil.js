import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Spinner } from "react-bootstrap";
import { useError } from "../utils/Contexts";

export const PaymentUtil = ({ children }) => {
    const { displayError } = useError();
	const [stripeInstance, setStripeInstance] = useState(null);
	const [errorMsg, setErrorMsg] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadStripeInstance();
	}, []);

	useEffect(() => {
		if (errorMsg) {
			displayError(errorMsg);
			setErrorMsg(null);
		}
	}, [errorMsg, displayError]);
	
	const loadStripeInstance = async () => {
		try {
			const stripePromise = await loadStripe("pk_test_51QjedYJvqvHRnyNJf3Ea1PBeEp20evGVLzZg1qU1XIPlgCDlAtliWvrHvRS47Chfbo2cpkbitlaY6OAETy95v8er00n9ZcGFIe");
			setStripeInstance(stripePromise);
		} catch (error) {
			setErrorMsg(`Cannot load payment method due to: ${error.message ? error.message : error}`);
		} finally {
			setIsLoading(false);
		}
	};

	if (errorMsg) {
		return (
			<>
				<p className="loadelement">Payment methods are not loaded!</p>
				{children}
			</>
		);
	}

	if (isLoading) {
		return (
			<>
				<p className="loadelement"><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> loading payment method...</p>
				{children}
			</>
			
		);
	}
	
	return (
		<Elements stripe={stripeInstance}>
			{children}
		</Elements>
	);
};
