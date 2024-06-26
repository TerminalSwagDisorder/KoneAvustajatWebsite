import React, { useState, useEffect } from 'react';


const UsersAdmin = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/users`, {
        method: "GET",
        credentials: "include", // Important, because we're using cookies
      });
  
      const data = await response.json();
  
          if (!response.ok) {
              alert(`HTTP error ${response.status}: ${data.message}`);
              throw new Error(`HTTP error ${response.status}: ${data.message}`);
          }
  
      // If data is not correct format
      if (!Array.isArray(data)) {
        return Object.values(data);
      }
      
      return data;
    } catch (error) {
      console.error(error);
      
    }
  };

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

  if (error) {
    return <div>{error}</div>;
  }

  if (!users.length) {
    return <div>Loading users...</div>;
  }
  
/*Seems to be a bit broken*/
  return (
    <div>
      <h1>Manage Users</h1>
      <ul>
        {users.slice().map((user) => (
          <li key={user.UserID}>
            <strong>{user.name}</strong> - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsersAdmin;