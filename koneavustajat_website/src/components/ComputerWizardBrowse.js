import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
import { CiDesktopMouse1 } from "react-icons/ci";
import { FaUserEdit } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { addToShoppingCart, removeFromShoppingCart, clearShoppingCart } from "../redux/shoppingCartSlice";
import { addToCompletedBuild, removeFromCompletedBuild, clearCompletedBuild } from "../redux/wizardSlice";
import { useAuth } from "../utils/Contexts";


const ComputerWizardBrowse = ({ fetchDynamicData, fetchDataAmount, updateDynamicData, deleteDynamicData }) => {
	const { currentUser } = useAuth();
	const [parts, setParts] = useState([]);
	const [partName, setPartName] = useState({
		key: "cpu",
		value: "Cpu"
	});
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [selectedPart, setSelectedPart] = useState("");
	const [inputValue, setInputValue] = useState("");
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
	const completedBuild = useSelector((state) => state.wizard.completedBuild);
	const dispatch = useDispatch();

	// On initial page load
	useEffect(() => {
		fetchData();
		handlePagination();
	}, []);

	// Update run fetchData when pagination changes
	useEffect(() => {
		fetchData();
	}, [page]);

	useEffect(() => {
		fetchData();
		handlePagination();
	}, [partName]);

	const handleAddToCart = (item) => {
		const newItem = {
			...item,
			table: partName.key,
			quantity: 1 // Set default quantity to 1
		};
		dispatch(addToShoppingCart(newItem));
	};

	const handleAddToCompletedBuild = (item) => {
		const newItem = {
			partData: item,
			table: partName.key,
		};
		console.log(newItem);
		dispatch(addToCompletedBuild(newItem));
	};

	const closeForm = () => {
		setFormFields({});
		setCurrentOperation(null);
		setSelectedPart(null);
		//setFormFields({});
	};

	const handleSelectPart = (part, operation) => {
		setFormFields({});
		setCurrentOperation(operation);
		setSelectedPart(part);
		window.scrollTo(0, 180);
	};

	const handlePagination = async () => {
		const dataCount = await fetchDataAmount(partName.key);
		setTotalPages(dataCount.index);
	};

	const handlePageChange = (newPage) => {
		setPage(newPage);
	};

	const handlePartTypeChange = (value) => {
		setPartName(value);
		setPage(1);
	};

	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "part", partName.key);
			setParts(data);
			//console.log(data);
		} catch (error) {
			console.error("Error while fetching parts:", error);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			let success;
			if (currentOperation === "modify") {
				success = await updateDynamicData(formFields, "part/update", partName.key, selectedPart.ID);
			} else if (currentOperation === "delete") {
				success = await deleteDynamicData("part", partName.key, selectedPart.ID);
			} else {
				console.error("No valid part operation for submission");
				alert("No valid part operation for submission");
			}
			if (success) {
				await fetchData();
				closeForm();
				setFormFields({});
			}
		} catch (error) {
			console.error("Error modifying data:", error);
			alert("Error modifying data.");
		}
	};

	const handleInputChange = (event) => {
		setInputValue(event.target.value);
		
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));
		
		if (event.target.ID === "ID") {
			let partId = parseInt(event.target.value, 10);

			if (partId < parts[0].ID) {
				partId = parts[parts.length - 1].ID;
			}
			if (partId > parts[parts.length - 1].ID) {
				partId = parts[0].ID;
			}

			let selectedPart = parts.find((part) => part.ID === partId);
			console.log(selectedPart);
			if (selectedPart === undefined || typeof selectedPart !== "object" || typeof selectedPart === "undefined") {
				selectedPart = {
					ID: partId,
					Name: "Not a part",
					Error: "Invalid part: Part with the ID does not exist"
				};
			}
			setCurrentOperation("view");
			setSelectedPart(selectedPart);
		}
	};

	const renderPartModification = () => {
		if (currentUser && currentUser.RoleID === 4 && selectedPart && currentOperation === "modify") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque" style={{ wIDth: "400px" }}>
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">Modify part</h4>
						{Object.keys(selectedPart).map((key, index) => (
							<ul key={index}>
									<b>{key}</b>:{" "}
									{key === "Url" || key === "Image_Url" ? (
										<a href={selectedPart[key]} target="_blank" rel="noopener noreferrer">
											{selectedPart[key]}
										</a>
									) : key === "Image" ? (
										<Image
											src={process.env.PUBLIC_URL + "/product_images/" + selectedPart[key]}
											alt={key}
											style={{ width: "100px", height: "auto" }}
										/>
									) : key === "ID" ? (
										selectedPart[key]
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
						<h4 className=" mb-3">Are you sure you want to delete this part?</h4>
							<ul>
								<p><b>Part type:</b> {partName.value} </p>
								<p><b>ID:</b> {selectedPart.ID} </p>
								<p><b>Name:</b> {selectedPart.Name} </p>
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

	const renderPartChoice = () => {
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

		return (
			<>
				<Dropdown>
					<Dropdown.Toggle variant="success" ID="dropdown-basic">
						{partName.value + " chosen" || "Choose Part type"}
					</Dropdown.Toggle>

					<Dropdown.Menu>
						{Object.keys(partNameMapping).map((key) => (
							<Dropdown.Item
								key={key}
								onClick={() => handlePartTypeChange({ key: key, value: partNameMapping[key] })}>
								{partNameMapping[key]}
							</Dropdown.Item>
						))}
					</Dropdown.Menu>
				</Dropdown>
			</>
		);
	};

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

	const renderParts = () => {
		if (Array.isArray(parts) && parts.length > 0) {
			return (
				<>
					{parts.map((part) => (
						<tr key={part.ID}>
							<td> {part.ID}</td>
							<td> {part.Name}</td>
							<td> {part.Price} €</td>
							<td>
								{renderAdminButtons(part)}
								<Button className="user-select-button" onClick={() => handleSelectPart(part, "view")}>
									View part
								</Button>
								<Button className="user-select-button" onClick={() => handleAddToCart(part)}>
									Add to Cart
								</Button>
								<Button className="user-select-button" onClick={() => handleAddToCompletedBuild(part)}>
									Add to Build
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
									{key === "Url" || key === "Image_Url" ? (
										<a href={selectedPart[key]} target="_blank" rel="noopener noreferrer">
											{selectedPart[key]}
										</a>
									) : key === "Image" ? (
										<Image
											src={process.env.PUBLIC_URL + "/product_images/" + selectedPart[key]}
											alt={key}
											style={{ width: "100px", height: "auto" }}
										/>
									) : (
										selectedPart[key]
									)}
								</li>
							</ul>
						))}
						<Button className="user-select-button" onClick={() => handleAddToCart(selectedPart)}>
							Add to Cart
						</Button>
						<Button className="user-select-button" onClick={() => handleAddToCompletedBuild(selectedPart)}>
							Add to Build
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
						<CiDesktopMouse1 /> Select a part to view or add to cart & build. {currentUser && currentUser.RoleID === 4 && ("As admin you are able to modify details.")}
					</Alert>
				</div>
			);
		}
	}

	return (
		<div>
			{renderPartChoice()}
			{renderPartViewAlert()}
			{renderBasedOnPart()}
			{renderPartModification()}
			{renderPartDeletion()}
			{renderPagination(page, totalPages)}
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Price</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>{renderParts()}</tbody>
			</Table>
		</div>
	);
};

export default ComputerWizardBrowse;
