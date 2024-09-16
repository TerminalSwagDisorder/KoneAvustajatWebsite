import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Container, Button, Image, CloseButton, ListGroup } from "react-bootstrap";
import { addToWizard, removeFromWizard, clearWizard } from "../redux/wizardSlice";

const ComputerWizardBuild = () => {
    const wizard = useSelector((state) => state.wizard.wizard);
    const dispatch = useDispatch();
    const wizardItems = Object.values(wizard);
    const wizardEntries = Object.entries(wizard);
        
    const totalPrice = wizardItems.reduce((acc, item) => {
        return acc + (parseFloat(item.Price) || 0);
    }, 0).toFixed(2);

    const handleAddToWizard = (item) => {
        const newItem = {
            ...item,
            table: "part",
            quantity: 1 // Set default quantity to 1
        };
        dispatch(addToWizard(newItem));
    };

    const handleRemoveFromWizard = (itemId) => {
        dispatch(removeFromWizard(itemId));
    };

    const handleClearWizard = () => {
        dispatch(clearWizard());
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

    const renderWizardItems = () => {
        if (wizardEntries && wizardEntries.length > 0) {
            return (
                <ListGroup className="wizard-details">
                    {wizardEntries.map(([partKey, partVal]) => (
                        <ListGroup.Item>
                            <p>
                                {partKey}: <b>{partVal.Name}</b> | <b>{parseFloat(partVal.Price).toFixed(2)}</b> €
                                <Button className="user-select-button" onClick={() => handleRemoveFromWizard(partKey)}>
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
            <ListGroup className="wizard-details">
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
            <Button className="user-select-button" onClick={() => handleClearWizard()}>
                Clear Wizard
            </Button>
            <br />
            <br />
            <br />
            {renderWizardItems()}
        </div>
    );
};

export default ComputerWizardBuild;
