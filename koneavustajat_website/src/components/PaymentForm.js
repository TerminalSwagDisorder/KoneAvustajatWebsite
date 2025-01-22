import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { usePayment } from "../utils/Contexts";

const PaymentForm = ({ onPaymentSuccess }) => {
    const { clientSecret, setClientSecret } = usePayment();
	const stripe = useStripe();
	const elements = useElements();
	const [processing, setProcessing] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!stripe || !elements) return;

		setProcessing(true);

		const cardElement = elements.getElement(CardElement);

		try {
			// Confirm card payment
			const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
				payment_method: {
					card: cardElement
				}
			});

			if (confirmError) {
				throw confirmError;
			}

			if (paymentIntent && paymentIntent.status === "succeeded") {
				onPaymentSuccess();
			}
		} catch (error) {
			alert(error.message);
		} finally {
			setProcessing(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<CardElement />
			<button type="submit" disabled={!stripe || processing}>
				{processing ? "Processing..." : "Pay"}
			</button>
		</form>
	);
};

export default PaymentForm;
