import React, { useState, useEffect } from 'react';

const UsersAdmin = ( {fetchUsers} ) => {
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
            <strong>{user.Name || 'Unknown Name'}</strong> - {user.Email || 'No Email'}, {user.Gender || 'N/A'}, User id: {user.UserID || 'N/A'}, Role id: {user.RoleID  || 'N/A'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsersAdmin;