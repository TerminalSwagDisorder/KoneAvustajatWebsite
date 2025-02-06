// File name: Profile.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for profile page
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCameraRetro } from "react-icons/fa";
import { AiTwotoneDelete } from "react-icons/ai";
import {
	Container,
	Card,
	Form,
	Button,
	Row,
	Col,
	Tab,
	Nav,
	Image,
	CloseButton,
	ListGroup,
	OverlayTrigger,
	Tooltip
} from "react-bootstrap";
import PaymentForm from "./PaymentForm.js";
import { usePayment, useError, useAuth } from "../utils/Contexts";


const Profile = ({ handleCredentialChange, handleSignout, fetchDynamicData, updateDynamicData, postDynamicData }) => {
	const { displayError } = useError();
    const { clientSecret, setClientSecret } = usePayment();
	const { currentUser, handleUserChange, refreshProfileData } = useAuth();
	const navigate = useNavigate();
	const defaultFormFields = {
		AddressTypeID: "",
		Street: "",
		City: "",
		State: "",
		PostalCode: "",
		Country: "",
		ProfileImage: "",
		Name: "", 
		Gender: "", 
		Email: "", 
		Password: "", 
		currentPassword: "" 
	};
	const [currentOperation, setCurrentOperation] = useState("");
	const [emailValid, setEmailValid] = useState(false);
	const [passwordValid, setPasswordValid] = useState(false);
	const [addressTypes, setAddressTypes] = useState(null);
	const [currentAddressType, setCurrentAddressType] = useState(1);
	const [formFields, setFormFields] = useState({...defaultFormFields});
	const [currentAddress, setCurrentAddress] = useState([{
		AddressTypeID: "",
		Street: "",
		City: "",
		State: "",
		PostalCode: "",
		Country: ""
	}]);
	const [orders, setOrders] = useState([]);
	const [currentOrder, setCurrentOrder] = useState({});
	const [showPaymentForm, setShowPaymentForm] = useState(false);
	
	
	
	/*const [currentAddress, setCurrentAddress] = useState({
		AddressTypeID: "",
		Street: "",
		City: "",
		State: "",
		PostalCode: "",
		Country: ""
	});*/

	const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/;
	const emailRegex =
		/^[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?$/;
	
	useEffect(() => {
		if (currentUser && currentUser.RoleID === 2) {
			fetchAddressData();
			fetchOrders();
		}
	}, []);	

	useEffect(() => {
		updateFormFieldsByType();
	}, [currentAddress, currentAddressType]);

	useEffect(() => {
		console.log(currentOperation);
	}, [currentOperation]);

	useEffect(() => {
		setFormFields({...defaultFormFields});
		if (currentOperation === "address") {
			fetchAddressData();
		}
		if (currentOperation === "orders") {
			fetchOrders();
		}
	}, [currentOperation]);

	const fetchAddressData = async () => {
		try {
			const adressTypeData = await fetchDynamicData(null, "addresstypes", null);
			const data = await fetchDynamicData(null, "profile/addresses", null);
			if (adressTypeData) setAddressTypes(adressTypeData);
			if (data) {
				setCurrentAddress(data);
				setCurrentAddressType(data[0].AddressTypeID || 1);
			}
		} catch (error) {
			displayError(`Error while fetching addresses: ${error}`);
			console.error("Error while fetching addresses:", error);
		}
	};
	
	const fetchOrders = async () => {
		try {
			const orderData = await fetchDynamicData(null, "profile/orders", null);
			if (orderData) {
				setOrders(orderData);
				const currentOrderData = await fetchDynamicData(null, `orders/${orderData[0].OrderID}`, null);
				if (currentOrderData) setCurrentOrder(currentOrderData);
			} 
		} catch (error) {
			displayError(`Error while fetching orders: ${error}`);
			console.error("Error while fetching orders:", error);
		}
	};
	
	const fetchCurrentOrder = async (event) => {
		if (event.target.name !== "OrderID") {
			return;
		}

		const orderID = event.target.value;
		try {
			const currentOrderData = await fetchDynamicData(null, `orders/${orderID}`, null);
			if (currentOrderData) setCurrentOrder(currentOrderData);
		} catch (error) {
			displayError(`Error while fetching orders: ${error}`);
			console.error("Error while fetching orders:", error);

		}
	};

	const handleInputChange = (event) => {
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.type === "file" ? event.target.files[0] : event.target.value
		}));

		if (event.target.name === "Email") {
			setEmailValid(emailRegex.test(event.target.value));
		}

		if (event.target.name === "Password") {
			setPasswordValid(passwordRegex.test(event.target.value));
		}
		
		if (event.target.name === "AddressTypeID") {
			setCurrentAddressType(parseInt(event.target.value));
		}
	};
	
	const updateFormFieldsByType = () => {
		const currentAddressByType = currentAddress.find(
			(item) => item.AddressTypeID === currentAddressType
		);
		if (currentAddressByType && Object.values(currentAddressByType).length > 0) {
			setFormFields({  ...defaultFormFields, ...currentAddressByType, AddressTypeID: currentAddressType });
		} else {
			setFormFields({ ...defaultFormFields, AddressTypeID: currentAddressType });

		}
	};
	
	const closeForm = () => {
		setCurrentOperation("");
		setFormFields({...defaultFormFields});
		setEmailValid(false);
		setPasswordValid(false);
	};

	const handleModifyProfile = (user) => {
		setCurrentOperation(user);
	};

	const renderTooltip = (props) => (
		<Tooltip id="button-tooltip" {...props}>
			Password must be at least 9 characters long, include 1 capital letter, and 1 number.
		</Tooltip>
	);

	const renderUserForm = () => {
		if (currentUser && currentOperation === "edit") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque" style={{ wIDth: "400px" }}>
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Edit profile</h4>
						<Form.Group className="mb-3">
							<Form.Label htmlFor="ProfileImage"><FaCameraRetro /> Change profile picture</Form.Label>
							<Form.Control type="file" name="ProfileImage" value={formFields.ProfileImage} accept="image/png, image/jpeg, image/gif" onChange={handleInputChange} />
						</Form.Group>
						<Form.Group className="mb-3">
								<Form.Control
									type="text"
									placeholder="Enter new name"
									name="Name"
									value={formFields.Name}
									onChange={handleInputChange}
								/>
							</Form.Group>
							<Form.Group className="mb-3">
								<Form.Select name="Gender" value={formFields.Gender} onChange={handleInputChange}>
									<option value="">Select new gender</option>
									<option value="male">
										Male
									</option>
									<option value="female">
										Female
									</option>
								</Form.Select>
							</Form.Group>
							<Form.Group className="mb-3">
								<Form.Control
									type="email"
									placeholder="Enter new email"
									name="Email"
									onChange={handleInputChange}
									value={formFields.Email}
									className={emailValid ? "valid-input" : "invalid-input"}
								/>
							</Form.Group>
							<Form.Group className="mb-3">
								<OverlayTrigger placement="right" delay={{ hide: 400 }} overlay={renderTooltip}>
									<Form.Control
										type="password"
										placeholder="Enter new password"
										name="Password"
										onChange={handleInputChange}
										value={formFields.Password}
										className={passwordValid ? "valid-input" : "invalid-input"}
									/>
								</OverlayTrigger>
							</Form.Group>
							<Form.Group className="mb-3">
								<Form.Control
									type="password"
									placeholder="Enter current password"
									name="currentPassword"
									onChange={handleInputChange}
									value={formFields.currentPassword}
									required
								/>
							</Form.Group>
						<Button variant="primary" type="submit">
							Change credentials
						</Button>
					</Form>
				</div>
			);
		}
	};

	const renderAddressForm = () => {
		if (currentUser && formFields && currentOperation === "address") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque" style={{ width: "400px" }}>
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Change address</h4>
						<Form.Group className="mb-3">
							<Form.Select name="AddressTypeID" value={formFields.AddressTypeID || currentAddressType} onChange={handleInputChange}>
								{addressTypes && Object.keys(addressTypes).length > 0 ? (
									Object.keys(addressTypes).map((key) => (
										<option key={addressTypes[key].AddressTypeID} value={addressTypes[key].AddressTypeID}>
											{addressTypes[key].AddressTypeName}
										</option>
									))
								) : (
									<option value="">No address types available</option>
								)}
							</Form.Select>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Control
								type="text"
								placeholder="Enter new street"
								name="Street"
								onChange={handleInputChange}
								value={formFields.Street}
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Control
								type="text"
								placeholder="Enter new city"
								name="City"
								onChange={handleInputChange}
								value={formFields.City}
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Control
								type="text"
								placeholder="Enter new state"
								name="State"
								onChange={handleInputChange}
								value={formFields.State}
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Control
								type="text"
								placeholder="Enter new postal code"
								name="PostalCode"
								onChange={handleInputChange}
								value={formFields.PostalCode}
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Control
								type="text"
								placeholder="Enter new country"
								name="Country"
								onChange={handleInputChange}
								value={formFields.Country}
							/>
						</Form.Group>
						<Form.Group className="mb-3">
							<Form.Control
								type="password"
								placeholder="Enter current password"
								name="currentPassword"
								onChange={handleInputChange}
								value={formFields.currentPassword}
								required
							/>
						</Form.Group>
						<Button variant="primary" type="submit">
							Change address
						</Button>
					</Form>
				</div>
			);
		}
	};

	const renderCurrentOrder = () => {
		const allowedFields = ["ReceiptID", "OrderDate", "Status", "TotalPrice", "PaymentMethod", "TransactionID", "PaymentStatus", "PaymentDate", "Items"];
		if (currentUser && currentOrder && currentOperation === "orders") {
			return (
				<ListGroup className="profile-details">
					{Object.values(currentOrder).map((value, index) =>
						<ListGroup className="profile-details" key={index}>
						{Object.entries(value).map(
							([key, val]) =>
								allowedFields.includes(key) && (
								key === "Items" ? (
									<ListGroup.Item>
									{Object.values(val).map((obj, idx) => 
										<li>
											{obj.Name} | {obj.Price || obj.TotalPrice}€ | #{obj.quantity} <br />
										</li>
								   )}
									</ListGroup.Item>
								) : (
									<ListGroup.Item>
										<span>{key}</span>: {val ? val : "No value"} <br />
									</ListGroup.Item>
								)
						))}
					</ListGroup>
					)}
				</ListGroup>
			)
		}
	};

	const renderOrdersForm = () => {
		if (currentUser && orders && currentOperation === "orders") {
			return (
				<div>
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque" style={{ width: "400px" }}>
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Change address</h4>
						<Form.Group className="mb-3">
							<Form.Select name="OrderID" value={currentOrder[0] ? currentOrder[0].OrderID : null} onChange={fetchCurrentOrder}>
								{orders && Object.keys(orders).length > 0 ? (
									Object.keys(orders).map((key) => (
										<option key={orders[key].ReceiptID} value={orders[key].OrderID}>
											{orders[key].ReceiptID}
										</option>
									))
								) : (
									<option value="">No orders available</option>
								)}
							</Form.Select>
						</Form.Group>
						{renderCurrentOrder()}
						{currentOrder[0] && currentOrder[0].PaymentStatus !== "paid" && (
							<Button variant="primary" type="submit">
								Pay for order
							</Button>
						)}
					</Form>
				</div>
					{showPaymentForm && clientSecret && (
						<PaymentForm
							clientSecret={clientSecret}
							onPaymentSuccess={handlePaymentSuccess}
						/>
					)}
				</div>
			);
		}
	};

	const renderUserData = () => {
		if (currentUser) {
			return (
				<ListGroup className="profile-details">
					{Object.keys(currentUser).map(
						(key, index) =>
							key !== "UserID" &&
							key !== "Password" &&
							key !== "RoleID" && (
								<ListGroup className="profile-details" key={index}>
									<ListGroup.Item>
										<span>{key}</span>:{" "}
										{key === "ProfileImage" ? (
											<Image
												src={
													process.env.PUBLIC_URL + "/profile_images/" + (currentUser[key] || "default-profile.png")
												}
												alt={key}
												className="profile-image mb-3"
											/>
										) : typeof currentUser[key] === "boolean" ? (
											<span>{currentUser[key] ? "True" : "False"}</span>
										) : !currentUser[key] ? (
											<span>Empty</span>
										) : (
											currentUser[key]
										)}
									</ListGroup.Item>
								</ListGroup>
							)
					)}
				</ListGroup>
			);
		} else {
			return <p>Something went wrong!</p>;
		}
	};

	const renderForms = () => {
		return (
			<>
				{renderUserForm()}
				{renderAddressForm()}
				{renderOrdersForm()}
			</>
		);
	}

	// Function for when the user submits the sign in form
	const handleSubmit = async (event) => {
		event.preventDefault();
		if (currentOperation === "edit") {
			const allowedFields = ["ProfileImage", "Name", "Gender", "Email", "Password", "currentPassword"];
			const dataToSubmit = Object.fromEntries(
				Object.entries(formFields).filter(([key, value]) => value && allowedFields.includes(key))
			);
			const fieldsToChange = Object.entries(formFields).filter(([key, value]) => value && key !== "currentPassword");

			// Check if any field is filled
			if (fieldsToChange.length === 0) {
				displayError("No credentials entered!");
				return;
			}

			// Check for changes in name and email
			if (formFields.Name === currentUser.Name || formFields.Email === currentUser.Email) {
				displayError("You cannot use the same credentials!");
				return;
			}

			if (!formFields.currentPassword) {
				displayError("You must enter your current password!");
			}

			try {
				const success = await handleCredentialChange(event, dataToSubmit);
				if (success) {
					await refreshProfileData();
					closeForm();
				}
			} catch (error) {
				displayError(`Error updating credentials: ${error}`);
				console.error("Error updating credentials:", error);
			}
		} else if (currentOperation === "address") {
			const allowedFields = ["AddressTypeID", "Street", "City", "State", "PostalCode", "Country", "currentPassword"];
			const dataToSubmit = Object.fromEntries(
				Object.entries(formFields).filter(([key, value]) => value && allowedFields.includes(key))
			);			
			const fieldsToChange = Object.entries(formFields).filter(([key, value]) => value && key !== "currentPassword");
			const currentAddressLength = currentAddress.find(
				(item) => item.AddressTypeID === currentAddressType
			);

			// Check if any field is filled
			if (fieldsToChange.length === 0) {
				displayError("No credentials entered!");
				return;
			}

			if (!formFields.currentPassword) {
				displayError("You must enter your current password!");
			}

			try {
				let success;
				if (currentAddressLength) {
					success = await updateDynamicData(dataToSubmit, "users/customers/addresses/update");
				} else {
					success = await postDynamicData(dataToSubmit, "users/customers/addresses/add");
				}
				if (success) {
					await refreshProfileData();
					closeForm();
				}
			} catch (error) {
				displayError(`Error updating credentials: ${error}`);
				console.error("Error updating credentials:", error);
			}
		} else if (currentOperation === "orders" && currentOrder[0]) {
			try {											//formFields, tableName, partName, id
				const paymentData = await updateDynamicData(currentOrder[0], `orders/update/${currentOrder[0].OrderID}`, null);
				if (paymentData && paymentData.clientSecret) {
					setClientSecret(paymentData.clientSecret);
					setShowPaymentForm(true);
				} else {
					throw new Error("Could not initiate payment. No client secret received!");
				}
			} catch (error) {
				displayError(`Error updating order: ${error}`);
				console.error("Error updating order:", error);
			}
		}
	};

	const handlePaymentSuccess = async (transactionId) => {
		console.log("transactionId:", transactionId);
		const verifyPayment = await updateDynamicData({ TransactionID: transactionId }, `orders/update/${currentOrder[0].OrderID}/verify`, null);
		if (verifyPayment) {
			displayError("Payment Succeeded!");
			await fetchOrders();
			closeForm();
			setShowPaymentForm(false);
		} else {
			displayError("Payment failed");
		}
	};

	const formButtons = () => {
		let editButton;
		let customerButtons;
		let ordersButton;

		if (currentUser) {
			editButton = <Button onClick={() => handleModifyProfile("edit")}>Edit your profile</Button>
		}

		if (currentUser && currentUser.RoleID === 2) {
			customerButtons = (
				<>
					<Button onClick={() => handleModifyProfile("address")}>Change address details</Button>
					{/*<br />
					<Button onClick={() => handleModifyProfile("payment")}>Change payment details</Button>*/}
				</>
			);
			ordersButton = (
				<Button onClick={() => handleModifyProfile("orders")}>View orders</Button>
			)
		}
		return (
			<Col md={4} className="text-center">
				<div>
					{editButton}<br />
					{customerButtons}<br />
					{ordersButton}<br />
				</div>
			</Col>
		);
	};

	return (
		<Container>
			<Row className="justify-content-center modal-body">
				<Col lg={8}>
					<h6 className="persInfo">Personal information</h6>
					<Row className="align-items-center border border-1">
					{formButtons()}
					<Col md={8} className="text-center">
						{renderUserData()}
						{/* User Form */}
						{renderForms()}

					</Col>
					</Row>
				</Col>
			</Row>
		</Container>
	);
};

export default Profile;
