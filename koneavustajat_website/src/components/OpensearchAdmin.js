import React, { useState, useEffect, useMemo } from "react";
import { useLocation  } from "react-router-dom";
import { ListGroup, Col } from "react-bootstrap";
import { Button, Table, Form, Dropdown, CloseButton, Spinner } from "react-bootstrap";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import { useAuth, useError } from "../utils/Contexts";

const OpensearchAdmin = ({ fetchDynamicData, fetchSearchData }) => {
	const { displayError } = useError();
	const { currentUser } = useAuth();
	const { state } = useLocation();

	const [data, setData] = useState([]);
	const [selectedData, setSelectedData] = useState(null);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [currentOperation, setCurrentOperation] = useState("");
	const [orderBy, setOrderBy] = useState([]);
	const [searchKey, setSearchKey] = useState("OrderID");
	const [isLoading, setIsLoading] = useState(false);
	const [toggleQuery, setToggleQuery] = useState(false);
	const [searchTerm, setSearchTerm] = useState({
		method: "",
		amount: "",
		type: "",
		part: "",
		id: ""
	});
	const [viewType, setViewType] = useState({
		key: "allocation",
		value: "Allocation"
	});
	

	// Function to fetch data and set data state
	const fetchData = async () => {
		try {
			const data = await fetchSearchData({ type: viewType.key }, "opensearch/view", orderBy);
			setData(data);
		} catch (error) {
			displayError(error.message || error);
		}
	};

	const sortedData = useMemo(() => {
		const sorted = [...data];
		if (orderBy.length > 0) {
			sorted.sort((a, b) => {
				for (let { column, direction } of orderBy) {
					let valA = a[column];
					let valB = b[column];

					if (valA == null && valB == null) continue;
					if (valA == null) return direction === "asc" ? -1 : 1;
					if (valB == null) return direction === "asc" ? 1 : -1;

					if (column.toLowerCase().includes("date")) {
						const dateA = new Date(valA);
						const dateB = new Date(valB);
						if (dateA < dateB) return direction === "asc" ? -1 : 1;
						if (dateA > dateB) return direction === "asc" ? 1 : -1;
						continue;
					}

					const numA = parseFloat(valA);
					const numB = parseFloat(valB);
					if (!isNaN(numA) && !isNaN(numB)) {
						if (numA < numB) return direction === "asc" ? -1 : 1;
						if (numA > numB) return direction === "asc" ? 1 : -1;
						continue;
					}

					const strA = String(valA).toLowerCase();
					const strB = String(valB).toLowerCase();
					if (strA < strB) return direction === "asc" ? -1 : 1;
					if (strA > strB) return direction === "asc" ? 1 : -1;
				}
				return 0;
			});
		}
		return sorted;
	}, [data, orderBy]);
	
	const submitManagementQuery = async (event) => {
		event.preventDefault();
		try {
			setIsLoading(true);
			if (!searchTerm || Object.keys(searchTerm).length === 0) {
				displayError("Search cannot be empty!");
				return;
			}

			const emptyCheck = Object.entries(searchTerm).every(([key, value]) => value == null || String(value).trim() === "");
			if (emptyCheck) {
				displayError("Search cannot be empty!");
				return;
			}

			const data = await fetchSearchData(searchTerm, "opensearch/manage", orderBy);
			
			let parsedData = data;
			if (Array.isArray(data)) {
				parsedData = data.join("; ");
			}
			
			await fetchData();
			displayError(data.message || data, "success");
		} catch (error) {
			displayError(error.message || error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleViewTypeChange = (value) => {
		setViewType(value);
		setPage(1);
	};

	const handleManagementTypeChange = (event) => {
		setSearchTerm((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value
		}));
	};

	const handleQueryToggle = () => {
		setToggleQuery(toggleQuery === true ? false : true);
	};

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		fetchData();
	}, [viewType, orderBy]);

	const closeForm = () => {
		setCurrentOperation(null);
		setSelectedData(null);
	};

	const clearSearchTerm = async () => {
		try {
			if (searchTerm) setSearchTerm({
					method: "",
					amount: "",
					type: "",
					part: "",
					id: ""
				});
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

	const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			let success;
			if (currentOperation === "modify") {
				//success = await updateDynamicData(formFields, "opensearch/update", null, selectedData.OrderID);
			} else if (currentOperation === "delete") {
				//success = await deleteDynamicData("part", null, selectedData.OrderID);
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

	const typeChoice = () => {
		const viewTypeMapping = {
			allocation: "Allocation",
			shards: "Shards",
			cluster_manager: "Cluster manager",
			nodes: "Nodes",
			nodeattrs: "Node attributes",
			tasks: "Tasks",
			indices: "Indices",
			segments: "Segments",
			count: "Count",
			recovery: "Recovery",
			health: "Health",
			pending_tasks: "Pending tasks",
			aliases: "Aliases",
			thread_pool: "Thread pool",
			plugins: "Plugins",
			fielddata: "Field data",
			repositories: "Repositories",
			templates: "Templates",
		};
		return (
				<Dropdown>
					<Dropdown.Toggle variant="success" id="dropdown-basic">
						{viewType.value + " chosen" || "Choose what to view"}
					</Dropdown.Toggle>

					<Dropdown.Menu>
						{Object.keys(viewTypeMapping).map((key) => (
							<Dropdown.Item
								key={key}
								onClick={() => handleViewTypeChange({ key: key, value: viewTypeMapping[key] })}>
								{viewTypeMapping[key]}
							</Dropdown.Item>
						))}
					</Dropdown.Menu>
				</Dropdown>
		)
	}


	const renderdata = () => {
		if (Array.isArray(sortedData) && sortedData.length > 0) {
			return (
				<>
					{sortedData.map((item) => (
						<tr key={item.OrderID}>
							{Object.keys(item).map((key, index) => (
								<td key={index}>
									{typeof item[key] === "object" && item[key] !== null ? (
										renderNestedObject(item[key])
									) : key.toLowerCase().includes("date") && new Date(item[key]).toUTCString() !== "Invalid Date" ? (
										new Date(item[key]).toUTCString()
									) : (
										item[key]
									)}
								</td>
							))}
						</tr>
					))}
				</>
			);
		} else {
			return <h3>No data available</h3>;
		}
	};

	const renderdata2 = () => {
		if (Array.isArray(data) && data.length > 0) {
			return (
				<>
					{data && data.map((item) => (
						<tr key={item.OrderID}>
							{Object.keys(item).map((key, index) => (
								<td key={index}>
										{typeof item[key] === "object" && item[key] !== null ? (
											renderNestedObject(item[key])
										) : key.toLowerCase().includes("date") && new Date(item[key]).toUTCString() !== "Invalid Date" ? (
											new Date(item[key]).toUTCString()
										) : (
											item[key]
										)}
								</td>
							))}
						</tr>
					))}
				</>
			);
		} else {
			return <h3>No data available</h3>;
		}
	};

	const renderNestedObject = (nestedObj) => {
		return (
			<ul>
				{Object.entries(nestedObj).map(([key, value], idx) => (
					<li key={idx}>
						<span>
								<b>{key}</b>:{" "}
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

	const renderSearch = () => {
		if (data && toggleQuery) {
			return (
			<div className="searchForm">
				<Form
					className="bg-opaque"
					onSubmit={submitManagementQuery}
					style={{ width: "400px" }}
				>
					{renderSearchInput(searchKey)}
					{isLoading ? (
					 	<Button>
							<Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
							<span className="visually-hidden">Loading...</span>
					 	</Button>
					 ) : (
						<Button style={{ width: "40%" }} type="submit">
							Submit query
						</Button>
					 )}
					<Button style={{ width: "40%" }} onClick={() => clearSearchTerm()}>
					Clear
					</Button>
				</Form>
				<br />
			</div>
			)
		}
	}


	const renderSearchInput = () => {
		const managementFields = ["method", "amount", "type", "part"];
		const managementMethods = ["create", "insert", "purge", "delete", "reset"];
		const managementAmounts = ["all", "single"]; // When method is "insert", "delete", then required
		const managementTypes = ["index", "template", "data", "document"]; // When method is "create", "delete", then required
		const managementParts = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"]; // When method is "insert", "delete" & amount is "single", then required
		const managementIds = "id"; // When method is "delete" and amount is "single", then required

		return (
			<>
				<Form.Group className="mb-3">
					<Form.Label>Method</Form.Label>
					<Form.Select 
						value={searchTerm.method || ""}
						name="method"
						onChange={handleManagementTypeChange}>
						<option value="">
							None
						</option>
						{managementMethods.map((k) => (
							<option
								key={k}
								value={k}
							>
								{k}
							</option>
						))}
					</Form.Select>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>Amount</Form.Label>
					<Form.Select 
						value={searchTerm.amount || ""}
						name="amount"
						onChange={handleManagementTypeChange}>
						<option value="">
							None
						</option>
						{managementAmounts.map((k) => (
							<option
								key={k}
								value={k}
							>
								{k}
							</option>
						))}
						</Form.Select>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>Type</Form.Label>
					<Form.Select 
						value={searchTerm.type || ""}
						name="type"
						onChange={handleManagementTypeChange}>
						<option value="">
							None
						</option>
						{managementTypes.map((k) => (
							<option
								key={k}
								value={k}
							>
								{k}
							</option>
						))}
						</Form.Select>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>Part</Form.Label>
					<Form.Select 
						value={searchTerm.part || ""}
						name="part"
						onChange={handleManagementTypeChange}>
						<option value="">
							None
						</option>
						{managementParts.map((k) => (
							<option
								key={k}
								value={k}
							>
								{k}
							</option>
						))}
						</Form.Select>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>Id</Form.Label>
					<Form.Control
					type="number"
					name="id"
					value={searchTerm.id || ""} 
					onChange={handleManagementTypeChange} 
					/>
				</Form.Group>
			</>
		);
	};

	const searchButton = () => {
		return (
			<>
				<Button onClick={() => handleQueryToggle()}>Manage opensearch</Button>
				<Button onClick={() => clearSearchTerm()}  disabled={Object.entries(searchTerm).every(([key, value]) => value == null || String(value).trim() === "")}>Clear query</Button>
			</>
		)
	}

	return (
		<div>
			{searchButton()}
			{renderSearch()}
			<br />
			<br />
			{typeChoice()}
			<h1>Manage opensearch</h1>
			<Table responsive hover bordered className="table-striped">
				<thead>
					<tr>
						{data.length > 0 && Object.keys(data[0]).map((key) => (
								<th className="order-by" onClick={() => handleOrderBy(key)}>{key} {renderSortIcon(key)}</th>
							))
						}
					</tr>
				</thead>
				<tbody>{renderdata()}</tbody>
			</Table>
		</div>
	);
};


export default OpensearchAdmin;
