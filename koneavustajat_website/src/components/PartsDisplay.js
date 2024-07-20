import React, { useState, useEffect } from "react";
import { fetchDynamicData } from "../api/api";
import { Button, Container, Table, Form } from "react-bootstrap";

const PartsDisplay = ({ fetchDynamicData }) => {
	const [parts, setParts] = useState([]);
	const [partName, setPartName] = useState("cpu");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);

	const fetchParts = async (page) => {
		setLoading(true);
		try {
			const data = await fetchDynamicData(page, "part", partName);
			setParts(data);
		} catch (error) {
			console.error("Error fetching parts:", error);
			setError(`Error fetching parts: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchParts(page);
	}, [page]);

	const handleSearchTerm = (event) => {
		event.preventDefault();
		setPartName(event.target.value)
	}

	const fetchSearchTermData = async (event) => {
		event.preventDefault();
		try {
			if (partName !== "" && partName !== " " && partName !== undefined && partName !== null) {
				const data = await await fetchDynamicData(page, "part", partName);
				setParts(data);
				setPage(1);
			} else {
				alert("Search term cannot be empty!")
				return;
			}
		} catch (error) {
			alert(`Error while fetching parts: \n${error}`);
			console.error(`Error while fetching parts: \n${error}`);
		}
	};

	const searchParts = () => {
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
	};
		
	const renderParts = () => {
		if (parts.length > 0) {
			return (
				<>
					{parts.map((part) => (
						<tr key={part.ID}>
							<td>ID: {part.ID}</td>
							<td>Name: {part.Name || "Unknown Name"}</td>
							<td>Price:{part.Price || "N/A"}</td>
						</tr>
					))}
					<Button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page <= 1}>
						Previous
					</Button>
					<Button onClick={() => setPage(page + 1)}>Next</Button>
				</>
			);
		}
		if (parts.length === 0 && page > 1) {
			return (
				<>
					<h3>No parts available</h3>
					<Button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page <= 1}>
						Previous
					</Button>
				</>
			);
		}
		if (loading) {
			return <h3>Loading parts...</h3>;
		}
		if (error) {
			return <h3>{error}</h3>;
		}
	};

	return (
		<div>
			<h1>Parts</h1>
			{searchParts()}
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

export default PartsDisplay;
