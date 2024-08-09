import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { FaSearch, FaShoppingCart, FaWrench, FaEdit } from 'react-icons/fa'; 

const UsedParts = () => {
    return (
        <div className="mt-4 topButtons">
            <Link to="/usedparts/browse">
                <Button className="usedPartsButton" style={{ width: "100%" }}>
                    Browse &nbsp;
                    <FaSearch />
                </Button>
            </Link>
            <Link to="/usedparts/purchase">
                <Button className="usedPartsButton" style={{ width: "100%" }}>
                    Purchase &nbsp;
                    <FaShoppingCart />
                </Button>
            </Link>
            <Link to="/usedparts/build">
                <Button className="usedPartsButton" style={{ width: "100%" }}>
                    Build &nbsp;
                    <FaWrench />
                </Button>
            </Link>
            <Link to="/usedparts/modify">
                <Button className="usedPartsButton" style={{ width: "100%" }}>
                    Modify Used Parts &nbsp;
                    <FaEdit />
                </Button>
            </Link>
            <Outlet />
        </div>
    );
};

export default UsedParts;

