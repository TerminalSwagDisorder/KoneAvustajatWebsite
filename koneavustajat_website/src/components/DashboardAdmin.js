import React from "react";
import { Button, Container } from "react-bootstrap";
import { Outlet, Link } from "react-router-dom";
import { FaUsersCog } from "react-icons/fa";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { LiaSchoolSolid } from "react-icons/lia";
import { useAuth } from "../utils/Contexts";

const DashboardAdmin = () => {
	const { currentUser } = useAuth();
	return (
		<div className="mt-4 topButtons">
			<Link to="/admin/users">
				<Button className="adminDashboardButton" style={{ width: "100%" }}>
					All users &nbsp;
					<FaUsersCog />
				</Button>
			</Link>
			<Link to="/admin/orders">
				<Button className="adminDashboardButton" style={{ width: "100%" }}>
					All orders &nbsp;
					<FaUsersCog />
				</Button>
			</Link>
			<Link to="/computerwizard/browse">
				<Button className="adminDashboardButton" style={{ width: "100%" }}>
					Modify parts &nbsp;
					<FaMagnifyingGlass />
				</Button>
			</Link>
			<Link to="/usedparts">
				<Button className="adminDashboardButton" style={{ width: "100%" }}>
					Modify used parts &nbsp;
					<FaMagnifyingGlass />
				</Button>
			</Link>
			<Outlet />
		</div>
	);
};

export default DashboardAdmin;
