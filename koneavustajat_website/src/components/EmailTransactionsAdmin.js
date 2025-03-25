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
import { FaChevronUp, FaChevronDown, FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight } from "react-icons/fa";
import { useAuth, useError } from "../utils/Contexts";
import DOMPurify from "dompurify";

const EmailTransactionsAdmin = ({ fetchDynamicData, fetchDataAmount, fetchSearchData, updateDynamicData }) => {
	const { displayError } = useError();
	const { currentUser } = useAuth();
	const { state } = useLocation();

	const [emailTransactions, setEmailTransactions] = useState([]);
	const [selectedEmailTransaction, setSelectedEmailTransaction] = useState(null);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	const [searchToggle, setSearchToggle] = useState(false);
	const [searchActive, setSearchActive] = useState(false);
	const [searchKey, setSearchKey] = useState("EmailID");
	const [searchTerm, setSearchTerm] = useState({});
	const [catchState, setCatchState] = useState(state?.usersEmailTransactions || null);
	const [orderBy, setOrderBy] = useState([]);
	

	// Function to fetch data and set emailTransactions state
	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "admin/email-transactions", null, orderBy);
			await handlePagination();
			setEmailTransactions(data);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const fetchSearchState = async () => {
		try {
			const data = await fetchSearchData({ ToUserID: catchState }, "admin/email-transactions", orderBy);
			setEmailTransactions(data);
			setTotalPages(1);
			setPage(1);
			//displayError(`Found ${data.length} emailTransactions belonging to customer ${usersOrders}.`, "success");
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const handlePagination = async () => {
		try {
			const dataCount = await fetchDataAmount("email_transactions");
			setTotalPages(dataCount.index);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const handlePageChange = (newPage) => {
		setPage(newPage);
	};

	const handlePageOverride = (event) => {
		let pageNum = parseInt(event.target.value, 10);

		if (pageNum < 1) {
			pageNum = totalPages;
		}
		if (pageNum > totalPages) {
			pageNum = 1;
		}
		setPage(pageNum);
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
			setSearchKey("ToUserID");
			setSearchTerm({ToUserID: catchState});
			setSearchToggle(true);
			setSearchActive(true);
			fetchSearchState();
		}
		if (!searchActive && !catchState) {
			fetchData();
		}
		if (searchActive && orderBy) {
			reFetchSearchTermData();
		}
	}, [page, searchActive, catchState, orderBy]);


	const handleSelectEmailTransaction = (transaction, operation) => {
		setFormFields({});
		setCurrentOperation(operation);
		setSelectedEmailTransaction(transaction);
		window.scrollTo(0, 180);
	};

	const closeForm = () => {
		setFormFields({});
		setCurrentOperation(null);
		setSelectedEmailTransaction(null);
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
	
	const reFetchSearchTermData = async () => {
		try {
			const data = await fetchSearchData(searchTerm, "admin/email-transactions", orderBy);

			setSearchActive(true);
			setEmailTransactions(data);
			setTotalPages(1);
			setPage(1);
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
			
			const data = await fetchSearchData(searchTerm, "admin/email-transactions", orderBy);
			
			if (!data || data.length === 0) {
				displayError("No data found using this search term!");
				return;
			}

			setSearchActive(true);
			setEmailTransactions(data);
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
			if (currentOperation === "delete") {
				//success = await deleteDynamicData("part", null, selectedEmailTransaction.EmailID);
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
		
		if (event.target.id === "EmailID") {
			let transactionId = parseInt(event.target.value, 10);

			if (transactionId < emailTransactions[0].EmailID) {
				transactionId = emailTransactions[emailTransactions.length - 1].EmailID;
			}
			if (transactionId > emailTransactions[emailTransactions.length - 1].EmailID) {
				transactionId = emailTransactions[0].EmailID;
			}

			let selectedEmailTransaction = emailTransactions.find((transaction) => transaction.EmailID === transactionId);
			if (selectedEmailTransaction === undefined || typeof selectedEmailTransaction !== "object" || typeof selectedEmailTransaction === "undefined") {
				selectedEmailTransaction = {
					ID: transactionId,
					Name: "Not a transaction",
					Error: "Invalid transaction: Transaction with the EmailID does not exist"
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
		if (searchToggle && emailTransactions) {
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
							{Object.keys(emailTransactions[0] || {}).map((key) => (
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

	const renderPagination = () => {
		return (
			<>
				<div className="paginationButtons">
					<Button onClick={() => handlePageChange(1)} disabled={page === 1}>
						<FaAngleDoubleLeft />
					</Button>

					<Button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
						<FaAngleLeft />
					</Button>
					<h3>
						<input
								type="number"
								step="1"
								min="1"
								max={totalPages}
								value={page}
								onChange={handlePageOverride}
								className="pagination-override"
							/> / {totalPages}
					</h3>
					<Button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
						<FaAngleRight />
					</Button>

					<Button onClick={() => handlePageChange(totalPages)} disabled={page === totalPages}>
						<FaAngleDoubleRight />
					</Button>
				</div>
			</>
		);
	};

	const renderEmailTransactions = () => {
		if (Array.isArray(emailTransactions) && emailTransactions.length > 0) {
			return (
				<>
					{emailTransactions.map((transaction) => (
						<tr key={transaction.EmailID}>
							<td> {transaction.EmailID}</td>
							<td> {transaction.ToEmail}</td>
							<td> {transaction.FromEmail}</td>
							<td> {transaction.Subject}</td>
							<td>
								<Button className="user-select-button" onClick={() => handleSelectEmailTransaction(transaction, "condensedview")}>
									Quick view
								</Button>
								<Button className="user-select-button" onClick={() => handleSelectEmailTransaction(transaction, "view")}>
									View transaction
								</Button>
							</td>
						</tr>
					))}
				</>
			);
		} else {
			return <h3>No emailTransactions available</h3>;
		}
	};

	const renderBasedOnEmailTransaction = () => {
		if (!selectedEmailTransaction || (currentOperation !== "condensedview" && currentOperation !== "view")) {
			return null;
		}
		
		let sanitizedContent;
		
		const condensedFields = ["ToEmail", "FromEmail", "Subject", "Content", "CreatedAt"];

		const disableLinksHook = (node) => {
			if (node.tagName && node.tagName.toLowerCase() === "a") {
				node.removeAttribute("href");
			}
		};

		
		if (selectedEmailTransaction.Content) {
			//DOMPurify.addHook("afterSanitizeAttributes", disableLinksHook); // more leanient, and fine-grained
			sanitizedContent = DOMPurify.sanitize(selectedEmailTransaction.Content, {
				FORBID_ATTR: ["href"],
				FORBID_TAGS: ["script"],
			});
		}

		const keysToRender = Object.keys(selectedEmailTransaction).filter((key) =>
			currentOperation === "view" || (currentOperation === "condensedview" && condensedFields.includes(key))
		);

		return (
			<div id="partform" className="partform d-flex justify-content-center align-items-center">
				<Form className="adminForm border rounded shadow p-4 bg-opaque">
					<div className="d-flex justify-content-end mb-3">
						<CloseButton onClick={closeForm} />
					</div>
					<h4 className="mb-3">Email transaction details</h4>
					{keysToRender.map((key, index) => (
						<ul key={index}>
							<li>
								<b>{key}</b>:{" "}
								{key === "Url" || key === "Image_Url" ? (
									<a href={selectedEmailTransaction[key]} target="_blank" rel="noopener noreferrer">
										{selectedEmailTransaction[key]}
									</a>
								) : typeof selectedEmailTransaction[key] === "object" && selectedEmailTransaction[key] !== null ? (
									renderNestedObject(selectedEmailTransaction[key])
								) : key === "Image" ? (
									<Image
										src={process.env.PUBLIC_URL + "/product_images/" + selectedEmailTransaction[key]}
										alt={key}
										style={{ width: "100px", height: "auto" }}
									/>
								) : (key.toLowerCase().includes("date") || key.toLowerCase().includes("createdat")) && new Date(selectedEmailTransaction[key]).toUTCString() !== "Invalid Date" ? (
									new Date(selectedEmailTransaction[key]).toUTCString()
								) : key === "Content" ? (
									<div
										className="email-content"
										dangerouslySetInnerHTML={{ __html: sanitizedContent }}
									/>

								) : (
									selectedEmailTransaction[key]
								)}
							</li>
						</ul>
					))}
				</Form>
			</div>
		);
	};

	const renderNestedObject = (nestedObj) => {
		if (currentOperation === "condensedview") {
			const condensedItems = ["ToEmail", "FromEmail", "Subject", "Content", "CreatedAt"];
			
			return (
				<ul>
					{Object.entries(nestedObj).map(([key, value], idx) => {
						if (Number.isNaN(parseInt(key)) && condensedItems.includes(key) || !Number.isNaN(parseInt(key))) {
							return (
							<li key={idx}>
								<span>
									<b>{value.AddressTypeID === 1 ? "Billing" : value.AddressTypeID === 2 ? "Shipping" : value.table ? value.table : key }</b>:{" "}
								</span>
							{typeof value === "object" && value !== null ? (
								renderNestedObject(value)
							) :  key.toLowerCase().includes("date") && new Date(value).toUTCString() !== "Invalid Date" ? (
								new Date(value).toUTCString()
							) : key === "Url" || key === "Image_Url" ? (
							<a href={value} target="_blank" rel="noopener noreferrer">
								{value}
							</a>
							) : (
								value
							)}
							</li>
							)
						}
						return null;
					})}
				</ul>
			);
		}
		return (
			<ul>
				{Object.entries(nestedObj).map(([key, value], idx) => (
					<li key={idx}>
						<span>
								<b>{value.AddressTypeID === 1 ? "Billing" : value.AddressTypeID === 2 ? "Shipping" : value.table ? value.table : key }</b>:{" "}
						</span>
					{typeof value === "object" && value !== null ? (
						renderNestedObject(value)
					) :  key.toLowerCase().includes("date") && new Date(value).toUTCString() !== "Invalid Date" ? (
						new Date(value).toUTCString()
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
				
			{renderBasedOnEmailTransaction()}
			{searchButton()}
			{renderSearch()}
			{renderPagination()}
			<h1>Manage Transactions</h1>
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th className="order-by" onClick={() => handleOrderBy("EmailID")}>EmailID {renderSortIcon("EmailID")}</th>
						<th className="order-by" onClick={() => handleOrderBy("ToEmail")}>ToEmail{renderSortIcon("ToEmail")}</th>
						<th className="order-by" onClick={() => handleOrderBy("FromEmail")}>FromEmail{renderSortIcon("FromEmail")}</th>
						<th className="order-by" onClick={() => handleOrderBy("Subject")}>Subject{renderSortIcon("Subject")}</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>{renderEmailTransactions()}</tbody>
			</Table>
		</div>
	);
};


export default EmailTransactionsAdmin;
