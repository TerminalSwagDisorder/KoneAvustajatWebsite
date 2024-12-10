// File name: Profile.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for profile page
import React, { useState } from "react";
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


const Profile = ({ handleCredentialChange, handleSignout }) => {
	const { currentUser, handleUserChange, refreshProfileData } = useAuth();
	const navigate = useNavigate();
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	const [emailValid, setEmailValid] = useState(false);
	const [passwordValid, setPasswordValid] = useState(false);

	const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/;
	const emailRegex =
		/^[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?$/;

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
	};

	const closeForm = () => {
		setCurrentOperation("");
		setFormFields({});
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
							<Form.Control type="file" name="ProfileImage" accept="image/png, image/jpeg, image/gif" onChange={handleInputChange} />
						</Form.Group>
						<Form.Group className="mb-3">
								<Form.Control
									type="text"
									placeholder="Enter new name"
									name="Name"
									onChange={handleInputChange}
								/>
							</Form.Group>
							<Form.Group className="mb-3">
								<Form.Select name="Gender" onChange={handleInputChange}>
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
									required
								/>
							</Form.Group>
						<Button variant="primary" type="submit">
							Change credentials
						</Button>
					</Form>
				</div>
			);
		} else {
			return (
				<div style={{ textAlign: "center" }} className="userCredentialChange">
					<div>
						<Button onClick={() => handleModifyProfile("edit")}>Edit your profile</Button>
					</div>
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

	// Function for when the user submits the sign in form
	const handleSubmit = async (event) => {
		event.preventDefault();

		const fieldsToChange = Object.entries(formFields).filter(([key, value]) => value && key !== "currentPassword");
		console.log(fieldsToChange);
		console.log(fieldsToChange.length);

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
			const success = await handleCredentialChange(event, formFields);
			if (success) {
				await refreshProfileData();
				closeForm();
			}
		} catch (error) {
			console.error("Error updating credentials:", error);
			alert("Error updating credentials.");
		}
	};

	return (
		<Container>
			<Row className="justify-content-center modal-body">
				<Col lg={8}>
					<h6 className="persInfo">Personal information</h6>
					<Row className="align-items-center border border-1">
					{renderUserData()}
					{/* User Form */}
					{renderUserForm()}
					</Row>
				</Col>
			</Row>
		</Container>
	);
};

export default Profile;
