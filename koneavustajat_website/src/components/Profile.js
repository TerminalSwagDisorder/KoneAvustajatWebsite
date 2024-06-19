// File name: Profile.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for profile page
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCameraRetro } from "react-icons/fa";
import { AiTwotoneDelete } from "react-icons/ai";
import { Container, Card, Form, Button, Row, Col, Tab, Nav, Image, CloseButton, ListGroup, OverlayTrigger, Tooltip } from "react-bootstrap";

const Profile = ({ currentUser, setCurrentUser, handleCredentialChange, handleSignout, refreshProfileData }) => {

	const navigate = useNavigate();
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	const [emailValid, setEmailValid] = useState(false);
	const [passwordValid, setPasswordValid] = useState(false);

	const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/;
	const emailRegex = /^[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?$/;

	const handleInputChange = (event) => {
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));

		if (event.target.name === "email") {
			setEmailValid(emailRegex.test(event.target.value));
		}

		if (event.target.name === "password") {
			setPasswordValid(passwordRegex.test(event.target.value));
		}
	};

	console.log(currentUser)
	const closeForm = () => {
		setCurrentOperation("");
		setFormFields({})
		setEmailValid(false)
		setPasswordValid(false)
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
    if (currentOperation === "edit") {
		if (currentUser.role === "user") {
			
      // For modifying existing users
      return (
        <div className="d-flex justify-content-center align-items-center"  >
          <Form onSubmit={handleSubmit}>
            <CloseButton onClick={closeForm} />
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                placeholder="Enter new name"
                name="name"
		  		onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Control
                type="email"
                placeholder="Enter new email"
                name="email"
		  		onChange={handleInputChange}
		  		className={emailValid ? "valid-input" : "invalid-input"}
              />
            </Form.Group>
            <Form.Group className="mb-3">
		  	<OverlayTrigger placement="right" delay={{ hide: 400 }} overlay={renderTooltip}>
              <Form.Control
                type="password"
                placeholder="Enter new password"
                name="password"
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
		
      } else if (currentUser.role !== "user") {
      return (
        <div className="d-flex justify-content-center align-items-center"  >
          <Form onSubmit={handleSubmit}>
            <CloseButton onClick={closeForm} />
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                placeholder="Enter new name"
                name="name"
		  		onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Control
                type="email"
                placeholder="Enter new email"
                name="email"
		  		onChange={handleInputChange}
		  		className={emailValid ? "valid-input" : "invalid-input"}
              />
            </Form.Group>
            <Form.Group className="mb-3">
		  	<OverlayTrigger placement="right" delay={{ hide: 400 }} overlay={renderTooltip}>
              <Form.Control
                type="password"
                placeholder="Enter new password"
                name="password"
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
	  }
      } else {
      	return (
        <div style={{textAlign: "center"}} className="userCredentialChange">
          <div>
            <Button onClick={() => handleModifyProfile("edit")}>
              Edit your profile
            </Button>
          </div>
        </div>
      );
    }
  };

	const renderUserData = () => {
		if (currentUser.role === "user") {
			return (
				<ListGroup className="profile-details">
				  <ListGroup.Item>Name: <span>{currentUser.name}</span></ListGroup.Item>
				  <ListGroup.Item>Email: <span>{currentUser.email}</span></ListGroup.Item>
				</ListGroup>
			);
		} else {
			return(
            <ListGroup className="profile-details">
              <ListGroup.Item>Name: <span>{currentUser.name}</span></ListGroup.Item>
              <ListGroup.Item>Email: <span>{currentUser.email}</span></ListGroup.Item>
            </ListGroup>
		)}
	};
	

  // Function for when the user submits the sign in form
  const handleSubmit = async (event) => {
    event.preventDefault();
    const newName = event.target.name.value;
    const newEmail = event.target.email.value;
    const newPassword = event.target.password.value;

    const currentPassword = event.target.currentPassword.value;

    // Check if any field is filled
    if (!newName && !newEmail && !newPassword) {
      alert("No credentials entered!");
      return;
    }

    // Check for changes in name and email
    if (newName === currentUser.Name || newEmail === currentUser.Email) {
      alert("You cannot use the same credentials!");
      return;
    }

    if (!currentPassword) {
      alert("You must enter your current password!");
    }

    try {
      const success = await handleCredentialChange(event, formFields);
		if (success) {
      		await refreshProfileData();
			closeForm();
			setFormFields({})
			setEmailValid(false)
			setPasswordValid(false)
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
            <Col md={4} className="text-center">
              <div>
                <Button>
                  <FaCameraRetro /> Change picture
                </Button>
                <Button className="btn-danger">
                  <AiTwotoneDelete /> Remove
                </Button>
              </div>
            </Col>
            <Col md={8}>
	  		
              {renderUserData()}
              {/* User Form */}
              {renderUserForm()}
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;

