import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { Button, Container, Table, Form } from 'react-bootstrap';

const UsedPartsBrowse = ({ fetchDynamicData, fetchDataAmount }) => {
	const [parts, setParts] = useState([]);
	const [partName, setPartName] = useState("cpu");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [totalPages, setTotalPages] = useState(0);
	const [page, setPage] = useState(1);

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

	// On initial page load
	useEffect(() => {
		fetchData();
		handlePagination();

	}, []);

	// Update run fetchData when pagination changes
	useEffect(() => {
		fetchData(page);
	}, [page]);

/*
	useEffect(() => {
		fetchParts(page, "inventory");     //Error????
	}, [page]);
*/
	
	const handlePagination = async () => {
		const dataCount = await fetchDataAmount("part_inventory");
		setTotalPages(dataCount.index);
	};

	const handlePageChange = (newPage) => {
		setPage(newPage);
	};

	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(page, "inventory", partName);
			setParts(data);
			//console.log(data);
		} catch (error) {
			console.error("Error while fetching medUsers:", error);
		}
	};

	const handleSearchTerm = (event) => {
		event.preventDefault();
		setPartName(event.target.value);
	};

	const fetchSearchTermData = async (event) => {
		event.preventDefault();
		try {
			if (partName !== "" && partName !== " " && partName !== undefined && partName !== null) {
				const data = await await fetchDynamicData(page, "inventory", partName);
				setParts(data);
				setPage(1);
			} else {
				alert("Search term cannot be empty!");
				return;
			}
		} catch (error) {
			alert(`Error while fetching parts: \n${error}`);
			console.error(`Error while fetching parts: \n${error}`);
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

	const renderPagination = (page, totalPages) => {
		return (
			<>
			<div className="paginationButtons">
				<Button onClick={() => handlePageChange(1)} disabled={page === 1}>First page</Button>

				<Button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Previous page</Button>
				<h3> {page} / {totalPages} </h3>
				<Button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Next page</Button>

				<Button onClick={() => handlePageChange(totalPages)} disabled={page === totalPages}>Last page</Button>
			</div>
			</>
		)
	}

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
						</tr>
					))}
					{renderPagination(page, totalPages)}
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
		<Table responsive="md" hover bordered className="table-striped">
			<thead>
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>Price</th>
					<th>Part Type</th> 

				</tr>
			</thead>
			<tbody>{renderParts()}</tbody>
		</Table>

        </div>
    );
};

export default UsedPartsBrowse;
