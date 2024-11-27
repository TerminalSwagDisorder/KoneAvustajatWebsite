import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useLanguage } from "../utils/Contexts";
import { useRenderContent, fetchPageContent } from "../utils/ContentUtils";

const Home = () => {
	const [content, setContent] = useState();
	const [specificContent, setSpecificContent] = useState();
	const { language } = useLanguage();
	const renderContent = useRenderContent();
	

	useEffect(() => {
		console.log(content);
	}, [content]);

	return (
		<Container className="my-5">
			<Row className="align-items-center">
				<Col sm={12} md={6}>
					<p>{renderContent("home.header.welcome", "Fallback")}</p>
				</Col>
			</Row>
		</Container>
	);
};

export default Home;
