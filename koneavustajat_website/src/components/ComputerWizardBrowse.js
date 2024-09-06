import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button, Container, Table, Form, Dropdown } from "react-bootstrap";

const ComputerWizardBrowse = ({ fetchDynamicData, fetchDataAmount }) => {
	const [parts, setParts] = useState([]);
	const [partName, setPartName] = useState("cpu");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);

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

	const handlePagination = async () => {
		const dataCount = await fetchDataAmount(partName);
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
			const data = await fetchDynamicData(page, "part", partName);
			setParts(data);
			//console.log(data);
		} catch (error) {
			console.error("Error while fetching parts:", error);
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
						{partName + " chosen" || "Choose Part type"}
					</Dropdown.Toggle>

					<Dropdown.Menu>
						{Object.keys(partNameMapping).map((key) => (
							<Dropdown.Item key={key} onClick={() => handlePartTypeChange(key)}>
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
						<tr key={part.ID}>
							<td> {part.ID}</td>
							<td> {part.Name}</td>
							<td> {part.Price} €</td>
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
			{renderPartChoice()}
			{renderPagination(page, totalPages)}
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Price</th>
					</tr>
				</thead>
				<tbody>{renderParts()}</tbody>
			</Table>
		</div>
	);
};

export default ComputerWizardBrowse;
