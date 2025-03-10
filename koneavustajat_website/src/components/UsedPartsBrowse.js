import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button, Container, Table, Form, CloseButton, Dropdown, Alert } from "react-bootstrap";
import { CiDesktopMouse1 } from "react-icons/ci";
import { useSelector, useDispatch } from "react-redux";
import { addToShoppingCart, removeFromShoppingCart, clearShoppingCart } from "../redux/shoppingCartSlice";
import { addToCompletedBuild, removeFromCompletedBuild, clearCompletedBuild } from "../redux/wizardSlice";
import { useAuth, useError } from "../utils/Contexts";


const UsedPartsBrowse = ({ fetchDynamicData, fetchDataAmount, postDynamicData, updateDynamicData, fetchSearchData, deleteDynamicData }) => {
    const { displayError } = useError();
	const { currentUser } = useAuth();
	const formFieldsDefault = {
		PartTypeID: "",
		Name: "",
		Manufacturer: "",
		ModelNumber: "",
		SerialNumber: "",
		Price: "",
		Available: "",
		AdditionalDetails: ""
	};
	const [parts, setParts] = useState([]);
	const [partName, setPartName] = useState({
		key: "",
		value: ""
	});
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [selectedPart, setSelectedPart] = useState("");
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState(formFieldsDefault);
	const [searchToggle, setSearchToggle] = useState(false);
	const [searchActive, setSearchActive] = useState(false);
	const [searchKey, setSearchKey] = useState("ID");
	const [searchTerm, setSearchTerm] = useState({});
	const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
	const completedBuild = useSelector((state) => state.wizard.completedBuild);
	const dispatch = useDispatch();

	const partTypeMapping = {
		1: 'Chassis',
		2: 'Cpu',
		3: 'Cpu cooler',
		4: 'Gpu',
		5: 'Memory',
		6: 'Motherboard',
		7: 'Psu',
		8: 'Storage'
	};

	const partTypeIDMapping = {
		1: "chassis",
		2: "cpu",
		3: "cpu_cooler",
		4: "gpu",
		5: "memory",
		6: "motherboard",
		7: "psu",
		8: "storage"
	};

	const partNameMapping = {
		chassis: "Chassis",
		cpu: "Cpu",
		cpu_cooler: "Cpu cooler",
		gpu: "Gpu",
		memory: "Memory",
		motherboard: "Motherboard",
		psu: "Psu",
		storage: "Storage"
	};

	// On initial page load
	useEffect(() => {
		fetchData();

	}, []);

	// Update run fetchData when pagination changes
	useEffect(() => {
		fetchData();
	}, [page]);

	
/*
	useEffect(() => {
		fetchData();
		handlePagination();
	}, [partName]);

	useEffect(() => {
		fetchParts(page, "inventory");     //Error????
	}, [page]);
*/
	const formatString = str => str.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, c => c.toUpperCase());

	const handleAddToCart = (item) => {
		const newItem = {
			...item,
			table: "usedParts",
			quantity: 1 // Set default quantity to 1
		};
		dispatch(addToShoppingCart(newItem));
	};

	const handleAddToCompletedBuild = (item) => {
		const newItem = {
			...item,
			table: "usedParts",
		};
		dispatch(addToCompletedBuild(newItem));
	};

	const handlePagination = async () => {
		const dataCount = await fetchDataAmount("part_inventory");
		setTotalPages(dataCount.index);
	};

	const handlePageChange = (newPage) => {
		setPage(newPage);
	};

	const handleSelectPart = (part, operation) => {
		setFormFields({});
		setCurrentOperation(operation);
		setSelectedPart(part);
		window.scrollTo(0, 180);
	};

	const handleAddPart = (operation) => {
		setFormFields(formFieldsDefault);
		setCurrentOperation(operation);
	};

	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "inventory");
			await handlePagination();
			setParts(data);
			//console.log(data);
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


	const closeForm = () => {
		setFormFields(formFieldsDefault);
		setCurrentOperation(null);
		setSelectedPart(null);
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
			
			const data = await fetchSearchData(searchTerm, "inventory");
			
			if (!data || data.length === 0) {
				displayError("No data found using this search term!");
				return;
			}

			setSearchActive(true);
			setParts(data);
			setTotalPages(1);
			setPage(1);
			displayError(`Found ${data.length} items from the search.`, "success");

		} catch (error) {
			displayError(error);
			console.error(error);
		}
	};

	const clearSearchTerm = async () => {
		try {
			setSearchActive(false);
			if (searchTerm) setSearchTerm({});
			//setSearchToggle(false);
			await fetchData();
		} catch (error) {
			displayError(error);
		}
	};

	const handleInputChange = (event) => {		
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));

		if (event.target.name === "PartID") {
			let partId = parseInt(event.target.value, 10);

			if (partId < parts[0].PartID) {
				partId = parts[parts.length - 1].PartID;
			}
			if (partId > parts[parts.length - 1].PartID) {
				partId = parts[0].PartID;
			}

			let selectedPart = parts.find((part) => part.PartID === partId);
			console.log(selectedPart);
			if (selectedPart === undefined || typeof selectedPart !== "object" || typeof selectedPart === "undefined") {
				selectedPart = {
					PartID: partId,
					Name: "Not a part",
					Error: "Invalid part: Inventory part with the PartID does not exist"
				};
			}
			setCurrentOperation("view");
			setSelectedPart(selectedPart);
		}
	};
	
	const handleSubmit2 = async (event) => {
		event.preventDefault();
		try {
			const success = await postDynamicData(formFields, "inventory/add");
			if (success) {
				await fetchData();
				closeForm();
				displayError("Item added successfully!", "success");
			}
		} catch (error) {
			displayError(error);
			console.error(error);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			let success = false;
			if (currentOperation === "add") {
				success = await postDynamicData(formFields, "inventory/add");
			} else if (currentOperation === "modify") {
				success = await updateDynamicData(formFields, "inventory/update", null, selectedPart.PartID);
			} else if (currentOperation === "delete") {
				success = await deleteDynamicData("inventory/delete", null, selectedPart.PartID);
			} else {
				console.error("No valid part operation for submission");
				displayError("No valid part operation for submission");
			}
			if (success) {
				const operationMessages = {
					add: "added",
					modify: "modified",
					delete: "deleted"
				};
				await fetchData();
				closeForm();
				displayError(`Item ${operationMessages[currentOperation] || "invalid operation"} successfully!`, "success");
			}
		} catch (error) {
			displayError(error);
			console.error(error);
		}
	};

	const handlePartTypeChange = (event) => {
		const selectedKey = event.target.value;
		const selectedValue = partNameMapping[selectedKey] || {};							
		handleSearchTerm(event);
		setPartName({ key: selectedKey, value: selectedValue });
	};

	const renderPartModification = () => {
		if (currentUser && currentUser.RoleID === 4 && selectedPart && currentOperation === "modify") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Modify part</h4>
						{Object.keys(selectedPart).map((key, index) => (
							<ul key={index}>
									<b>{key}</b>:{" "}
									{key === "PartID" ? (
										selectedPart[key]
									) : key === "PartTypeID" ? (
										<Form.Group className="mb-3">
											<Form.Select 
												value={formFields.PartTypeID || selectedPart.PartTypeID}
												name="PartTypeID"
												onChange={handleInputChange}>
												<option value="">
													None
												</option>
												{Object.keys(partTypeMapping).map((k) => (
													<option
														key={k}
														value={k}
													>
														{partTypeMapping[k]}
													</option>
												))}
											</Form.Select>
										</Form.Group>
									) : key === "Price" ? (
										<Form.Group className="mb-3">
											<Form.Control
												type="number"
												step={0.01}
												min={0}
												placeholder={selectedPart[key]}
												name={key}
												onChange={handleInputChange}
											/>
										</Form.Group>
									) : (
										<Form.Group className="mb-3">
											<Form.Control
												type="text"
												placeholder={selectedPart[key]}
												name={key}
												onChange={handleInputChange}
											/>
										</Form.Group>
									)}
							</ul>
						))}
						<Button variant="primary" type="submit">
							Modify part
						</Button>
					</Form>
				</div>
			);
		}
	};

	const renderPartDeletion = () => {
		if (currentUser && currentUser.RoleID === 4 && selectedPart && currentOperation === "delete") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Are you sure you want to delete this part from the inventory?</h4>
							<ul>
								<p><b>Part type:</b> {partName.value} </p>
								<p><b>ID:</b> {selectedPart.PartID} </p>
								<p><b>Name:</b> {selectedPart.Name} </p>
								<p><b>Name:</b> {selectedPart.SerialNumber} </p>
							</ul>
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

	const renderBasedOnPart = () => {
		if (selectedPart && currentOperation === "view") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Part details</h4>
						{Object.keys(selectedPart).map((key, index) => (
							<ul key={index}>
								<li>
									<b>{key}</b>:{" "}
									{selectedPart[key]}
								</li>
							</ul>
						))}
						<Button className="user-select-button" onClick={() => handleAddToCart(selectedPart)}>
							Add to Cart
						</Button>
					</Form>
				</div>
			);
		}
	};

	const renderPartViewAlert = () => {
		if (!currentOperation || !selectedPart) {
			return (
				<div className="userChangePrompt">
					<Alert>
						<CiDesktopMouse1 /> Select a part to view or add to cart. {currentUser && currentUser.RoleID === 4 && ("As admin you are able to modify details.")}
					</Alert>
				</div>
			);
		}
	}

	const renderAdminButtons = (part) => {
		if (currentUser && currentUser.RoleID === 4) {
			return (
				<>
					<Button className="user-select-button" onClick={() => handleSelectPart(part, "delete")}>
						Delete part
					</Button>
					<Button className="user-select-button" onClick={() => handleSelectPart(part, "modify")}>
						Modify part
					</Button>
				</>
			);
		}
		
	};

	const searchButton = () => {
		return (
			<>
				<Button onClick={() => handleSearchRendering()}>Toggle search</Button>
				<Button onClick={() => clearSearchTerm()} disabled={Object.entries(searchTerm).length === 0}>Clear search</Button>
			</>
		)
	}

	const renderSearch = () => {
		// "strict", "priceMin", "priceMax", "priceRange", "inverted"
		if (searchToggle && parts) {
			//const searchTerms = Object.keys(parts[0]).map((key) => key);
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
							{Object.keys(parts[0] || {}).map((key) => (
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

				{key === "PartTypeID" ? (
					<>
						<br />
						<Form.Select 
							value={searchTerm.partName || ""}
							name="partName"
							onChange={handlePartTypeChange}>
							<option value="">
								None
							</option>
							{Object.keys(partNameMapping).map((k) => (
								<option
									key={k}
									value={k}
								>
									{partNameMapping[k]}
								</option>
							))}
						</Form.Select>
						<br />
						<br />
					</>
				) : (
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

				)}
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
					<Form.Label>Max price</Form.Label>
					<Form.Control 
					type="number" 
					id="priceMax"
					name="priceMax"
					value={searchTerm.priceMax || ""} 
					onChange={handleSearchTerm} 
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>Min price</Form.Label>
					<Form.Control 
					type="number" 
					id="priceMin"
					name="priceMin"
					value={searchTerm.priceMin || ""} 
					onChange={handleSearchTerm} 
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>Max available</Form.Label>
					<Form.Control 
					type="number" 
					id="availableMax"
					name="availableMax"
					value={searchTerm.availableMax || ""} 
					onChange={handleSearchTerm} 
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>Min available</Form.Label>
					<Form.Control 
					type="number" 
					id="availableMin"
					name="availableMin"
					value={searchTerm.availableMin || ""} 
					onChange={handleSearchTerm} 
					/>
				</Form.Group>
			</>
		);
	};


const renderAddForm = () => {
	if (currentUser && currentUser.RoleID === 4 && currentOperation !== "add") {
		return (
			<Button className="user-select-button" onClick={() => handleAddPart("add")}>
				Add new part
			</Button>
		);
	} else if (currentUser && currentUser.RoleID === 4 && currentOperation === "add") {
		return (
			<div id="partform" className="partform d-flex justify-content-center align-items-center">
				<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
					<div className="d-flex justify-content-end mb-3">
						<CloseButton onClick={() => closeForm()} />
					</div>
					<h4 className="mb-3">Add part</h4>
					{Object.entries(formFields).map(([key, value]) => 
						<Form.Group key={key} className="mb-3">
						{key === "PartTypeID" ? (
							<Form.Select key={key} name="PartTypeID" value={formFields.PartTypeID} onChange={handleInputChange}>
								<option value="">Select part type</option>
								{partTypeIDMapping && Object.keys(partTypeIDMapping).length > 0 ? (
									Object.entries(partTypeIDMapping).map(([k, v]) => (
										<option key={k} value={k}>
											{formatString(v)}
										</option>
									))
								) : (
									<option value="">No part types available</option>
								)}
							</Form.Select>
						) : key === "Price" ? (
							<Form.Control
								key={key}
								type="number"
								step={0.01}
								min={0}
								placeholder={`Enter new ${formatString(key)}`}
								name={key}
								value={value}
								onChange={handleInputChange}
							/>
						) : (
							<Form.Control
								key={key}
								type="text"
								placeholder={`Enter new ${formatString(key)}`}
								name={key}
								value={value}
								onChange={handleInputChange}
							/>
						)}
						</Form.Group>
					   )}
						
					<Button variant="primary" type="submit">
						Add part to inventory
					</Button>
				</Form>
			</div>
		);
	}
};

	const renderPagination = (page, totalPages) => {
		return (
			<>
			<div className="paginationButtons">
				<Button onClick={() => handlePageChange(1)} disabled={page === 1}>First page</Button>

				<Button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Previous page</Button>
				<h3>{page} / {totalPages}</h3>
				<Button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Next page</Button>

				<Button onClick={() => handlePageChange(totalPages)} disabled={page === totalPages}>Last page</Button>
			</div>
			</>
		)
	};

	const renderParts = () => {
		if (Array.isArray(parts) && parts.length > 0) {
			return (
				<>
					{parts.map((part) => (
						<tr key={part.PartID}>
							<td> {part.PartID}</td>
							<td> {part.Name || "Unknown Name"}</td>
							<td> {part.Price || "N/A"} €</td>
							<td> {partTypeMapping[part.PartTypeID]  || "Unknown Type"}</td> 
							<td>
								{renderAdminButtons(part)}
								<Button className="user-select-button" onClick={() => handleSelectPart(part, "view")}>
									View part
								</Button>
								<Button className="user-select-button" onClick={() => handleAddToCart(part)}>
									Add to Cart
								</Button>
							</td>
						</tr>
					))}
				</>
			);
		} else {
		return <h3>No parts available</h3>;  
		}
	};

    return (
		<div>
		<h1>Used Parts</h1>
		{renderPartViewAlert()}
		{renderBasedOnPart()}
		{renderPartModification()}
		{renderPartDeletion()}
		{renderAddForm()}
		{searchButton()}
		{renderSearch()}
		{renderPagination(page, totalPages)}
		<Table responsive="md" hover bordered className="table-striped">
			<thead>
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>Price</th>
					<th>Part Type</th> 
					<th>Actions</th> 

				</tr>
			</thead>
			<tbody>{renderParts()}</tbody>
		</Table>

        </div>
    );
};

export default UsedPartsBrowse;
