import React, { useState, useEffect, useCallback, useRef } from "react";
import { Container, Button, Form, Spinner, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useError } from "../utils/Contexts";

const PasswordReset = ({ postDynamicData }) => {
	const { displayError } = useError();
	const navigate = useNavigate();
	const location = useLocation();
	const params = new URLSearchParams(location.search);
	const passwordResetToken = params.get("passwordResetToken");
	
	const [formFields, setFormFields] = useState({
		passwordResetToken,
		Password: "",
	});
	const [PasswordValid, setPasswordValid] = useState(false);

	const PasswordRegex = /^(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_\-+=\[\]{}:;"'<>,.?\/]{9,}$/;
	
	const handlePasswordReset = async (event) => {
		event.preventDefault();
		if (!formFields.Password.trim() || !passwordResetToken) {
			throw new Error("All required fields must be filled!");
		}
		console.log(formFields);
		try {
			const success = await postDynamicData(formFields, "users/resetpassword");
			if (!success) {
				throw new Error("Failed to reset password");
			}
			displayError("Successfully tried to reset password!", "success");
			navigate("/signin");
		} catch (error) {
			displayError(error);
		}
	};
	
	const handleInputChange = (event) => {
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

	const renderPasswordReset = () => {
		if (!passwordResetToken) {
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
					<Form style={{ textAlign: "left" }} onSubmit={handlePasswordReset}>
						<h1>Reset password</h1>

						<Form.Group className="mb-3" controlId="formBasicPassword">
							<Form.Label>Password</Form.Label>
							<OverlayTrigger placement="right" delay={{ hide: 400 }} overlay={renderTooltip}>
								<Form.Control
									type="Password"
									placeholder="Enter new Password"
									required
									name="Password"
									value={formFields.Password}
									onChange={handleInputChange}
									className={PasswordValid ? "valid-input" : "invalid-input"}
								/>
							</OverlayTrigger>
						</Form.Group>

						<Button type="submit" style={{ width: "100%" }}>
							Change password
						</Button>
					</Form>
				</div>
			</Container>
		</div>
		);
	};

	return (
		<>
			{renderPasswordReset()}
		</>
	);
};

export default PasswordReset;
