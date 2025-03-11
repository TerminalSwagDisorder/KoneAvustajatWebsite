import React, { useState, useEffect } from "react";
import { useLocation  } from "react-router-dom";
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
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import { useAuth, useError } from "../utils/Contexts";

const OrdersAdmin = ({ fetchDynamicData, fetchDataAmount, fetchSearchData, updateDynamicData }) => {
	const { displayError } = useError();
	const { currentUser } = useAuth();
	const { state } = useLocation();

	const [orders, setOrders] = useState([]);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	const [searchToggle, setSearchToggle] = useState(false);
	const [searchActive, setSearchActive] = useState(false);
	const [searchKey, setSearchKey] = useState("OrderID");
	const [searchTerm, setSearchTerm] = useState({});
	const [catchState, setCatchState] = useState(state?.usersOrders || null);
	const [orderBy, setOrderBy] = useState([]);
	

	// Function to fetch data and set orders state
	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "admin/orders", null, orderBy);
			await handlePagination();
			setOrders(data);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const fetchSearchState = async () => {
		try {
			const data = await fetchSearchData({ CustomerID: catchState }, "admin/orders", orderBy);
			setOrders(data);
			setTotalPages(1);
			setPage(1);
			//displayError(`Found ${data.length} orders belonging to customer ${usersOrders}.`, "success");
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const handlePagination = async () => {
		try {
			const dataCount = await fetchDataAmount("orders");
			setTotalPages(dataCount.index);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const handlePageChange = (newPage) => {
		setPage(newPage);
	};

	useEffect(() => {
		if (!catchState) {
			fetchData();
		}
	}, []);

	useEffect(() => {
		console.log(orderBy);
	}, [orderBy]);

	useEffect(() => {
		if (catchState) {
			setSearchKey("CustomerID");
			setSearchTerm({CustomerID: catchState});
			setSearchToggle(true);
			setSearchActive(true);
			fetchSearchState();
		}
		if (!searchActive && !catchState) {
			fetchData();
		}
	}, [page, searchActive, catchState, orderBy]);


	const handleSelectOrder = (order, operation) => {
		setFormFields({});
		setCurrentOperation(operation);
		setSelectedOrder(order);
		window.scrollTo(0, 180);
	};

	const closeForm = () => {
		setFormFields({});
		setCurrentOperation(null);
		setSelectedOrder(null);
		//setFormFields({});
	};

	const clearSearchTerm = async () => {
		try {
			setSearchActive(false);
			if (catchState) setCatchState(null);
			if (searchTerm) setSearchTerm({});
			await fetchData();
		} catch (error) {
			displayError(error);
		}
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
			
			const data = await fetchSearchData(searchTerm, "admin/orders", orderBy);
			
			if (!data || data.length === 0) {
				displayError("No data found using this search term!");
				return;
			}

			setSearchActive(true);
			setOrders(data);
			setTotalPages(1);
			setPage(1);
			displayError(`Found ${data.length} items from the search.`, "success");

		} catch (error) {
			displayError(error);
			console.error(error);
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

	const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			let success;
			if (currentOperation === "modify") {
				success = await updateDynamicData(formFields, "admin/orders/update", null, selectedOrder.OrderID);
			} else if (currentOperation === "delete") {
				//success = await deleteDynamicData("part", null, selectedOrder.OrderID);
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

	const handleInputChange = (event) => {
		
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));
		
		if (event.target.id === "OrderID") {
			let orderId = parseInt(event.target.value, 10);

			if (orderId < orders[0].OrderID) {
				orderId = orders[orders.length - 1].OrderID;
			}
			if (orderId > orders[orders.length - 1].OrderID) {
				orderId = orders[0].OrderID;
			}

			let selectedOrder = orders.find((order) => order.OrderID === orderId);
			if (selectedOrder === undefined || typeof selectedOrder !== "object" || typeof selectedOrder === "undefined") {
				selectedOrder = {
					ID: orderId,
					Name: "Not an order",
					Error: "Invalid order: Order with the OrderID does not exist"
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
		if (searchToggle && orders) {
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
							{Object.keys(orders[0] || {}).map((key) => (
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
				<Form.Group className="mb-3">
					<Form.Label>Max total price</Form.Label>
					<Form.Control 
					type="number" 
					id="priceMax"
					name="priceMax"
					value={searchTerm.priceMax || ""} 
					onChange={handleSearchTerm} 
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>Min total price</Form.Label>
					<Form.Control 
					type="number" 
					id="priceMin"
					name="priceMin"
					value={searchTerm.priceMin || ""} 
					onChange={handleSearchTerm} 
					/>
				</Form.Group>
			</>
		);
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

	const renderOrders = () => {
		if (Array.isArray(orders) && orders.length > 0) {
			return (
				<>
					{orders.map((order) => (
						<tr key={order.OrderID}>
							<td> {order.OrderID}</td>
							<td> {order.CustomerID}</td>
							<td> {order.ReceiptID}</td>
							<td> {new Date(order.OrderDate).toUTCString()}</td>
							<td> {order.Status}</td>
							<td> {order.PaymentStatus === "paid" ? new Date(order.PaymentDate).toUTCString() : order.PaymentStatus}</td>
							<td>
								{renderAdminButtons(order)}
								<Button className="user-select-button" onClick={() => handleSelectOrder(order, "view")}>
									View order
								</Button>
							</td>
						</tr>
					))}
				</>
			);
		} else {
			return <h3>No orders available</h3>;
		}
	};

	const renderAdminButtons = (order) => {
		if (currentUser && currentUser.RoleID === 4) {
			return (
				<>
					<Button className="user-select-button" onClick={() => handleSelectOrder(order, "modify")}>
						Modify order
					</Button>
				</>
			);
		}
	};

	const renderBasedOnOrder = () => {
		if (selectedOrder && currentOperation === "view") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Order details</h4>
						{Object.keys(selectedOrder).map((key, index) => (
							<ul key={index}>
								<li>
									<b>{key}</b>:{" "}
									{key === "Url" || key === "Image_Url" ? (
										<a href={selectedOrder[key]} target="_blank" rel="noopener noreferrer">
											{selectedOrder[key]}
										</a>
									) : typeof selectedOrder[key] === "object" ? (
											renderNestedObject(selectedOrder[key])
									) : key === "ProfileImage" ? (
										<Image
											src={process.env.PUBLIC_URL + "/product_images/" + selectedOrder[key]}
											alt={key}
											style={{ width: "100px", height: "auto" }}
										/>
										
									) : (
										selectedOrder[key]
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

	const renderOrderModification = () => {
		if (currentUser && currentUser.RoleID === 4 && selectedOrder && currentOperation === "modify") {
			const viewOnly = ["OrderID", "OrderTypeID", "CustomerID", "ReceiptID", "OrderDate", "TotalPrice", "Currency", "PaymentMethod", "PaymentProvider", "TransactionID", "PaymentDate", "ModifiedAt"];
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Modify order</h4>
						{Object.keys(selectedOrder).map((key, index) => (
							<ul key={index}>
									<b>{key}</b>:{" "}
									{viewOnly.includes(key) ? (
										selectedOrder[key]
									) : typeof selectedOrder[key] === "object" ? (
										renderNestedObject(selectedOrder[key])
									) : (
										<Form.Group className="mb-3">
											<Form.Control
												type="text"
												placeholder={selectedOrder[key]}
												name={key}
												onChange={handleInputChange}
											/>
										</Form.Group>
									)}
							</ul>
						))}
						<Button variant="primary" type="submit">
							Modify order
						</Button>
					</Form>
				</div>
			);
		}
	};

	return (
		<div>
				
			{renderBasedOnOrder()}
			{searchButton()}
			{renderSearch()}
			{renderOrderModification()}
			{renderPagination(page, totalPages)}
			<h1>Manage Orders</h1>
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th className="order-by" onClick={() => handleOrderBy("OrderID")}>OrderID {renderSortIcon("OrderID")}</th>
						<th className="order-by" onClick={() => handleOrderBy("CustomerID")}>CustomerID{renderSortIcon("CustomerID")}</th>
						<th className="order-by" onClick={() => handleOrderBy("ReceiptID")}>ReceiptID{renderSortIcon("ReceiptID")}</th>
						<th className="order-by" onClick={() => handleOrderBy("OrderDate")}>OrderDate{renderSortIcon("OrderDate")}</th>
						<th className="order-by" onClick={() => handleOrderBy("Status")}>Status{renderSortIcon("Status")}</th>
						<th className="order-by" onClick={() => handleOrderBy("PaymentDate")}>PaymentDate{renderSortIcon("PaymentDate")}</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>{renderOrders()}</tbody>
			</Table>
		</div>
	);
};


export default OrdersAdmin;
