import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";

const Home = ({ fetchContent, useLanguage, useRenderContent, fetchPageContent }) => {
	const [content, setContent] = useState();
	const [specificContent, setSpecificContent] = useState();
	const { language } = useLanguage();
	const renderContent = useRenderContent();
	
	useEffect(() => {
		fetchPageContent(fetchContent, { page: "home" }, setContent);
	}, []);

	useEffect(() => {
		console.log(content);
	}, [content]);

	return (
		<Container className="my-5">
			<Row className="align-items-center">
				<Col sm={12} md={6}>
					<p>{renderContent(content, "home.header.welcome", "Fallback")}</p>
				</Col>
			</Row>
		</Container>
	);
};

export default Home;
