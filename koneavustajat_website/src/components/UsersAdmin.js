import React, { useState, useEffect } from 'react';
import { ListGroup, Col } from 'react-bootstrap';
import renderUserData from './Profile';
import renderUserForm from './Profile';


const UsersAdmin = ( {fetchUsers, currentUser} ) => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  // Function to fetch data and set users state
  const fetchData = async () => {
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (error) {
      setError('Error fetching users');
    }
  };

  // Use useEffect to fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  /*
  const renderUserData = () => {
		if (currentUser.role === "user") {
			return (
				<ListGroup className="profile-details">
				  <ListGroup.Item>Name: <span>{currentUser.Name}</span></ListGroup.Item>
				  <ListGroup.Item>Email: <span>{currentUser.Email}</span></ListGroup.Item>
				</ListGroup>
			);
		} else {
			return(
            <ListGroup className="profile-details">
              <ListGroup.Item>Name: <span>{currentUser.Name}</span></ListGroup.Item>
              <ListGroup.Item>Email: <span>{currentUser.Email}</span></ListGroup.Item>
            </ListGroup>
		)}
	};*/

  if (error) {
    return <div>{error}</div>;
  }

  if (!users.length) {
    return <div>Loading users...</div>;
  }
  
  return (
    <div>
      <h1>Manage Users</h1>
      <ul>
        {users.slice().map((user) => (
          <li key={user.UserID}>
            <strong>{user.Name || 'Unknown Name'}</strong> - {user.Email || 'No Email'}, {user.Gender || 'N/A'}, User id: {user.UserID || 'N/A'}, Role id: {user.RoleID  || 'N/A'}
          </li>
        ))}
      </ul>
    </div>
  );
};


/*
return (
  <div>
    <h1>Manage Users</h1>
    <ul>
    <Col md={8}>
	  		
        {renderUserData()}
        /*{/* User Form *//*}
        {renderUserForm()}
      </Col>

    </ul>
  </div>
  );
};*/

export default UsersAdmin;