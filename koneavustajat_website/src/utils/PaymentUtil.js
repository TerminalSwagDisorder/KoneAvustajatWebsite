import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_51QjedYJvqvHRnyNJf3Ea1PBeEp20evGVLzZg1qU1XIPlgCDlAtliWvrHvRS47Chfbo2cpkbitlaY6OAETy95v8er00n9ZcGFIe"); // e.g. pk_test_1234

export const PaymentUtil = ({ children }) => {
	return (
		<Elements stripe={stripePromise}>
			{children}
		</Elements>
	);
};
