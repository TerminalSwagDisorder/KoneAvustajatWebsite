// File name: Signin.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for signing in page
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Button, Form, Spinner } from "react-bootstrap";
import { useAuth, useError } from "../utils/Contexts";
import { useRenderContent } from "../utils/ContentUtils";


// Function for signin in, take onSubmit and setting the current user as props
export const Signin = ({ handleSignin }) => {
	const renderContent = useRenderContent();
    const { displayError } = useError();
	const { handleUserChange, currentUser } = useAuth();
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
				displayError("Successfully signed in!", "success");
				navigate("/");
			}
		} catch (error) {
			displayError(error);
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
					<h1>{renderContent("signin.title", "Sign in")}</h1>
					<Form.Group className="mb-3" controlId="formBasicEmail" >
						<Form.Label>{renderContent("signin.label.email", "Email address")}</Form.Label>
						<Form.Control
							type="Email"
							placeholder={renderContent("signin.placeholder.email", "Enter Email")}
							required
							name="Email"
							onChange={handleInputChange}
						/>
					</Form.Group>

					<Form.Group className="mb-3" controlId="formBasicPassword">
						<Form.Label>{renderContent("signin.label.password", "Password")}</Form.Label>
						<Form.Control
							type="Password"
							placeholder={renderContent("signin.placeholder.password", "Enter Password")}
							required
							name="Password"
							onChange={handleInputChange}
						/>
					</Form.Group>

					<Button type={isLoading ? "" : "submit"} style={{ width: "100%" }} disabled={isLoading}>
						{isLoading ? (
							<>
								<Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
								<span className="visually-hidden">Loading...</span>
							</>
						) : (
							renderContent("signin.button.submit", "Sign in")
						)}
					</Button>
				</Form>
				<Button style={{ width: "100%" }} as={Link} to="/signup">{renderContent("signin.button.signup", "Sign up")}</Button>
				<Button as={Link} to="/forgot-password" style={{ width: "100%" }}>
					{renderContent("signin.button.forgot_password", "Forgot password?")}
				</Button>
			</div>
		</Container>
	);
};

export default Signin;

