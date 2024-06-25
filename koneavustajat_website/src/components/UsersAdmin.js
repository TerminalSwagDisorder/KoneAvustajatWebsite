import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UsersAdmin = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        // Replace 'https://api.example.com/users' with your API endpoint
        axios.get('/api/users')
          .then(response => {
            setUsers(response.data);
          })
          .catch(error => {
            console.error('There was an error fetching the users!', error);
          });
      }, []);


      /*THIS IS TEMPORARY*/
      return (
        <div>
          <h1>Admin Dashboard</h1>
          <h2>All Users</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

export default UsersAdmin;
