// File name: Signin.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for signing in page
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Button, Form, Spinner } from "react-bootstrap";

// Function for signin in, take onSubmit and setting the current user as props
export const Signin = ({ handleUserChange, currentUser, handleSignin, checkIfSignedIn }) => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [userType, setUserType] = useState("user");
	const [formFields, setFormFields] = useState({});

	const handleInputChange = (event) => {
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));
	};

	const toggleUserType = (userType) => {
		setUserType(userType)
	}

	const renderUserTypeToggle = (event) => {
		let userTypeButton;
		if (userType === "user") {
			userTypeButton = ( 
				<>
				<Button onClick = {() => toggleUserType("meduser")}> User mode: { userType } </Button> 
				</>
			)
		} else if (userType === "meduser") {
			userTypeButton = ( 
				<>
				<Button onClick = {() => toggleUserType("user")}> User mode: { userType } </Button> 
				</>
			)
		} else {
			userTypeButton = ( 
				<>
				<Button onClick = {() => toggleUserType("user")}> User mode: No userType </Button> 
				</>
			)
		}
		return (
			<>
			{userTypeButton}
			</>
		)
	}

	// Function for when the user submits the sign in form
	const handleSubmit = async (event) => {
		// Need this to prevent regular js from ruining the form submission
		event.preventDefault();
		setIsLoading(true);
		try {
			const success = await handleSignin(event, formFields, handleUserChange, userType);
			if (success) {
				navigate("/")
			}
		} catch (error) {
			console.error(error.message);
		} finally {
			setIsLoading(false);
		}
	};
	return (
		<Container
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "90vh",
			}}
		>
			<div
				style={{
					width: "100%",
					maxWidth: "400px",
					padding: "20px",
					borderRadius: "8px",
					boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
				}}
			>
			{renderUserTypeToggle()}
				<Form style={{ textAlign: "left" }} onSubmit={handleSubmit}>
					<h1>Sign in</h1>
					<Form.Group className="mb-3" controlId="formBasicEmail" >
						<Form.Label>Email address</Form.Label>
						<Form.Control
							type="email"
							placeholder="Enter email"
							required
							name="email"
							onChange={handleInputChange}
						/>
					</Form.Group>

					<Form.Group className="mb-3" controlId="formBasicPassword">
						<Form.Label>Password</Form.Label>
						<Form.Control
							type="password"
							placeholder="Enter password"
							required
							name="password"
							onChange={handleInputChange}
						/>
					</Form.Group>

					<Button type="submit" style={{ width: "100%" }} disabled={isLoading}>
						{isLoading ? (
							<>
								<Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
								<span className="visually-hidden">Loading...</span>
							</>
						) : (
							'Sign in'
						)}
					</Button>
				</Form>
				<Button style={{ width: "100%" }} as={Link} to="/signup">Sign up</Button>
			</div>
		</Container>
	);
};

export default Signin;

