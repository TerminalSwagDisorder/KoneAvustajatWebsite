import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { FaSearch, FaShoppingCart, FaTools } from 'react-icons/fa';

const ComputerWizard = () => {
  return (
    
      <div className="mt-4 topButtons">
          <Link to="/computerwizard/browse">
              <Button className="wizardButton" style={{ width: "100%" }}>
                  Browse &nbsp;
                  <FaSearch />
              </Button>
          </Link>
          <Link to="/computerwizard/purchase">
              <Button className="wizardButton" style={{ width: "100%" }}>
                  Purchase &nbsp;
                  <FaShoppingCart />
              </Button>
          </Link>
          <Link to="/computerwizard/build">
              <Button className="wizardButton" style={{ width: "100%" }}>
                  Build &nbsp;
                  <FaTools />
              </Button>
          </Link>
          <Outlet />

      </div>
  );
};

export default ComputerWizard;
