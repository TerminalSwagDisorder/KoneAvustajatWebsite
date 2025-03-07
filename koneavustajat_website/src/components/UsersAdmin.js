import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ListGroup, Col } from "react-bootstrap";
import {
	Button,
	Container,
	Table,
	Form,
	Dropdown,
	Alert,
	CloseButton,
	OverlayTrigger,
	Tooltip,
	Image
} from "react-bootstrap";
import { useAuth, useError } from "../utils/Contexts";

const UsersAdmin = ({ fetchDynamicData, fetchDataAmount }) => {
	const { displayError } = useError();
	const { currentUser } = useAuth();
	const navigate = useNavigate();

	const [users, setUsers] = useState([]);
	const [selectedUser, setSelectedUser] = useState([]);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	

	// Function to fetch data and set users state
	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "admin/users", null);
			await handlePagination();
			setUsers(data);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const handlePagination = async () => {
		try {
			const dataCount = await fetchDataAmount("users");
			setTotalPages(dataCount.index);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const handlePageChange = (newPage) => {
		setPage(newPage);
	};

	// Use useEffect to fetch data on component mount
	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		fetchData();
	}, [page]);

	const handleSelectUser = (user, operation) => {
		setFormFields({});
		setCurrentOperation(operation);
		setSelectedUser(user);
		window.scrollTo(0, 180);
	};

	const handleViewOrders = (user) => {
		navigate("/admin/orders", { state: { usersOrders: user } });
	};

	const closeForm = () => {
		setFormFields({});
		setCurrentOperation(null);
		setSelectedUser(null);
		//setFormFields({});
	};

	const renderPagination = (page, totalPages) => {
		return (
			<>
				<div className="paginationButtons">
					<Button onClick={() => handlePageChange(1)} disabled={page === 1}>
						First page
					</Button>

					<Button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
						Previous page
					</Button>
					<h3>
						{page} / {totalPages}
					</h3>
					<Button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
						Next page
					</Button>

					<Button onClick={() => handlePageChange(totalPages)} disabled={page === totalPages}>
						Last page
					</Button>
				</div>
			</>
		);
	};

	const renderUsers = () => {
		if (Array.isArray(users) && users.length > 0) {
			return (
				<>
					{users.map((user) => (
						<tr key={user.UserID}>
							<td> {user.UserID}</td>
							<td> {user.Email}</td>
							<td> {user.Activated === 1 ? "Activated" : "Unactvated"}</td>
							<td>
								{renderAdminButtons(user)}
								<Button className="user-select-button" onClick={() => handleSelectUser(user, "view")}>
									View user
								</Button>
								{user.CustomerID && (
									<Button className="user-select-button" onClick={() => handleViewOrders(user.CustomerID)}>
										View orders
									</Button>
								)}	
							</td>
						</tr>
					))}
				</>
			);
		} else {
			return <h3>No users available</h3>;
		}
	};

	const renderAdminButtons = (user) => {
		if (currentUser && currentUser.RoleID === 4) {
			return (
				<>
					<Button className="user-select-button" onClick={() => handleSelectUser(user, "activation")}>
						{user.Activation === 1 ? "Deactivate" : "Activate"} User
					</Button>
					<Button className="user-select-button" onClick={() => handleSelectUser(user, "modify")}>
						Modify user
					</Button>
				</>
			);
		}
	};

	const renderBasedOnUser = () => {
		if (selectedUser && currentOperation === "view") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">User details</h4>
						{Object.keys(selectedUser).map((key, index) => (
							<ul key={index}>
								<li>
									<b>{key}</b>:{" "}
									{key === "Url" || key === "Image_Url" ? (
										<a href={selectedUser[key]} target="_blank" rel="noopener noreferrer">
											{selectedUser[key]}
										</a>
									) : typeof selectedUser[key] === "object" ? (
											renderNestedObject(selectedUser[key])
									) : key === "ProfileImage" ? (
										<Image
											src={process.env.PUBLIC_URL + "/product_images/" + selectedUser[key]}
											alt={key}
											style={{ width: "100px", height: "auto" }}
										/>
										
									) : (
										selectedUser[key]
									)}
								</li>
							</ul>
						))}
					</Form>
				</div>
			);
		}
	};

	const renderNestedObject = (nestedObj) => {
		return (
			<ul>
				{Object.entries(nestedObj).map(([key, value], idx) => (
					<li key={idx}>
						<span>
							<b>{value.AddressTypeID === 1 ? "Billing" : value.AddressTypeID === 2 ? "Shipping" : key}</b>:{" "}
						</span>
					{typeof value === "object" && value !== null ? (
						renderNestedObject(value)
					) : (
						value
					)}
					</li>
				))}
			</ul>
		);
	};

	return (
		<div>
			{renderBasedOnUser()}
			{renderPagination(page, totalPages)}
			<h1>Manage Users</h1>
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th>UserID</th>
						<th>Email</th>
						<th>Activated</th>
						<th>Actions</th>
			 
					</tr>
				</thead>
				<tbody>{renderUsers()}</tbody>
			</Table>
		</div>
	);
};

/*
return (
  <div>
    <h1>Manage Users</h1>
    <ul>
    <Col md={8}>
	  		
        {renderUserData()}
        /*{/* User Form */ /*}
        {renderUserForm()}
      </Col>

    </ul>
  </div>
  );
};*/

export default UsersAdmin;
