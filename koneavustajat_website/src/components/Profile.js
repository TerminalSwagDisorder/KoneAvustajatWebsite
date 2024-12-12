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
import { useAuth } from "../utils/Contexts";


const Profile = ({ handleCredentialChange, handleSignout, fetchDynamicData, updateDynamicData, postDynamicData }) => {
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
		if (currentUser && currentUser.RoleID === 2) fetchAddressData();
	}, []);	

	useEffect(() => {
		updateFormFieldsByType();
	}, [currentAddress, currentAddressType]);

	useEffect(() => {
		setFormFields({...defaultFormFields});
		if (currentOperation === "address") {
			fetchAddressData();
		}
	}, [currentOperation]);

	const fetchAddressData = async () => {
		try {
			const adressTypeData = await fetchDynamicData(null, "addresstypes", null);
			const data = await fetchDynamicData(null, "profile/addresses", null);
			if (adressTypeData) setAddressTypes(adressTypeData);
			if (data) setCurrentAddress(data);
			if (data) setCurrentAddressType(data[0].AddressTypeID || 1);
		} catch (error) {
			console.error("Error while fetching addresses:", error);
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
		return(
			<>
				{renderUserForm()}
				{renderAddressForm()}
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
				alert("No credentials entered!");
				return;
			}

			// Check for changes in name and email
			if (formFields.Name === currentUser.Name || formFields.Email === currentUser.Email) {
				alert("You cannot use the same credentials!");
				return;
			}

			if (!formFields.currentPassword) {
				alert("You must enter your current password!");
			}

			try {
				const success = await handleCredentialChange(event, dataToSubmit);
				if (success) {
					await refreshProfileData();
					closeForm();
				}
			} catch (error) {
				console.error("Error updating credentials:", error);
				alert("Error updating credentials.");
			}
		} else if (currentOperation === "address") {
			const allowedFields = ["AddressTypeID", "Street", "City", "State", "PostalCode", "Country", "currentPassword"];
			const dataToSubmit = Object.fromEntries(
				Object.entries(formFields).filter(([key, value]) => value && allowedFields.includes(key))
			);			const fieldsToChange = Object.entries(formFields).filter(([key, value]) => value && key !== "currentPassword");
			const currentAddressLength = currentAddress.find(
				(item) => item.AddressTypeID === currentAddressType
			);

			// Check if any field is filled
			if (fieldsToChange.length === 0) {
				alert("No credentials entered!");
				return;
			}

			if (!formFields.currentPassword) {
				alert("You must enter your current password!");
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
				console.error("Error updating credentials:", error);
				alert("Error updating credentials.");
			}
		}
	};

	const formButtons = () => {
		let editButton;
		let customerButtons;

		if (currentUser) {
			editButton = <Button onClick={() => handleModifyProfile("edit")}>Edit your profile</Button>
		}

		if (currentUser && currentUser.RoleID === 2) {
			customerButtons = (
				<>
					<br />
					<Button onClick={() => handleModifyProfile("address")}>Change address details</Button>
					<br />
					<Button onClick={() => handleModifyProfile("payment")}>Change payment details</Button>
				</>
			);
		}
		return (
			<Col md={4} className="text-center">
				<div>
					{editButton}
					{customerButtons}
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
