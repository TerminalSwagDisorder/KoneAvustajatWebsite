import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_live_51QjedYJvqvHRnyNJgSaLhBwS31i7R9uvru1gwCy6zwygAZrku3zyDy6xV7MIgfMgQePk6tYdjTNPtCUWmFmKGEmn00cslnR6Ar"); // e.g. pk_test_1234

export const PaymentUtil = ({ children }) => {
	return (
		<Elements stripe={stripePromise}>
			{children}
		</Elements>
	);
};
