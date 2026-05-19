import React, { useState, useEffect } from "react";
import { fetchDynamicData } from "../api/api";
import { Button, Container, Table, Form } from "react-bootstrap";
import { useError } from "../utils/Contexts";
import { useRenderContent } from "../utils/ContentUtils";

const PartsDisplay = ({ fetchDynamicData }) => {
	const renderContent = useRenderContent();
	const { displayError } = useError();
	const [parts, setParts] = useState([]);
	const [partName, setPartName] = useState("cpu");
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);

	const fetchParts = async (page) => {
		setLoading(true);
		try {
			const data = await fetchDynamicData(page, "part", partName);
			setParts(data);
		} catch (error) {
			displayError(error);
			console.error(error);
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
				displayError("Search term cannot be empty!")
				return;
			}
		} catch (error) {
			displayError(error);
			console.error(error);
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
						<Form.Label>{renderContent("partsdisplay.label.part_name", "Part name")}</Form.Label>
						<Form.Control
							type="text"
							id="search"
							name="search"
							value={partName}
							onChange={handleSearchTerm}
						/>
						<Button style={{ width: "40%" }} type="submit">
							{renderContent("partsdisplay.button.search", "Search")}
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
							<td>{renderContent("partsdisplay.table.id", "ID")}: {part.ID}</td>
							<td>{renderContent("partsdisplay.table.name", "Name")}: {part.Name || "Unknown Name"}</td>
							<td>{renderContent("partsdisplay.table.price", "Price")}: {part.Price || "N/A"} €</td>
						</tr>
					))}
					<Button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page <= 1}>
						{renderContent("partsdisplay.button.previous", "Previous")}
					</Button>
					<Button onClick={() => setPage(page + 1)}>{renderContent("partsdisplay.button.next", "Next")}</Button>
				</>
			);
		}
		if (parts.length === 0 && page > 1) {
			return (
				<>
					<h3>{renderContent("partsdisplay.section.no_parts", "No parts available")}</h3>
					<Button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page <= 1}>
						{renderContent("partsdisplay.button.previous", "Previous")}
					</Button>
				</>
			);
		}
		if (loading) {
			return <h3>{renderContent("partsdisplay.section.loading", "Loading parts...")}</h3>;
		}
	};

	return (
		<div>
			<h1>{renderContent("partsdisplay.title.parts", "Parts")}</h1>
			{searchParts()}
			<Table responsive="md" hover bordered className="table-striped">
				<thead>
					<tr>
						<th>{renderContent("partsdisplay.table.id", "ID")}</th>
						<th>{renderContent("partsdisplay.table.name", "Name")}</th>
						<th>{renderContent("partsdisplay.table.price", "Price")}</th>
					</tr>
				</thead>
				<tbody>{renderParts()}</tbody>
			</Table>
		</div>
	);
};

export default PartsDisplay;
