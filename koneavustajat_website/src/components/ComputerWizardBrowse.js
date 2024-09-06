import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button, Container, Table, Form, Dropdown, Alert, CloseButton, OverlayTrigger, Tooltip, Image } from "react-bootstrap";
import { ciDesktopMouse1 } from "react-icons/ci";
import { FaUserEdit } from "react-icons/fa";

const ComputerWizardBrowse = ({ fetchDynamicData, fetchDataAmount }) => {
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

	const closeForm = () => {
		setSelectedPart(null);
		//setFormFields({});
	};

	const handleSelectPart = (part) => {
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

	const handleInputChange = (event) => {
		setInputValue(event.target.value);
		/*
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value,
		}));
		*/
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
					Error: "InvalID part: User with the ID does not exist"
				};
			}
			setSelectedPart(selectedPart);
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
							<Dropdown.Item key={key} onClick={() => handlePartTypeChange({key: key, value: partNameMapping[key]})}>
								
								{partNameMapping[key]}
							</Dropdown.Item>
						))}
					</Dropdown.Menu>
				</Dropdown>
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
								<a className="user-select-button" onClick={() => handleSelectPart(part)}>
									View part
								</a>
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
		if (selectedPart) {
			return (
				<div ID="partform" className="d-flex justify-content-center align-items-center">
					<Form className="adminForm border rounded shadow p-4 bg-opaque" style={{ wIDth: "400px" }}>
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
										<Image src={process.env.PUBLIC_URL + "/product_images/" + selectedPart[key]} alt={key} style={{ width: "100px", height: "auto" }} />
									) : (
										selectedPart[key]
									)}
								</li>
							</ul>
						))}
					</Form>
				</div>
			);
		} else {
			return (
				<div className="userChangePrompt">
					<Alert>
						<ciDesktopMouse1 /> Select a part to view details.
					</Alert>
				</div>
			);
		}
	};

	return (
		<div>
			{renderPartChoice()}
			{renderBasedOnPart()}
			{renderPagination(page, totalPages)}
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Price</th>
						<th>View</th>
					</tr>
				</thead>
				<tbody>{renderParts()}</tbody>
			</Table>
		</div>
	);
};

export default ComputerWizardBrowse;
