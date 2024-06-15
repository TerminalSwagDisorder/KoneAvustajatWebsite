import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";

const Home = () => {
  // State hooks for color and counter
  const [color, setColor] = useState('black');
  const [counter, setCounter] = useState(0);

  // Array of colors
  const colors = ['red', 'blue', 'green', 'purple', 'orange'];

  // Function to change color and update counter
  const changeColor = () => {
    const newColor = colors[Math.floor(Math.random() * colors.length)];
    setColor(newColor);
    setCounter(prevCounter => prevCounter + 1);
  };

  // useEffect to log counter value 
  useEffect(() => {
    console.log(`The text has been updated ${counter} times`);
  }, [counter]);

  return (
    <Container className="my-5">
      <Row className="align-items-center">
        <Col sm={12} md={6}>
          <h6 style={{color: "#712cf9"}}>This is a Demo version!</h6>
          <h1>KoneAvustajat homepage</h1><br />
          <p>
	  		This is the home page for KoneAvustajat
          </p>
          <p style={{ color: color }}> This is a test! </p>
          <Button onClick={changeColor} variant="primary">Change Color</Button>
          <p>Color change counter: {counter}</p>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
