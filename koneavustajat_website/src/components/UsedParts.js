import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const UsedParts = () => {
  return (
    <div>
      <h1>Used Parts</h1>
      <nav>
        <ul>
          <li><Link to="browse">Browse</Link></li>
          <li><Link to="purchase">Purchase</Link></li>
          <li><Link to="build">Build</Link></li>
          <li><Link to="modify">Modify Used Parts</Link></li>
        </ul>
      </nav>
      <Outlet />
    </div>
  );
};

export default UsedParts;
