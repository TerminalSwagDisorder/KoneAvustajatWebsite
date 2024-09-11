import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Container, Button, Image, CloseButton, ListGroup } from "react-bootstrap";
import { addToWizard, removeFromWizard, clearWizard } from "../redux/wizardSlice";

const ComputerWizardBuild = () => {
    const wizard = useSelector((state) => state.wizard.wizard);
    const dispatch = useDispatch();
    const wizardItems = Object.values(wizard);
    const wizardEntries = Object.entries(wizard);
        
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
        if (wizardEntries) {
            return (
                <ListGroup className="parts-details">
                    {wizardEntries.map(([partKey, partVal]) => (
                        <ListGroup key={partKey} className="mb-4">
                            {Object.keys(partVal).map((key, idx) => 
							key == "Name" && (
                                <ListGroup.Item key={idx}>
                                    <span>
                                        <b>{key}</b>:{" "}
                                    </span>
                                    {key === "Image" ? (
                                        <Image
                                            src={process.env.PUBLIC_URL + "/product_images/" + partVal[key]}
                                            alt={partVal.Name}
                                            className="part-image mb-3"
                                            style={{ width: "100px", height: "auto" }}
                                        />
                                    ) : key === "Url" || key === "Image_Url" ? (
                                        <a href={partVal[key]} target="_blank" rel="noopener noreferrer">
                                            {partVal[key]}
                                        </a>
                                    ) : typeof partVal[key] === "object" && partVal[key] !== null ? (
                                        renderNestedObject(partVal[key])
                                    ) : (
                                        partVal[key]
                                    )}
                                </ListGroup.Item>
                            ))}
                            <Button className="user-select-button" onClick={() => handleRemoveFromWizard(partKey)}>
                                Remove all {partKey} from wizard
                            </Button>
                        </ListGroup>
                    ))}
                </ListGroup>
            );
        } else {
            return <p>Something went wrong!</p>;
        }
    };

    return (
        <div>
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
