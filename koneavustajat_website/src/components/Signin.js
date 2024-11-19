// File name: Signin.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for signing in page
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Button, Form, Spinner } from "react-bootstrap";

// Function for signin in, take onSubmit and setting the current user as props
export const Signin = ({ handleUserChange, currentUser, handleSignin, checkIfSignedIn }) => {
	const navigate = useNavigate();
	const [Email, setEmail] = useState("");
	const [Password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [formFields, setFormFields] = useState({});

	const handleInputChange = (event) => {
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));
	};

	// Function for when the user submits the sign in form
	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsLoading(true);
		try {
			const success = await handleSignin(event, formFields, handleUserChange);
			if (success) {
				navigate("/");
			}
		} catch (error) {
			console.error(error);
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
				<Form style={{ textAlign: "left" }} onSubmit={handleSubmit}>
					<h1>Sign in</h1>
					<Form.Group className="mb-3" controlId="formBasicEmail" >
						<Form.Label>Email address</Form.Label>
						<Form.Control
							type="Email"
							placeholder="Enter Email"
							required
							name="Email"
							onChange={handleInputChange}
						/>
					</Form.Group>

					<Form.Group className="mb-3" controlId="formBasicPassword">
						<Form.Label>Password</Form.Label>
						<Form.Control
							type="Password"
							placeholder="Enter Password"
							required
							name="Password"
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

