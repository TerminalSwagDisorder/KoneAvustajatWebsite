// File Name: Signup.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for signing up page
import React, { useState, useEffect } from "react";
import { Container, Button, Form, Spinner, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useNavigate } from "react-router-dom";


// Function for rendering sign up page, takes onSubmit as a prop
export const Signup = ({ handleSignup }) => {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [formFields, setFormFields] = useState(
		{
		Name: "",
		Email: "",
		Password: "",
		});
	const [inputValue, setInputValue] = useState("");
	const [EmailValid, setEmailValid] = useState(false);
	const [PasswordValid, setPasswordValid] = useState(false);

	const PasswordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/;
	const EmailRegex = /^[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?$/;

	const handleInputChange = (event) => {
		setInputValue(event.target.value);
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));

		if (event.target.name === "Email") {
			setEmailValid(EmailRegex.test(event.target.value));
		}

		if (event.target.name === "Password") {
			setPasswordValid(PasswordRegex.test(event.target.value));
		}
	};
		  
  // Function for when the user submits the sign up form
	const handleSubmit = async (event) => {
		const newName = event.target.name.value;
		const newEmail = event.target.Email.value;
		const newPassword = event.target.Password.value;
		if (!newName && !newEmail && !newPassword) {
			alert("All required fields must be filled!");
			return;
		}

		// Need this to prevent regular js from ruining the form submission
		event.preventDefault();
		setIsLoading(true);
		try {
			const success = await handleSignup(event, formFields);
			if (success) {
				navigate("/signin");
				setFormFields({});
				setEmailValid(false);
				setPasswordValid(false);
			}


			} catch (error) {
				console.log(error.message);
			} finally {
				setIsLoading(false);
			}
		};

	const renderTooltip = (props) => (
		<Tooltip id="button-tooltip" {...props}>
			Password must be at least 9 characters long, include 1 capital letter, and 1 number.
		</Tooltip>
	);
	
	const renderSignupForm = () => {
		return (
			<div>
				<Container
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						minHeight: "90vh"
					}}>
					<div
						style={{
							width: "100%",
							maxWidth: "400px",
							padding: "20px",
							borderRadius: "8px",
							boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
						}}>
						<Form style={{ textAlign: "left" }} onSubmit={handleSubmit}>
							<h1>Sign up</h1>

							<Form.Group className="mb-3">
								<Form.Label>Name</Form.Label>
								<Form.Control
									type="text"
									placeholder="Enter Name"
									required
									name="Name"
									value={formFields.Name}
									onChange={handleInputChange}
								/>
							</Form.Group>

							<Form.Group className="mb-3" controlId="formBasicEmail">
								<Form.Label>Email address</Form.Label>
								<Form.Control
									type="Email"
									placeholder="Enter Email"
									required
									name="Email"
									value={formFields.Email}
									onChange={handleInputChange}
									className={EmailValid ? "valid-input" : "invalid-input"}
								/>
							</Form.Group>

							<Form.Group className="mb-3" controlId="formBasicPassword">
								<Form.Label>Password</Form.Label>
								<OverlayTrigger placement="right" delay={{ hide: 400 }} overlay={renderTooltip}>
									<Form.Control
										type="Password"
										placeholder="Enter Password"
										required
										name="Password"
										value={formFields.Password}
										onChange={handleInputChange}
										className={PasswordValid ? "valid-input" : "invalid-input"}
									/>
								</OverlayTrigger>
							</Form.Group>

							<Button type="submit" style={{ width: "100%" }} disabled={isLoading}>
								{isLoading ? (
									<>
										<Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
										<span className="visually-hidden">Loading...</span>
									</>
								) : (
									"Sign up"
								)}
							</Button>
						</Form>
					</div>
				</Container>
			</div>
		);
	};
	
  return (
	  <>
	  {renderSignupForm()}
	  </>
  );
};

export default Signup;

