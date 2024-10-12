import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Container, Button, Image, CloseButton, ListGroup } from "react-bootstrap";
import { addToWizard, removeFromWizard, clearWizard, addToCompletedBuild, removeFromCompletedBuild, clearCompletedBuild } from "../redux/wizardSlice";
import { addToShoppingCart } from "../redux/shoppingCartSlice";

const ComputerWizardBuild = () => {
    const wizard = useSelector((state) => state.wizard.wizard);
    const completedBuild = useSelector((state) => state.wizard.completedBuild);
    const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
    const dispatch = useDispatch();
    const completedBuildItems = Object.values(completedBuild);
    const completedBuildEntries = Object.entries(completedBuild);
    
    console.log(completedBuildEntries);
        
    const totalPrice = completedBuildItems.reduce((acc, item) => {
        return acc + (parseFloat(item.Price) || 0);
    }, 0).toFixed(2);

	const handleAddToCart = () => {
        if (completedBuildEntries.length > 0) {
            const newItem = {
                ...completedBuildEntries,
                table: "completedBuild",
                totalPrice: totalPrice
            };
            dispatch(addToShoppingCart(newItem));
        } else {
            console.error("Unable to add a completed build with no parts!");
        }
	};

    const handleAddToCompletedBuild = (item) => {
        const newItem = {
            ...item,
            table: "part",
            quantity: 1 // Set default quantity to 1
        };
        dispatch(addToCompletedBuild(newItem));
    };

    const handleRemoveFromCompletedBuild = (itemId) => {
        dispatch(removeFromCompletedBuild(itemId));
    };

    const handleClearCompletedBuild = () => {
        dispatch(clearCompletedBuild());
    };

    const renderNestedObject = (nestedObj) => {
        return (
            <ListGroup>
                {Object.entries(nestedObj).map(([key, value], idx) => (
                    <ListGroup.Item key={idx}>
                        <span>
                            <b>{key}</b>:{" "}
                        </span>
                        {typeof value === "object" && value !== null ? renderNestedObject(value) : value}
                    </ListGroup.Item>
                ))}
            </ListGroup>
        );
    };

    const renderCompletedBuildItems = () => {
        if (completedBuildEntries && completedBuildEntries.length > 0) {
            return (
                <ListGroup className="completedBuild-details">
                    {completedBuildEntries.map(([partKey, partVal]) => (
                        <ListGroup.Item key={partKey}>
                            <p>
                                {partKey}: <b>{partVal.Name}</b> | <b>{parseFloat(partVal.Price).toFixed(2)}</b> €
                                <Button className="user-select-button" onClick={() => handleRemoveFromCompletedBuild(partKey)}>
                                    <span>Remove</span>
                                </Button>
                            </p>
                        </ListGroup.Item>
                    ))}
                    <ListGroup.Item>
                        {(totalPrice && totalPrice > 0) ? (
                            <p>
                                Total price: <b>{totalPrice}</b> €
                            </p>
                        ) : (
                            <p>No price could be calculated!</p>
                        )}
                    </ListGroup.Item>
                </ListGroup>
            );
        } else {
            return (
            <ListGroup className="completedBuild-details">
                <ListGroup.Item>
                    <p>No parts chosen!</p>
                </ListGroup.Item>
            </ListGroup>
            );
        }
    };

    return (
        <div>
            <h3>Computer build</h3>
            <Button className="user-select-button" onClick={() => handleClearCompletedBuild()}>
                Clear Build
            </Button>
            <Button className="user-select-button" onClick={() => handleAddToCart()}>
                Add to cart
            </Button>
            <br />
            <br />
            <br />
            {renderCompletedBuildItems()}
        </div>
    );
};

export default ComputerWizardBuild;
