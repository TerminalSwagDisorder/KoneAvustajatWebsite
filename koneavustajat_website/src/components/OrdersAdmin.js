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
import { useAuth, useError } from "../utils/Contexts";

const OrdersAdmin = ({ fetchDynamicData, fetchDataAmount, fetchSearchData }) => {
	const { displayError } = useError();
	const { currentOrder } = useAuth();
	const { state } = useLocation();
	const usersOrders = state?.usersOrders || null;

	const [orders, setOrders] = useState([]);
	const [selectedOrder, setSelectedOrder] = useState([]);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	const [searchActive, setSearchActive] = useState(false);
	const [searchKey, setSearchKey] = useState("ID");
	const [searchTerm, setSearchTerm] = useState({});
	const [catchState, setCatchState] = useState(null);
	

	// Function to fetch data and set orders state
	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "admin/orders", null);
			await handlePagination();
			setOrders(data);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const fetchSearchState = async () => {
		try {
			const data = await fetchSearchData(catchState, "admin/orders");
			setOrders(data);
			//displayError(`Found ${data.length} orders belonging to customer ${catchState.CustomerID}.`, "success");
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
		if (!usersOrders && !searchActive && !catchState) {
			fetchData();
			console.log("!usersOrders && !searchActive && !catchState", "warning");
		}
	}, []);

	useEffect(() => {
		if (!searchActive && !catchState) {
			fetchData();
			console.log("!searchActive && !catchState", "warning");
		}
	}, [page]);
	
	useEffect(() => {
		if (catchState && searchActive) {
			fetchSearchState();
			setCatchState(null);
			console.log("catchState && searchActive");
		}
	}, [catchState, searchActive]);	

	useEffect(() => {
		if (usersOrders) {
			setCatchState({ CustomerID: usersOrders });
			setTotalPages(1);
			setPage(1);
			setSearchActive(true);
			console.log("usersOrders", "warning");
		}
	}, [usersOrders]);


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
			if (searchTerm) setSearchTerm({});
			setSearchActive(false);
			await fetchData();
		} catch (error) {
			displayError(error);
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

	const renderOrders = () => {
		if (Array.isArray(orders) && orders.length > 0) {
			return (
				<>
					{orders.map((order) => (
						<tr key={order.OrderID}>
							<td> {order.OrderID}</td>
							<td> {order.CustomerID}</td>
							<td> {order.ReceiptID}</td>
							<td> {order.OrderDate}</td>
							<td> {order.Status}</td>
							<td> {order.PaymentStatus !== "paid" ? order.PaymentDate : order.PaymentStatus}</td>
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
		if (currentOrder && currentOrder.RoleID === 4) {
			return (
				<>
					<Button className="user-select-button" onClick={() => handleSelectOrder(order, "activation")}>
						{order.Activation === 1 ? "Deactivate" : "Activate"} Order
					</Button>
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

	return (
		<div>
			{catchState && (
			 	catchState.CustomerID || ""
			 )}
			{searchActive && (
				<Button className="user-select-button" onClick={() => clearSearchTerm()}>
					Clear filters
				</Button>
			 )}
				
			{renderBasedOnOrder()}
			{renderPagination(page, totalPages)}
			<h1>Manage Orders</h1>
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th>OrderID</th>
						<th>CustomerID</th>
						<th>ReceiptID</th>
						<th>OrderDate</th>
						<th>Status</th>
						<th>PaymentDate</th>
						<th>Actions</th>
			 
					</tr>
				</thead>
				<tbody>{renderOrders()}</tbody>
			</Table>
		</div>
	);
};


export default OrdersAdmin;
