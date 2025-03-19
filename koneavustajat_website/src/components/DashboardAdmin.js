import React, { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { LiaSchoolSolid } from "react-icons/lia";
import { Container, Row, Col, Card, Table, Badge, ListGroup, Button, Spinner, Modal, CloseButton } from "react-bootstrap";
import { FaUsers, FaUserShield, FaTools, FaBoxOpen, FaCheckCircle, FaUsersCog } from "react-icons/fa";
import { useAuth, useError } from "../utils/Contexts";

const DashboardAdmin = ({ fetchDynamicData }) => {
	const { currentUser } = useAuth();
	const { displayError } = useError();

	const [dashboardData, setDashboardData] = useState(null);
	const [pendingTasks, setPendingTasks] = useState([]);
	const [tasksIsset, setTasksIsset] = useState(false);
	const [indices, setIndices] = useState([]);
	const [allocation, setAllocation] = useState([]);
	const [counts, setCounts] = useState([]);
	const [summary, setSummary] = useState({});
	const [isOpen, setIsOpen] = useState(false);

	const fetchData = async () => {
		try {
			const data = await fetchDynamicData(null, "admin/dashboard", null);
			setDashboardData(data);
		} catch (error) {
			displayError(error.message || error);
		}
	};
	
	useEffect(() => {
		fetchData();
	}, []);	

	useEffect(() => {
		if (dashboardData) {
			setPendingTasks(dashboardData[0]);
			setTasksIsset(true);
			setIndices(dashboardData[1]);
			setAllocation(dashboardData[2]);
			setCounts(dashboardData[3]);
		}
	}, [dashboardData]);

	useEffect(() => {
		if (counts) {
			setSummary(counts[0]);
		}
	}, [counts]);
	
	const openModal = () => {
		setIsOpen(true);
	};

	const closeModal = () => {
		setIsOpen(false);
	};
	
	const partModal = () => {
		const allowedKeys = [
			"total_part_inventory",
			"total_chassis",
			"total_cpu",
			"total_cpu_cooler",
			"total_gpu",
			"total_motherboard",
			"total_memory",
			"total_storage",
			"total_psu"
		];
		const titleMapping = {
			total_part_inventory: "Part inventory",
			total_chassis: "Chassis",
			total_cpu: "CPUs",
			total_cpu_cooler: "Cpu coolers",
			total_gpu: "GPUs",
			total_motherboard: "Motherboards",
			total_memory: "Memory modules",
			total_storage: "Storage drives",
			total_psu: "PSUs"
		};
		if (isOpen) {
			return (
			<Modal show={isOpen} onHide={closeModal} centered className="cms-modal">
				<Modal.Header>
					<Modal.Title>All parts</Modal.Title>
					<CloseButton onClick={() => closeModal()} />
				</Modal.Header>
				<Modal.Body>
					{summary ? (
					<Card className="text-center shadow-sm">
						<Card.Body>
						<FaBoxOpen size={32} className="mb-2" />
						{Object.entries(summary).map(([key, val]) => allowedKeys.includes(key) && (
							<>
								<Card.Title>Total {titleMapping[key]}</Card.Title>
								<Card.Text>{val}</Card.Text>
							</>
						))}
						</Card.Body>
					</Card>
					 ) : (
						<Spinner as="span" animation="border" size="lg" role="status" aria-hidden="true" />
					 )}
				</Modal.Body>
			</Modal>
			);
		}
		
	};
	
	const navigationLinks = () => {
		return (
			<Row className="mb-4">
				<Col>
					<div className="d-flex flex-wrap gap-2 justify-content-center">
						<Link to="/admin/users">
							<Button variant="primary" className="adminDashboardButton">Users</Button>
						</Link>
						<Link to="/admin/orders">
							<Button variant="primary" className="adminDashboardButton">Orders</Button>
						</Link>
						<Link to="/admin/email-transactions">
							<Button variant="primary" className="adminDashboardButton">Email Transactions</Button>
						</Link>
						<Link to="/admin/opensearch">
							<Button variant="primary" className="adminDashboardButton">OpenSearch</Button>
						</Link>
						<Link to="/computerwizard/browse">
							<Button variant="primary" className="adminDashboardButton">Modify Parts</Button>
						</Link>
						<Link to="/usedparts">
							<Button variant="primary" className="adminDashboardButton">Modify Used Parts</Button>
						</Link>
					</div>
				</Col>
			</Row>
		)
	}
	
	const renderSummary = () => {
		return (
			<Row className="mb-4">
				<Col md={3}>
					<Card className="text-center shadow-sm">
						<Card.Body>
							<FaUsers size={32} className="mb-2" />
							<Card.Title>Total Users</Card.Title>
							{summary && Object.entries(summary).length !== 0 ? <Card.Text>{summary.total_users}</Card.Text> : <Spinner as="span" animation="border" size="lg" role="status" aria-hidden="true" />}
						</Card.Body>
					</Card>
				</Col>
				<Col md={3}>
					<Card className="text-center shadow-sm">
						<Card.Body>
							<FaUsers size={32} className="mb-2" />
							<Card.Title>Total Customers</Card.Title>
							{summary && Object.entries(summary).length !== 0 ? <Card.Text>{summary.total_customers}</Card.Text> : <Spinner as="span" animation="border" size="lg" role="status" aria-hidden="true" />}
						</Card.Body>
					</Card>
				</Col>
				<Col md={3}>
					<Card className="text-center shadow-sm">
						<Card.Body>
							<FaUserShield size={32} className="mb-2" />
							<Card.Title>Total Admins</Card.Title>
							{summary && Object.entries(summary).length !== 0 ? <Card.Text>{summary.total_admins}</Card.Text> : <Spinner as="span" animation="border" size="lg" role="status" aria-hidden="true" />}
						</Card.Body>
					</Card>
				</Col>
				<Col md={3}>
					<Card className="text-center shadow-sm clickable" onClick={() => openModal()}>
						<Card.Body>
							<FaBoxOpen size={32} className="mb-2" />
							<Card.Title>Total Parts</Card.Title>
							{summary && Object.entries(summary).length !== 0 ? <Card.Text>{summary.total_parts}</Card.Text> : <Spinner as="span" animation="border" size="lg" role="status" aria-hidden="true" />}
						</Card.Body>
					</Card>
				</Col>
			</Row>
		)
	}

	const renderIndices = () => {
		return (
			<Row className="mb-4">
				<Col>
					<Card className="shadow-sm">
						<Card.Header>Indices Health & Status</Card.Header>
						<Card.Body>
							<Table responsive="md" hover bordered className="table-striped">
							{indices && indices.length !== 0 ? (
							<>
								<thead>
									<tr>
										<th>Index</th>
										<th>Health</th>
										<th>Status</th>
										<th>Docs Count</th>
										<th>Store Size</th>
									</tr>
								</thead>
								<tbody>
									{indices.map((idx) => (
										<tr key={idx.uuid}>
											<td>{idx.index}</td>
											<td>
												<Badge
													bg={
														idx.health === "green"
															? "success"
															: idx.health === "yellow"
																? "warning"
																: "danger"
													}>
													{idx.health}
												</Badge>
											</td>
											<td>{idx.status}</td>
											<td>{idx["docs.count"]}</td>
											<td>{idx["store.size"]}</td>
										</tr>
									))}
								</tbody>
							</>
							) : (
								<Spinner as="span" animation="border" size="lg" role="status" aria-hidden="true" />
							)}
							</Table>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		)
	}
	
	const renderAllocation = () => {
		return (
			<Row className="mb-4">
				{allocation && allocation.length !== 0 ? (
					allocation.map((alloc, index) => (
						<Col md={6} key={index}>
							<Card className="shadow-sm mb-3">
								<Card.Header>Allocation {alloc.node ? `- ${alloc.node}` : "- Unassigned"}</Card.Header>
								<Card.Body>
									<p>
										<strong>Shards:</strong> {alloc.shards}
									</p>
									<p>
										<strong>Disk Used:</strong> {alloc["disk.used"]} 
									</p>
									<p>
										<strong>Avail:</strong>{" "}
										{alloc["disk.avail"]}
									</p>
									<p>
										<strong>Disk Percent:</strong>{" "}
										{alloc["disk.percent"] ? alloc["disk.percent"] + "%" : "N/A"}
									</p>
								</Card.Body>
							</Card>
						</Col>
					))
			) : (
					<Col md={6}>
						<Card className="shadow-sm mb-3">
							<Card.Header>Allocation <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /></Card.Header>
							<Spinner as="span" animation="border" size="lg" role="status" aria-hidden="true" />
						</Card>
					</Col>
			)}
			</Row>
		)
	}

	const renderPendingTasks = () => {
		return (
			<Row>
			{tasksIsset ? (
				<Col>
					<Card className="shadow-sm">
						<Card.Header>Pending Tasks</Card.Header>
						<Card.Body>
							{pendingTasks && pendingTasks.length > 0 ? (
								<ListGroup variant="flush">
									{pendingTasks.map((task, index) => (
										<ListGroup.Item key={index}>
											{task.task || "Task"}: {task.description || ""}
										</ListGroup.Item>
									))}
								</ListGroup>
							) : (
								<p>
									<FaCheckCircle className="text-success me-1" />
									No pending tasks.
								</p>
							)}
						</Card.Body>
					</Card>
				</Col>
			) : (
					<Col>
						<Card className="shadow-sm">
							<Card.Header>Pending Tasks</Card.Header>
							<Spinner as="span" animation="border" size="lg" role="status" aria-hidden="true" />
						</Card>
					</Col>
			)}	
			</Row>
		)
	}
	
	return (
		<Container fluid className="mt-4">
			{navigationLinks()}
			{partModal()}
			{renderSummary()}
			{renderIndices()}
			{renderAllocation()}
			{renderPendingTasks()}

		</Container>
	);
};

export default DashboardAdmin;
