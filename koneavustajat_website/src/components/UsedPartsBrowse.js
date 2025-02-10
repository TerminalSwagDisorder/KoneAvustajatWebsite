import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { Button, Container, Table, Form, CloseButton } from 'react-bootstrap';
import { useSelector, useDispatch } from "react-redux";
import { addToShoppingCart, removeFromShoppingCart, clearShoppingCart } from "../redux/shoppingCartSlice";
import { addToCompletedBuild, removeFromCompletedBuild, clearCompletedBuild } from "../redux/wizardSlice";
import { useAuth, useError } from "../utils/Contexts";


const UsedPartsBrowse = ({ fetchDynamicData, fetchDataAmount, postDynamicData, updateDynamicData }) => {
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
	const [partName, setPartName] = useState("cpu");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [selectedPart, setSelectedPart] = useState("");
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState(formFieldsDefault);
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

	// On initial page load
	useEffect(() => {
		fetchData();
		handlePagination();

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

	const handleSelectPart = (part) => {
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
			setParts(data);
			//console.log(data);
		} catch (error) {
			displayError(`Error while fetching used parts: ${error}`);
			console.error("Error while fetching used parts:", error);
		}
	};

	const handleSearchTerm = (event) => {
		event.preventDefault();
		setPartName(event.target.value);
	};

	const closeForm = () => {
		setFormFields(formFieldsDefault);
		setCurrentOperation(null);
		setSelectedPart(null);
	};

	const fetchSearchTermData = async (event) => {
		event.preventDefault();
		try {
			if (partName !== "" && partName !== " " && partName !== undefined && partName !== null) {
				const data = await await fetchDynamicData(page, "inventory", partName);
				setParts(data);
				setPage(1);
			} else {
				displayError("Search term cannot be empty!");
				return;
			}
		} catch (error) {
			displayError(`Error while fetching parts: \n${error}`);
			console.error(`Error while fetching parts: \n${error}`);
		}
	};

	const handleInputChange = (event) => {		
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));
	};
	
	const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			const success = await postDynamicData(formFields, "inventory/add");
			if (success) {
				await fetchData();
				await handlePagination();
				closeForm();
			}
		} catch (error) {
			console.error("Error updating credentials:", error);
			displayError(`Error updating credentials: ${error}`);
		}
	};

	/*const searchParts = () => {
		return (
			<div className="searchForm">
				<Form
					onSubmit={fetchSearchTermData}
					style={{ width: "400px" }}
				>
					<Form.Group className="mb-3">
						<Form.Label>Part name</Form.Label>
						<Form.Control
							type="text"
							id="search"
							name="search"
							value={partName}
							onChange={handleSearchTerm}
							/>
					<Button style={{ width: "40%" }} type="submit">
						Search
					</Button>
				</Form.Group>
				</Form>
				<br />
			</div>
		);
	};*/

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
								<Button className="user-select-button" onClick={() => handleAddToCart(part)}>
									Add to Cart
								</Button>
								{/*
									<Button className="user-select-button" onClick={() => handleAddToCompletedBuild(part)}>
										Add to Build
									</Button>
								*/}
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
		{/*searchParts()*/}
		{renderAddForm()}
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
