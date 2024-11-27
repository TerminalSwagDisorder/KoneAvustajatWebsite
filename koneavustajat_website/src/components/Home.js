import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useLanguage, useContent } from "../utils/Contexts";
import { useRenderContent } from "../utils/ContentUtils";

const Home = () => {
	// const [content, setContent] = useState();
	const [specificContent, setSpecificContent] = useState();
	// const { language } = useLanguage();
	const renderContent = useRenderContent();
	const { fetchPageContentOverride } = useContent();

    useEffect(() => {
		test();
    }, []);

	const test = async () => {
        const data = await fetchPageContentOverride({page: "about", section: "header"});
		console.log(data);
		setSpecificContent(data);
	};
	
	return (
		<Container className="my-5">
			<Row className="align-items-center">
				<Col sm={12} md={6}>
					<p>{renderContent("home.header.welcome")}</p>
					<p>{renderContent("about.header")}</p>
				</Col>
			</Row>
		</Container>
	);
};

export default Home;
