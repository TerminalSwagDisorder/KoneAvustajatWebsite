import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";

const Home = ({ fetchContent }) => {
	const [content, setContent] = useState();
	const [specificContent, setSpecificContent] = useState();
	
	useEffect(() => {
		fetchPageContent();
	}, []);
	
	useEffect(() => {
		console.log(content);
	}, [content]);

	const fetchPageContent = async () => {
		try {
			const data = await fetchContent({page: "home"});
			setContent(data);
		} catch (error) {
			console.error("Error while fetching content:", error);
		}
	};

	const fetchSpecificContent = async (section = "", specific = "") => {
		try {
			const data = await fetchContent({page: "home", section: section, specific: specific});
			setContent(data);
		} catch (error) {
			console.error("Error while fetching specific content:", error);
		}
	};


	return (
		<Container className="my-5">
			<Row className="align-items-center">
				<Col sm={12} md={6}>
					<p>{content["home.header.welcome"]["en"]}</p>
				</Col>
			</Row>
		</Container>
	);
};

export default Home;
