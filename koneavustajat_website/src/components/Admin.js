import React from "react";
import { Outlet } from "react-router-dom";
import { Container } from "react-bootstrap";



const Admin = ({ setCurrentUser, currentUser }) => {

  return (
    <Container className="my-5 align-items-center">
      <h3>Hello admin <span className="admin-name">{currentUser.Name}!</span></h3>
      <Outlet />
    </Container>
  );
};

export default Admin