import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Container, Button, Image, CloseButton, ListGroup } from "react-bootstrap";
import {
	addToShoppingCart,
	removeFromShoppingCart,
	removeOneFromShoppingCart,
	clearShoppingCart
} from "../redux/shoppingCartSlice";

const ShoppingCart = () => {
	const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
	const dispatch = useDispatch();
	const cartItems = Object.values(shoppingCart);

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

	const renderShoppingCartItems = () => {
		if (shoppingCart) {
			return (
				<ListGroup className="parts-details">
					{Object.entries(shoppingCart).map(([partKey, partVal]) => (
						<ListGroup key={partKey} className="mb-4">
							{Object.keys(partVal).map((key, idx) => (
								<ListGroup.Item key={idx}>
									<span>
										<b>{key}</b>:{" "}
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
									) : (
										partVal[key]
									)}
								</ListGroup.Item>
							))}
							<Button className="user-select-button" onClick={() => handleRemoveOneFromCart(partKey)}>
								Remove 1 from cart {partKey}
							</Button>
						</ListGroup>
					))}
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
			<br />
			<br />
			<br />
			{renderShoppingCartItems()}
		</div>
	);
};

export default ShoppingCart;
