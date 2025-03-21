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
import { useAuth, useError } from "../utils/Contexts";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import { useRenderContent } from "../utils/ContentUtils";



const ComputerWizardBrowse = ({ fetchDynamicData, fetchDataAmount, updateDynamicData, deleteDynamicData, fetchSearchData }) => {
	const renderContent = useRenderContent();
	const { displayError } = useError();
	const { currentUser } = useAuth();
	const [parts, setParts] = useState([]);
	const [partName, setPartName] = useState({
		key: "cpu",
		value: "Cpu"
	});
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);
	const [selectedPart, setSelectedPart] = useState("");
	const [inputValue, setInputValue] = useState("");
	const [currentOperation, setCurrentOperation] = useState("");
	const [formFields, setFormFields] = useState({});
	const [searchToggle, setSearchToggle] = useState(false);
	const [searchActive, setSearchActive] = useState(false);
	const [searchKey, setSearchKey] = useState("ID");
	const [searchTerm, setSearchTerm] = useState({});
	const [orderBy, setOrderBy] = useState([]);
	const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
	const completedBuild = useSelector((state) => state.wizard.completedBuild);
	const dispatch = useDispatch();

	// On initial page load
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

	useEffect(() => {
		fetchData();
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

	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "part", partName.key, orderBy);
			await handlePagination();

			setParts(data);
			//console.log(data);
		} catch (error) {
			displayError(error);
			console.error(error);
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
				displayError("No valid part operation for submission");
			}
			if (success) {
				await fetchData();
				closeForm();
			}
		} catch (error) {
			displayError(error);
			console.error(error);
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
			
			searchTerm.partName = partName.key;
			
			const data = await fetchSearchData(searchTerm, "part", orderBy);
			
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
	
	const reFetchSearchTermData = async () => {
		try {
			const data = await fetchSearchData(searchTerm, "part", orderBy);

			setSearchActive(true);
			setParts(data);
			setTotalPages(1);
			setPage(1);
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

	const renderPartModification = () => {
		if (currentUser && currentUser.RoleID === 4 && selectedPart && currentOperation === "modify") {
			return (
				<div id="partform" className="partform d-flex justify-content-center align-items-center">
					<Form onSubmit={handleSubmit} className="adminForm border rounded shadow p-4 bg-opaque">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={() => closeForm()} />
						</div>
						<h4 className=" mb-3">
							{renderContent("computerwizard/browse.modifypart.mainheader", "Modify part")}
						</h4>
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
							{renderContent("computerwizard/browse.modifypart.modifysubmit", "Modify part")}
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
						<h4 className=" mb-3">{renderContent("computerwizard/browse.deletepart.mainheader", "Are you sure you want to delete this part?")}</h4>
							<ul>
								<p><b>{renderContent("computerwizard/browse.deletepart.labelparttype", "Part type")}:</b> {partName.value} </p>
								<p><b>{renderContent("computerwizard/browse.deletepart.labelid", "ID")}:</b> {selectedPart.ID} </p>
								<p><b>{renderContent("computerwizard/browse.deletepart.labelname", "Name")}:</b> {selectedPart.Name} </p>
							</ul>
						<Button variant="primary" type="submit">
							{renderContent("computerwizard/browse.deletepart.buttonyes", "Yes")}
						</Button>						
						<Button variant="primary" style={{backgroundColor: "#990000"}} onClick={() => closeForm()}>
							{renderContent("computerwizard/browse.deletepart.buttonno", "No")}
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
					<Dropdown.Toggle variant="success" id="dropdown-basic">
						{renderContent(`computerwizard/browse.partdropdown.${partName.key}`, partName.value) + " " +
							renderContent("computerwizard/browse.partdropdown.chosenpart", "chosen") 
						 	|| renderContent("computerwizard/browse.partdropdown.nopart", "Choose part type")
						}
					</Dropdown.Toggle>

					<Dropdown.Menu>
						{Object.keys(partNameMapping).map((key) => (
							<Dropdown.Item
								key={key}
								onClick={() => handlePartTypeChange({ key: key, value: partNameMapping[key] })}>
								{renderContent(`computerwizard/browse.partdropdown.${key}`, partNameMapping[key])}
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
						{renderContent("computerwizard/browse.table.buttondeletepart", "Delete part")}
					</Button>
					<Button className="user-select-button" onClick={() => handleSelectPart(part, "modify")}>
						{renderContent("computerwizard/browse.table.buttonmodifypart", "Modify part")}
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
						{renderContent("computerwizard/browse.pagination.firstbutton", "First page")}
					</Button>

					<Button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
						{renderContent("computerwizard/browse.pagination.previousbutton", "Previous page")}
					</Button>
					<h3>
						{page} / {totalPages}
					</h3>
					<Button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
						{renderContent("computerwizard/browse.pagination.nextbutton", "Next page")}
					</Button>

					<Button onClick={() => handlePageChange(totalPages)} disabled={page === totalPages}>
						{renderContent("computerwizard/browse.pagination.lastbutton", "Last page")}
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
									{renderContent("computerwizard/browse.table.buttonviewpart", "View part")}
								</Button>
								<Button className="user-select-button" onClick={() => handleAddToCart(part)}>
									{renderContent("computerwizard/browse.table.buttonaddtocart", "Add to Cart")}
								</Button>
								<Button className="user-select-button" onClick={() => handleAddToCompletedBuild(part)}>
									{renderContent("computerwizard/browse.table.buttonaddtobuild", "Add to Build")}
								</Button>
							</td>
						</tr>
					))}
				</>
			);
		} else {
			return <h3>{renderContent("computerwizard/browse.table.noparts", "No parts available")}</h3>;
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
						<h4 className=" mb-3">{renderContent("computerwizard/browse.viewpart.mainheader", "Part details")}</h4>
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
							{renderContent("computerwizard/browse.viewpart.buttonaddtocart", "Add to Cart")}
						</Button>
						<Button className="user-select-button" onClick={() => handleAddToCompletedBuild(selectedPart)}>
							{renderContent("computerwizard/browse.viewpart.buttonaddtobuild", "Add to Build")}
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
						<CiDesktopMouse1 /> {renderContent("computerwizard/browse.choicealert.selectpart", "Select a part to view or add to cart & build.")} {currentUser && currentUser.RoleID === 4 && (renderContent("computerwizard/browse.choicealert.admin", "As admin you are able to modify details."))}
					</Alert>
				</div>
			);
		}
	}
	
	const searchButton = () => {
		return (
			<>
				<Button onClick={() => handleSearchRendering()}>{renderContent("computerwizard/browse.search.togglesearch", "Toggle search")}</Button>
				<Button onClick={() => clearSearchTerm()}  disabled={Object.entries(searchTerm).length === 0}>{renderContent("computerwizard/browse.search.clearsearch", "Clear search")}</Button>
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
							{searchKey || renderContent("computerwizard/browse.search.nosearch", "Choose search type")}
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
						{renderContent("computerwizard/browse.search.searchsubmit", "Search")}
					</Button>
					<Button style={{ width: "40%" }} onClick={() => clearSearchTerm()} disabled={!searchToggle}>
						{renderContent("computerwizard/browse.search.searchclear", "Clear")}
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
						label={renderContent("computerwizard/browse.search.strictsearch", "Strict search")}
						name="strict"
						onChange={handleSearchTerm}
						id="strict"
						checked={Boolean(searchTerm.strict)}
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Check
						type="checkbox"
						label={renderContent("computerwizard/browse.search.invertedsearch", "Inverted search")}
						name="inverted"
						onChange={handleSearchTerm}
						id="inverted"
						checked={Boolean(searchTerm.inverted)}
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>{renderContent("computerwizard/browse.search.maxprice", "Max price")}</Form.Label>
					<Form.Control 
					type="number" 
					id="priceMax"
					name="priceMax"
					value={searchTerm.priceMax || ""} 
					onChange={handleSearchTerm} 
					/>
				</Form.Group>
				<Form.Group className="mb-3">
					<Form.Label>{renderContent("computerwizard/browse.search.minprice", "Min price")}</Form.Label>
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


	return (
		<div>
			{renderPartChoice()}
			{renderPartViewAlert()}
			{renderBasedOnPart()}
			{renderPartModification()}
			{renderPartDeletion()}
			{searchButton()}
			{renderSearch()}
			{renderPagination(page, totalPages)}
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th className="order-by" onClick={() => handleOrderBy("ID")}>{renderContent("computerwizard/browse.table.headerid", "ID")} {renderSortIcon("ID")}</th>
						<th className="order-by" onClick={() => handleOrderBy("Name")}>{renderContent("computerwizard/browse.table.headername", "Name")} {renderSortIcon("Name")}</th>
						<th className="order-by" onClick={() => handleOrderBy("Price")}>{renderContent("computerwizard/browse.table.headerprice", "Price")} {renderSortIcon("Price")}</th>
						<th>{renderContent("computerwizard/browse.table.headeractions", "Actions")}</th>
					</tr>
				</thead>
				<tbody>{renderParts()}</tbody>
			</Table>
		</div>
	);
};

export default ComputerWizardBrowse;
