import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { usePayment } from "../utils/Contexts";
import { Form, Button } from "react-bootstrap";
import { useError } from "../utils/Contexts";

const PaymentForm = ({ onPaymentSuccess }) => {
	const { displayError } = useError();
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
				const transactionId = paymentIntent.id;
				onPaymentSuccess(transactionId);
			}

		} catch (error) {
			displayError(`${error}`);
		} finally {
			setProcessing(false);
		}
	};

	return (
		<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
			<CardElement />
			<Button type="submit" disabled={!stripe || processing || !clientSecret}>
				{processing ? "Processing..." : "Pay"}
			</Button>
		</Form>
	);
};

export default PaymentForm;
