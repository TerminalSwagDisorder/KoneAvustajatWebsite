import React from "react";
import { Outlet } from "react-router-dom";
import { Container } from "react-bootstrap";
import { useAuth } from "../utils/Contexts";
import { useRenderContent } from "../utils/ContentUtils";

const Admin = () => {
	const renderContent = useRenderContent();
	const { currentUser } = useAuth();
	console.log(currentUser);
	return (
		<Container className="my-5 align-items-center">
			<h3>
				{renderContent("admin.greeting", "Hello admin")} <span className="admin-name">{currentUser.Name}!</span>
			</h3>
			<Outlet />
		</Container>
	);
};

export default Admin;
