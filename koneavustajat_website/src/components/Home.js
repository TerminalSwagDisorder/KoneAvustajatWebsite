import React from "react";
import { Container, Row, Col } from "react-bootstrap";

const Home = () => {
  return (
    <Container className="my-5">
      <Row className="align-items-center">
        <Col sm={12} md={6}>
          <h6 style={{color: "#712cf9"}}>This is a Demo version!</h6>
          <h1>KoneAvustajat homepage</h1><br />
          <p>
	  		This is the home page for KoneAvustajat
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
