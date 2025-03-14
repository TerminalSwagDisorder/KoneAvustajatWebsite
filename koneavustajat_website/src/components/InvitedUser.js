import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useError } from "../utils/Contexts";
import { Container, Button, Form, Spinner, OverlayTrigger, Tooltip } from "react-bootstrap";

const InvitedUser = ({ activateAccount }) => {
	const { displayError } = useError();
	const location = useLocation();
	const params = new URLSearchParams(location.search);
	const inviteToken = params.get("inviteToken");


	const PasswordRegex = /^(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_\-+=\[\]{}:;"'<>,.?\/]{9,}$/;
	
	const [formFields, setFormFields] = useState(
		{
		Password: "",
		});
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [PasswordValid, setPasswordValid] = useState(false);
	const [invitationStatus, setInvitationStatus] = useState(false);
	const submissionAttemptedRef = useRef(false);
	
	const handleActivation = useCallback(async (event) => {
		if (!inviteToken || submissionAttemptedRef.current) return;
		submissionAttemptedRef.current = true;
		setIsLoading(true);
		
		try {
			if (!event.target.Password.value) {
				displayError("All required fields must be filled!");
				return;
			}
			event.preventDefault();
			const activateInvite = await activateAccount({ inviteToken }, true, formFields);
			if (!activateInvite) {
				throw new Error("Failed to proceed with the invitation!");
			}
			setInvitationStatus(true);
			displayError("Successfully finalized invitation!", "success");
		} catch (error) {
			displayError(error);
		} finally {
			setIsLoading(false);
		}
	}, [inviteToken, activateAccount, displayError]);

	const handleInputChange = (event) => {
		setInputValue(event.target.value);
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));

		if (event.target.name === "Password") {
			setPasswordValid(PasswordRegex.test(event.target.value));
		}
	};

	const renderTooltip = (props) => (
		<Tooltip id="button-tooltip" {...props}>
			Password must be at least 9 characters long, include 1 capital letter, and 1 number.
		</Tooltip>
	);

	const renderInvitationStatus = () => {
		if (!inviteToken || submissionAttemptedRef.current) {
			displayError("Invalid or used invitation token!");
			return <Navigate to="/profile" />;
		}
		if (invitationStatus) {
			return <Navigate to="/profile" />;
		}
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
						<Form style={{ textAlign: "left" }} onSubmit={handleActivation}>
							<h1>Complete your invitation!</h1>
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

							<Button type={isLoading ? "" : "submit"} style={{ width: "100%" }} disabled={isLoading}>
								{isLoading ? (
									<>
										<Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
										<span className="visually-hidden">Loading...</span>
									</>
								) : (
									"Finalize invitation"
								)}
							</Button>
						</Form>
						<Button as={Link} to="/signin" style={{ width: "100%" }}>
							Sign in
						</Button>
					</div>
				</Container>
			</div>
		);
	};

	return (
		<>
			{renderInvitationStatus()}
		</>
	);
};

export default InvitedUser;
