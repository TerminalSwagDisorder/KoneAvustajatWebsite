// File Name: Signup.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for signing up page
import React, { useState, useEffect } from "react";
import { Container, Button, Form, Spinner, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useError } from "../utils/Contexts";
import { useRenderContent } from "../utils/ContentUtils";


// Function for rendering sign up page, takes onSubmit as a prop
const PasswordForgot = ({ postDynamicData }) => {
	const renderContent = useRenderContent();
    const { displayError } = useError();
	const navigate = useNavigate();
	const [formFields, setFormFields] = useState({
		Email: ""
	});
	const [inputValue, setInputValue] = useState("");
	const [EmailValid, setEmailValid] = useState(false);

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
	};
		  
  // Function for when the user submits the sign up form
	const handleSubmit = async (event) => {
		event.preventDefault();

		const newEmail = event.target.Email.value;
		if (!newEmail) {
			displayError("All required fields must be filled!");
			return;
		}
		try {
			const success = await postDynamicData(formFields, "users/forgotpassword");
			if (success) {
				navigate("/");
				setEmailValid(false);
				displayError("Successfully sent password request!", "success");
			}
		} catch (error) {
			displayError(error);
			console.log(error.message);
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
							<h1>{renderContent("passwordforgot.title", "Forgot password")}</h1>

							<Form.Group className="mb-3" controlId="formBasicEmail">
								<Form.Label>{renderContent("passwordforgot.label.email", "Email address")}</Form.Label>
								<Form.Control
									type="Email"
									placeholder={renderContent("passwordforgot.placeholder.email", "Enter Recovery Email")}
									required
									name="Email"
									value={formFields.Email}
									onChange={handleInputChange}
									className={EmailValid ? "valid-input" : "invalid-input"}
								/>
							</Form.Group>
							<Button type="submit" style={{ width: "100%" }}>
								{renderContent("passwordforgot.button.request_reset", "Request reset")}
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

export default PasswordForgot;

