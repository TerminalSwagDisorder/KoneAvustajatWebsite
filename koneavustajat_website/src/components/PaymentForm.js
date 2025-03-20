import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { usePayment } from "../utils/Contexts";
import { Form, Button, CloseButton } from "react-bootstrap";
import { useError } from "../utils/Contexts";

const PaymentForm = ({ onPaymentSuccess, onCancel }) => {
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
			displayError(error);
		} finally {
			setProcessing(false);
		}
	};

/*
	.StripeElement {
		background-color: $text_input_bg;
		border-radius: 0.5rem;
		padding-bottom: 0.75rem 0.25rem;
		border: 1px solid #ccc;
		&::placeholder {
			color: white;
		}
	}
*/

	const cardElementOptions = {
		style: {
			base: {
				fontSize: "16px",
				fontWeight: "400",
				color: "white",
				"::placeholder": {
					color: "lightgray"
				}
			},
			invalid: {
				color: "#fa755a",
				iconColor: "#fa755a"
			}
		}
	};

	return (
		<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
			<div className="d-flex justify-content-end mb-3">
				<CloseButton onClick={onCancel} disabled={processing} />
			</div>
			<CardElement options={cardElementOptions} />
			<div className="d-flex justify-content-between mt-3">
				<Button type="submit" disabled={!stripe || processing || !clientSecret}>
					{processing ? "Processing..." : "Pay"}
				</Button>
			</div>
		</Form>
	);
};

export default PaymentForm;
