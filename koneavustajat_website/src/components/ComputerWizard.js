import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const ComputerWizard = () => {
  return (
    <div>
      <h1>Computer Wizard</h1>
      <nav>
        <ul>
          <li><Link to="browse">Browse</Link></li>
          <li><Link to="purchase">Purchase</Link></li>
          <li><Link to="build">Build</Link></li>
        </ul>
      </nav>
      <Outlet />
    </div>
  );
};

export default ComputerWizard;
