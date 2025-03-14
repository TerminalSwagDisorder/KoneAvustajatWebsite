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
	Image,
	Spinner
} from "react-bootstrap";
import { useAuth, useError } from "../utils/Contexts";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";

const UsersAdmin = ({ fetchDynamicData, fetchDataAmount, fetchSearchData, updateDynamicData, postDynamicData }) => {
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
	const [orderBy, setOrderBy] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [EmailValid, setEmailValid] = useState(false);

	const EmailRegex = /^[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?$/;
	
	
	const roleMap = {
		1: "guest",
		2: "customer",
		3: "employee",
		4: "admin"
	};

	// Function to fetch data and set users state
	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "admin/users", null, orderBy);
			await handlePagination();
			setUsers(data);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const reFetchSearchTermData = async () => {
		try {
			const data = await fetchSearchData(searchTerm, "admin/users", orderBy);

			setSearchActive(true);
			setUsers(data);
			setTotalPages(1);
			setPage(1);
		} catch (error) {
			displayError(error);
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
		if (!searchActive) {
			fetchData();
		}
		if (searchActive && orderBy) {
			reFetchSearchTermData();
		}
	}, [page, searchActive, orderBy]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			let success;
			let successMessage;
			if (currentOperation === "modify") {
				success = await updateDynamicData(formFields, "admin/users/update", null, selectedUser.UserID);
				successMessage = `Successfully modified user ${selectedUser.UserID}!`;
			} else if (currentOperation === "add") {
				success = await postDynamicData(formFields, "admin/users/add", null);
				successMessage = "Successfully added new user, they should be getting an email soon!";
			} else if (currentOperation === "activation") {
				success = await updateDynamicData({Activated: (selectedUser.Activated ? 0 : 1)}, "admin/users/update", null, selectedUser.UserID);
				successMessage = `Successfully ${selectedUser.Activated ? "activated" : "deactivated"} user ${selectedUser.UserID}!`;
			} else if (currentOperation === "delete") {
				//success = await deleteDynamicData("admin/users", null, selectedUser.UserID);
			} else {
				displayError("No valid operation for submission");
			}
			if (success) {
				await fetchData();
				displayError(successMessage, "success");
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
	
	const handleAddNewUser = (operation) => {
		setFormFields({
			Name: "", Email: "", RoleID: 2, Department: ""
		});
		setCurrentOperation(operation);
		window.scrollTo(0, 180);
	};

	const handleViewOrders = (user) => {
		navigate("/admin/orders", { state: { usersOrders: user } });
	};

	const handleViewEmailTransactions = (user) => {
		navigate("/admin/email-transactions", { state: { usersEmailTransactions: user } });
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

	const handleOrderBy = (column) => {
		setOrderBy((prevFields) => {
			const exists = prevFields.find((item) => item.column === column);
			if (exists) {
				if (exists.column === column && exists.direction === "desc") {
					return prevFields.map((item) => (item.column === column ? { ...item, direction: "asc" } : item));
				} else if (exists.column === column && exists.direction === "asc") {
					return prevFields.filter((item) => item.column !== column);
				} else {
					return prevFields.map((item) => (item.column === column ? { ...item, direction: "desc" } : item));
				}
			} else {
				return [...prevFields, { column, direction: "desc" }];
			}
		});
	};

	const renderSortIcon = (column) => {
		const orderItem = orderBy.find((item) => item.column === column);
		if (orderItem) {
			if (orderItem.direction === "asc") {
				return <FaChevronUp />;
			} else if (orderItem.direction === "desc") {
				return <FaChevronDown />;
			} else {
				return "";
			}			
		}
		return "";
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
			
			const data = await fetchSearchData(searchTerm, "admin/users", orderBy);
			
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
								<Button className="user-select-button" onClick={() => handleViewEmailTransactions(user.UserID)}>
									View email transactions
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

	const renderOtherButtons = () => {
		return (
			<Button className="user-add-button" onClick={() => handleAddNewUser("add")}>
				Add new user
			</Button>
	)};

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

		if (event.target.name === "Email") {
			setEmailValid(EmailRegex.test(event.target.value));
		}
		
		if (event.target.id === "UserID") {
			let userId = parseInt(event.target.value, 10);

			if (userId < users[0].UserID) {
				userId = users[users.length - 1].UserID;
			}
			if (userId > users[users.length - 1].UserID) {
				userId = users[0].UserID;
			}

			let selectedUser = users.find((order) => order.UserID === userId);
			if (selectedUser === undefined || typeof selectedUser !== "object" || typeof selectedUser === "undefined") {
				selectedUser = {
					ID: userId,
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


	const renderTooltip = (props) => (
		<Tooltip id="button-tooltip" {...props}>
			Password must be at least 9 characters long, include 1 capital letter, and 1 number.
		</Tooltip>
	);
	
	const renderAddUserForm = () => {
		if (currentOperation !== "add") return;
		// Name, Email, RoleID, Department
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
							width: "75rem",
							padding: "20px",
							borderRadius: "8px",
							boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
						}}>
							
						<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
							<div className="d-flex justify-content-end mb-3">
								<CloseButton onClick={() => closeForm()} />
							</div>
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

							<Form.Group className="mb-3">
								<Form.Label>Role</Form.Label>
								<Form.Select name="RoleID" value={formFields.RoleID} onChange={handleInputChange}>
									<option disabled>
										Guest
									</option>
									<option value="2">
										Customer
									</option>
									<option disabled>
										Employee
									</option>
									<option value="4">
										Admin
									</option>
								</Form.Select>
							</Form.Group>

							{formFields && formFields.RoleID === "4" && (
							<Form.Group className="mb-3">
								<Form.Label>Department</Form.Label>
								<Form.Control
									type="text"
									placeholder="Enter department"
									required
									name="Department"
									value={formFields.Department}
									onChange={handleInputChange}
								/>
							</Form.Group>
							)}

							<Button type={isLoading ? "" : "submit"} style={{ width: "100%" }} disabled={isLoading}>
								{isLoading ? (
									<>
										<Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
										<span className="visually-hidden">Loading...</span>
									</>
								) : (
									"Send invitation"
								)}
							</Button>
						</Form>

					</div>
				</Container>
			</div>
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
			{renderOtherButtons()}
			{searchButton()}
			{renderSearch()}
			{renderAddUserForm()}
			{renderConfirmation()}
			{renderUserModification()}
			{renderPagination(page, totalPages)}
			<h1>Manage Users</h1>
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th className="order-by" onClick={() => handleOrderBy("UserID")}>UserID {renderSortIcon("UserID")}</th>
						<th className="order-by" onClick={() => handleOrderBy("Email")}>Email {renderSortIcon("Email")}</th>
						<th className="order-by" onClick={() => handleOrderBy("RoleID")}>Role {renderSortIcon("RoleID")}</th>
						<th className="order-by" onClick={() => handleOrderBy("Activated")}>Activated {renderSortIcon("Activated")}</th>
						<th>Actions</th>
			 
					</tr>
				</thead>
				<tbody>{renderUsers()}</tbody>
			</Table>
		</div>
	);
};


export default UsersAdmin;
