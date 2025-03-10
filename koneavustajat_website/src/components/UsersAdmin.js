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

const UsersAdmin = ({ fetchDynamicData, fetchDataAmount, fetchSearchData, updateDynamicData }) => {
	const { displayError } = useError();
	const { currentUser } = useAuth();
	const navigate = useNavigate();

	const [users, setUsers] = useState([]);
	const [selectedUser, setSelectedUser] = useState([]);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	const [searchToggle, setSearchToggle] = useState(false);
	const [searchActive, setSearchActive] = useState(false);
	const [searchKey, setSearchKey] = useState("UserID");
	const [searchTerm, setSearchTerm] = useState({});
	
	const roleMap = {
		1: "guest",
		2: "customer",
		3: "employee",
		4: "admin"
	};

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

	const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			let success;
			if (currentOperation === "modify") {
				success = await updateDynamicData(formFields, "admin/users/update", null, selectedUser.UserID);
			} else if (currentOperation === "activation") {
				success = await updateDynamicData({Activated: (selectedUser.Activated ? 0 : 1)}, "admin/users/update", null, selectedUser.UserID);
			} else if (currentOperation === "delete") {
				//success = await deleteDynamicData("admin/users", null, selectedUser.UserID);
			} else {
				displayError("No valid operation for submission");
			}
			if (success) {
				await fetchData();
				closeForm();
			}
		} catch (error) {
			displayError(error);
		}
	};

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

	const clearSearchTerm = async () => {
		try {
			setSearchActive(false);
			if (searchTerm) setSearchTerm({});
			await fetchData();
		} catch (error) {
			displayError(error);
		}
	};


	const handleSearchKey = (value) => {
		setSearchKey(value);
	};

	const handleSearchTerm = (event) => {
		setSearchTerm((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value
		}));
	};

	const handleSearchRendering = () => {
		setSearchToggle(searchToggle === true ? false : true);
	};

	const fetchSearchTermData = async (event) => {
		event.preventDefault();
		try {
			if (!searchToggle) {
				displayError("Search is not active!");
				return;
			}
			
			if (!searchTerm || Object.keys(searchTerm).length === 0) {
				displayError("Search cannot be empty!");
				return;
			}

			const emptyCheck = Object.entries(searchTerm).every(([key, value]) => key === "inverted" || key === "strict" || value == null || String(value).trim() === "");
			if (emptyCheck) {
				displayError("Search cannot be empty!");
				return;
			}
			
			const data = await fetchSearchData(searchTerm, "admin/users");
			
			if (!data || data.length === 0) {
				displayError("No data found using this search term!");
				return;
			}

			setSearchActive(true);
			setUsers(data);
			setTotalPages(1);
			setPage(1);
			displayError(`Found ${data.length} items from the search.`, "success");

		} catch (error) {
			displayError(error);
			console.error(error);
		}
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
							<td> {roleMap[user.RoleID]}</td>
							<td> {user.Activated === 1 ? "Activated" : "Unactivated"}</td>
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
						{user.Activated === 1 ? "Deactivate" : "Activate"} User
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
									) : key === "RoleID" ? (
										roleMap[selectedUser[key]]
									) : typeof selectedUser[key] === "boolean" ? (
										selectedUser[key] === 1 ? "True" : "False" 
									) : typeof selectedUser[key] === "object" ? (
											renderNestedObject(selectedUser[key])
									) : key === "ProfileImage" ? (
										<Image
											src={process.env.PUBLIC_URL + "/profile_images/" + selectedUser[key]}
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

	const renderConfirmation = () => {
		if (currentUser && currentUser.RoleID === 4 && selectedUser && currentOperation === "activation") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						{currentOperation === "activation" ? (
							<>
							<h4 className=" mb-3">Are you sure you want to toggle the activation of this user?</h4>
								<ul>
									<p><b>Current activation status:</b> {selectedUser.Activated ? "Activated" : "Unactivated"} </p>
									<p><b>ID:</b> {selectedUser.UserID} </p>
									<p><b>Email:</b> {selectedUser.Email} </p>
									<p><b>Name:</b> {selectedUser.Name} </p>
								</ul>
							</>
						) : (
							<>
								<h4 className=" mb-3">Unsupported operation type</h4>
							</>
						)}
						<Button variant="primary" type="submit">
							Yes
						</Button>						
						<Button variant="primary" style={{"background-color": "#990000"}} onClick={() => closeForm()}>
							No
						</Button>
					</Form>
				</div>
			);
		}
	};

	const handleInputChange = (event) => {
		
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));
		
		if (event.target.id === "UserID") {
			let orderId = parseInt(event.target.value, 10);

			if (orderId < users[0].UserID) {
				orderId = users[users.length - 1].UserID;
			}
			if (orderId > users[users.length - 1].UserID) {
				orderId = users[0].UserID;
			}

			let selectedUser = users.find((order) => order.UserID === orderId);
			if (selectedUser === undefined || typeof selectedUser !== "object" || typeof selectedUser === "undefined") {
				selectedUser = {
					ID: orderId,
					Name: "Not a user",
					Error: "Invalid order: User with the UserID does not exist"
				};
			}
			setCurrentOperation("view");
		}
	};

	const searchButton = () => {
		return (
			<>
				<Button onClick={() => handleSearchRendering()}>Toggle search</Button>
				<Button onClick={() => clearSearchTerm()}  disabled={Object.entries(searchTerm).length === 0}>Clear search</Button>
			</>
		)
	}

	const renderSearch = () => {
		if (searchToggle && users) {
			return (
			<div className="searchForm">
				<Form
					className="bg-opaque"
					onSubmit={fetchSearchTermData}
					style={{ width: "400px" }}
				>
					<Dropdown>
						<Dropdown.Toggle variant="success" id="dropdown-basic">
							{searchKey || "Choose search type"}
						</Dropdown.Toggle>

						<Dropdown.Menu>
							{Object.keys(users[0] || {}).map((key) => (
								<Dropdown.Item
									key={key}
									onClick={() => handleSearchKey(key)}>
									{key}

								</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown>
					{renderSearchInput(searchKey)}
					<Button style={{ width: "40%" }} type="submit">
						Search
					</Button>
					<Button style={{ width: "40%" }} onClick={() => clearSearchTerm()} disabled={!searchToggle}>
					Clear
					</Button>
				</Form>
				<br />
			</div>
			)
		}
	}
	
	const renderSearchInput = (key) => {
		if (!key) return;
		return (
			<>
				<Form.Group className="mb-3">
					<Form.Label>{key}</Form.Label>
					<Form.Control 
					type="text" 
					id={key}
					name={key} 
					value={searchTerm[key] || ""} 
					onChange={handleSearchTerm} 
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Check
						type="checkbox"
						label="Strict search"
						name="strict"
						onChange={handleSearchTerm}
						id="strict"
						checked={Boolean(searchTerm.strict)}
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Check
						type="checkbox"
						label="Inverted search"
						name="inverted"
						onChange={handleSearchTerm}
						id="inverted"
						checked={Boolean(searchTerm.inverted)}
					/>
				</Form.Group>
			</>
		);
	};

	const renderUserModification = () => {
		if (currentUser && currentUser.RoleID === 4 && selectedUser && currentOperation === "modify") {
			const viewOnly = ["UserID", "Email"];
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Modify order</h4>
						{Object.keys(selectedUser).map((key, index) => (
							<ul key={index}>
									<b>{key}</b>:{" "}
									{viewOnly.includes(key) && key !== "Password" ? (
										selectedUser[key]
									)  : typeof selectedUser[key] === "boolean" ? (
										selectedUser[key] === 1 ? "True" : "False" 
									) : typeof selectedUser[key] === "object" ? (
											renderNestedObject(selectedUser[key])
									) : key === "ProfileImage" ? (
										<Image
											src={process.env.PUBLIC_URL + "/profile_images/" + selectedUser[key]}
											alt={key}
											style={{ width: "100px", height: "auto" }}
										/>
									) : (
										<Form.Group className="mb-3">
											<Form.Control
												type="text"
												placeholder={selectedUser[key]}
												name={key}
												onChange={handleInputChange}
											/>
										</Form.Group>
									)}
							</ul>
						))}
						<Button variant="primary" type="submit">
							Modify user
						</Button>
					</Form>
				</div>
			);
		}
	};

	return (
		<div>
			{renderBasedOnUser()}
			{searchButton()}
			{renderSearch()}
			{renderConfirmation()}
			{renderUserModification()}
			{renderPagination(page, totalPages)}
			<h1>Manage Users</h1>
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th>UserID</th>
						<th>Email</th>
						<th>Role</th>
						<th>Activated</th>
						<th>Actions</th>
			 
					</tr>
				</thead>
				<tbody>{renderUsers()}</tbody>
			</Table>
		</div>
	);
};


export default UsersAdmin;
