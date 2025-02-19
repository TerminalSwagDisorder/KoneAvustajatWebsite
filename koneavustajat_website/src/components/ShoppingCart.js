import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Container, Button, Image, CloseButton, ListGroup } from "react-bootstrap";
import {
	addToShoppingCart,
	removeFromShoppingCart,
	removeOneFromShoppingCart,
	clearShoppingCart
} from "../redux/shoppingCartSlice";
import PaymentForm from "./PaymentForm.js";
import { usePayment, useError } from "../utils/Contexts";
import { Navigate } from "react-router-dom";


const ShoppingCart = ({ postDynamicData, updateDynamicData }) => {
    const { displayError } = useError();
    const { clientSecret, setClientSecret } = usePayment();
	const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
	const dispatch = useDispatch();
	const cartItems = Object.values(shoppingCart);
	const cartEntries = Object.entries(shoppingCart);
	const [chosenPart, setChosenPart] = useState("");
	const [formFields, setFormFields] = useState({
		TotalPrice: 0,
		Items: {},
	});
	const [showPaymentForm, setShowPaymentForm] = useState(false);
	const [currentOrder, setCurrentOrder] = useState({});


	const sortingId = (key) => parseInt(key.split('_')[1], 10);
	const usedPartsItems = cartEntries
		.filter(([partKey, partVal]) => partVal.table === "usedParts");
	const otherItems = cartEntries
		.filter(([partKey, partVal]) => partVal.table !== "usedParts");

	const orderedItems = otherItems.sort(([keyA, partValA], [keyB, partValB]) => {
		if (partValA.table === partValB.table) {
			return sortingId(keyA) - sortingId(keyB);
		} else {
			return partValA.table.localeCompare(partValB.table);
		}
	});

	const sortedItems = [...usedPartsItems, ...orderedItems];
	const allCurrentItems = sortedItems.map(item => item[1]);

	//console.log(sortedItems.map(item => item[1].Price || item[1].totalPrice));

	const totalPrice = sortedItems.map(item => item[1])
		.filter(i => i && i.Price || i.totalPrice) // Filter out non-component entries
		.reduce((acc, i) => acc + (parseFloat(i.Price || i.totalPrice) || 0) * parseInt(i.quantity || 1), 0)
	.toFixed(2);


	const handleAddToCart = (item) => {
		const newItem = {
			...item,
			table: "part",
			quantity: 1 // Set default quantity to 1
		};
		dispatch(addToShoppingCart(newItem));
	};

	const handleRemoveFromCart = (itemId) => {
		dispatch(removeFromShoppingCart(itemId));
	};

	const handleRemoveOneFromCart = (itemId) => {
		dispatch(removeOneFromShoppingCart(itemId));
	};

	const handleClearCart = () => {
		dispatch(clearShoppingCart());
	};
	
	const toggleChoosePart = (newChoice) => {
		if (chosenPart === newChoice) {
			setChosenPart("");
		} else {
			setChosenPart(newChoice);
		}
	};

	const handleSubmit = async () => {
		formFields.TotalPrice = totalPrice;
		formFields.Items = allCurrentItems;
		console.log(typeof formFields.Items);
		try {
			const paymentData = await postDynamicData(formFields, "orders/add");
			if (paymentData && paymentData.clientSecret) {
				setClientSecret(paymentData.clientSecret);
				setCurrentOrder(paymentData.id);
				setShowPaymentForm(true);
			} else {
				throw new Error("Could not initiate payment. No client secret received!");
			}
		} catch (error) {
			displayError(error);
			console.error(error);
		}
	};

	const handlePaymentSuccess = async (transactionId) => {
		const verifyPayment = await updateDynamicData({ TransactionID: transactionId }, `orders/update/${currentOrder}/verify`, null, null);
		if (verifyPayment) {
			displayError("Payment Succeeded!", "success");
			handleClearCart();
			setShowPaymentForm(false);
			return <Navigate to="/profile" />;
			
		} else {
			displayError("Payment failed!")
		}
	};
	
	const formatString = str => str.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, c => c.toUpperCase());

	const renderNestedObject = (nestedObj) => {
		return (
			<ListGroup>
				{Object.entries(nestedObj).map(([key, value], idx) => (
					<ListGroup.Item key={idx}>
						<span>
							<b>{key}</b>:{" "}
						</span>
					{typeof value === "object" && value !== null ? (
						renderNestedObject(value)
					) : (
						value
					)}
					</ListGroup.Item>
				))}
			</ListGroup>
		);
	};

	const renderShoppingCartItems = () => {
		if (sortedItems) {
			return (
				<ListGroup className="parts-details">
					{sortedItems.map(([partKey, partVal]) => (
						<ListGroup key={partKey} className="mb-4">
							<ListGroup.Item onClick={() => toggleChoosePart(partVal.Name)}>{formatString(partKey)}: <b>{partVal.Name}</b> | <b>{parseFloat(partVal.Price || partVal.totalPrice).toFixed(2)}</b>€ | <b># {partVal.quantity || 1}</b></ListGroup.Item>
								{Object.keys(partVal).map((key, idx) => chosenPart === partVal.Name && (
								<ListGroup.Item onClick={() => toggleChoosePart(partVal.Name)} key={idx}>
									<span>
										<b>{formatString(key)}</b>:{" "}
									</span>
						
									{key === "Image" ? (
										<Image
											src={process.env.PUBLIC_URL + "/product_images/" + partVal[key]}
											alt={partVal.Name}
											className="part-image mb-3"
											style={{ width: "100px", height: "auto" }}
										/>
									) : key === "Url" || key === "Image_Url" ? (
										<a href={partVal[key]} target="_blank" rel="noopener noreferrer">
											{partVal[key]}
										</a>
									//) : partVal.table === "completedBuild" ? (
									) : typeof partVal[key] === "object" && partVal[key] !== null ? (
										renderNestedObject(partVal[key])
									) : (
										partVal[key]
									)}
								</ListGroup.Item>
							))}
							{partKey !== "completedBuild" && (
								<Button className="user-select-button" onClick={() => handleRemoveOneFromCart(partKey)}>
									Remove 1 "{formatString(partKey)}" from cart
								</Button>
							)}
							<Button className="user-select-button" onClick={() => handleRemoveFromCart(partKey)}>
								Remove all "{formatString(partKey)}" from cart
							</Button>
						</ListGroup>
					))}
                    <ListGroup.Item>
                        {(totalPrice && totalPrice > 0) ? (
                            <p>
                                Total price: <b>{totalPrice} + VAT (25.5%)</b> €
                            </p>
                        ) : (
                            <p>No price could be calculated!</p>
                        )}
                    </ListGroup.Item>
				</ListGroup>
			);
		} else {
			return <p>Something went wrong!</p>;
		}
	};


	return (
		<div>
			<Button className="user-select-button" onClick={() => handleClearCart()}>
				Clear Cart
			</Button>
			{allCurrentItems && (
				<Button className="user-select-button" onClick={() => handleSubmit()}>
					Proceed with order
				</Button>
			)}
			{showPaymentForm && clientSecret && (
				<PaymentForm
					clientSecret={clientSecret}
					onPaymentSuccess={handlePaymentSuccess}
				/>
			)}
			<br />
			<br />
			<br />
			{renderShoppingCartItems()}
			
		</div>
	);
};

export default ShoppingCart;
