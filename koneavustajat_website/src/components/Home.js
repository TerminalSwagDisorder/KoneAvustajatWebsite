import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";

const Home = ({ fetchContent, useLanguage }) => {
	const [content, setContent] = useState();
	const [specificContent, setSpecificContent] = useState();
	const { language } = useLanguage();
	
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
	
	const renderContent2 = () => {
		let homeHeaderWelcome;
		if (content && content["home.header.welcome"]["en"]) {
			homeHeaderWelcome = <p>{content["home.header.welcome"]["en"]}</p>
		} else {
			homeHeaderWelcome = <p>Welcome to the KoneAvustajat website!</p>
		}
		return (
		<>
			{homeHeaderWelcome}
		</>
		);
	};

	const renderContent = (identifier, fallback) => {
		if (content && content[identifier]) {
			return content[identifier][language] || fallback;
		}
		return fallback;
	};

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
