import React, { useState, useEffect } from "react";
import { Link, Outlet } from 'react-router-dom';
import { Button, Container, Table, Form } from 'react-bootstrap';
import { FaSearch, FaShoppingCart, FaWrench, FaEdit } from 'react-icons/fa'; 
import { fetchDynamicData } from "../api/api";


const UsedParts = () => {

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


	const [parts, setParts] = useState([]);
	const [partName, setPartName] = useState("cpu");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);

    const fetchParts = async (page, tableName = "inventory") => {
        setLoading(true);
        try {
            const data = await fetchDynamicData(page, tableName, partName);     //Error????
            setParts(data);
        } catch (error) {
            console.error("Error fetching parts:", error);
            setError(`Error fetching parts: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    

	useEffect(() => {
		fetchParts(page, "inventory");     //Error????
	}, [page]);

	const handleSearchTerm = (event) => {
		event.preventDefault();
		setPartName(event.target.value)
	}

	const fetchSearchTermData = async (event) => {
		event.preventDefault();
		try {
			if (partName !== "" && partName !== " " && partName !== undefined && partName !== null) {
				const data = await await fetchDynamicData(page, "inventory", partName);
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
					<Button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page <= 1}>
						Previous
					</Button>
					<Button onClick={() => setPage(page + 1)}>Next</Button>
				</>
			);
		} else if (Array.isArray(parts) && parts.length === 0 && page > 1) {
		return (
			<>
				<h3>No parts available</h3>
				<Button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page <= 1}>
					Previous
				</Button>
			</>
		);
		} else if (loading) {
		return <h3>Loading parts...</h3>;
		} else if (error) {
		return <h3>{error}</h3>;
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

        <div className="mt-4 topButtons">
            <Link to="/usedparts/browse">
                <Button className="usedPartsButton" style={{ width: "100%" }}>
                    Browse &nbsp;
                    <FaSearch />
                </Button>
            </Link>
            <Link to="/usedparts/purchase">
                <Button className="usedPartsButton" style={{ width: "100%" }}>
                    Purchase &nbsp;
                    <FaShoppingCart />
                </Button>
            </Link>
            <Link to="/usedparts/build">
                <Button className="usedPartsButton" style={{ width: "100%" }}>
                    Build &nbsp;
                    <FaWrench />
                </Button>
            </Link>
            <Link to="/usedparts/modify">
                <Button className="usedPartsButton" style={{ width: "100%" }}>
                    Modify Used Parts &nbsp;
                    <FaEdit />
                </Button>
            </Link>


        </div>

            <Outlet />
        </div>
    );
};



export default UsedParts;

