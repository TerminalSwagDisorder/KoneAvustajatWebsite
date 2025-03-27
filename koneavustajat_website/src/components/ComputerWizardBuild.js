import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Container, Button, Image, CloseButton, ListGroup } from "react-bootstrap";
import { addToWizard, removeFromWizard, clearWizard, addToCompletedBuild, removeFromCompletedBuild, clearCompletedBuild } from "../redux/wizardSlice";
import { addToShoppingCart } from "../redux/shoppingCartSlice";
import { useError } from "../utils/Contexts";
import { useRenderContent } from "../utils/ContentUtils";

const ComputerWizardBuild = () => {
	const renderContent = useRenderContent();
	const { displayError } = useError();
    const wizard = useSelector((state) => state.wizard.wizard);
    const completedBuild = useSelector((state) => state.wizard.completedBuild);
    const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
    const dispatch = useDispatch();
    const completedBuildItems = Object.values(completedBuild);
    const completedBuildEntries = Object.entries(completedBuild);
    const [chosenPart, setChosenPart] = useState("");

    const totalPrice = completedBuildItems
        .filter(item => item && item.Price) // Filter out non-component entries
        .reduce((acc, item) => {
            return acc + (parseFloat(item.Price) || 0);
        }, 0)
        .toFixed(2);

	const handleAddToCart = () => {
        if (Object.entries(completedBuild).length > 0) {
            const newItem = {
                ...completedBuild,
                table: "completedBuild",
                totalPrice: totalPrice
            };
            dispatch(addToShoppingCart(newItem));
        } else {
            displayError("Unable to add a completed build with no parts!");
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
        console.log("itemId", itemId);
        dispatch(removeFromCompletedBuild(itemId));
    };

    const handleClearCompletedBuild = () => {
        dispatch(clearCompletedBuild());
    };

	const toggleChoosePart = (newChoice) => {
		if (chosenPart === newChoice) {
			setChosenPart("");
		} else {
			setChosenPart(newChoice);
		}
	};

    const renderAdditionalInfo = (partData) => {
    	if (chosenPart == partData.Name) {
    		return (
    			<ListGroup>
    				<br />
    				{Object.entries(partData).map(
    					([key, value], idx) =>
    						key !== "ID" && key !== "ShortReason" && (
    							<ListGroup.Item key={idx}>
    								{key === "Url" || key === "Image_Url" ? (
    									<span>
    										<a href={value} target="_blank" rel="noopener noreferrer">
    											{value}
    										</a>
    									</span>
    								) : key === "Image" ? (
    									<Image
    										src={process.env.PUBLIC_URL + "/product_images/" + value}
    										alt={key}
    										style={{ width: "100px", height: "auto" }}
    									/>
    								) : (
    									<span>
    										<b>{key}</b>:{" "}
    										{typeof value === "object" && value !== null
    											? renderAdditionalInfo(value)
    											: value}
    									</span>
    								)}
    							</ListGroup.Item>
    						)
    				)}
    			</ListGroup>
    		);
    	}
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
        const validParts = ["chassis", "cpu", "cpu_cooler", "gpu", "motherboard", "memory", "storage", "psu"];
        if (completedBuild) {
            return (
                <ListGroup className="completedBuild-details">
                    {completedBuildEntries.map(([partKey, partVal]) => validParts.includes(partKey) && (
                        <ListGroup.Item onClick={() => toggleChoosePart(partVal.Name)} key={partKey}>
                            <p>
                                {renderContent(`computerwizard/build.table.${partKey}`, partKey)} <b>{partVal.Name}</b> | <b>{parseFloat(partVal.Price).toFixed(2)}</b> €
                                <Button className="user-select-button" onClick={() => handleRemoveFromCompletedBuild(partKey)}>
                                    <span>{renderContent("computerwizard/build.table.buttonremove", "Remove")}</span>
                                </Button>
                                {renderAdditionalInfo(partVal)}
                            </p>
                        </ListGroup.Item>
                    ))}
                    <ListGroup.Item>
                        {(totalPrice && totalPrice > 0) ? (
                            <p>
                                {renderContent("computerwizard/build.table.totalprice", "Total price:")} <b>{totalPrice}</b> €
                            </p>
                        ) : (
                            <p>{renderContent("computerwizard/build.table.noprice", "No price could be calculated!")}</p>
                        )}
                    </ListGroup.Item>
                </ListGroup>
            );
        } else {
            return (
            <ListGroup className="completedBuild-details">
                <ListGroup.Item>
                    <p>{renderContent("computerwizard/build.table.noparts", "No parts chosen!")}</p>
                </ListGroup.Item>
            </ListGroup>
            );
        }
    };

    return (
        <div>
            <h3>{renderContent("computerwizard/build.body.title", "Computer build")}</h3>
            <Button className="user-select-button" onClick={() => handleClearCompletedBuild()}>
                {renderContent("computerwizard/build.body.buttonclear", "Clear Build")}
            </Button>
            <Button className="user-select-button" onClick={() => handleAddToCart()}>
                {renderContent("computerwizard/build.body.buttonaddtocart", "Add to cart")}
            </Button>
            <br />
            <br />
            <br />
            {renderCompletedBuildItems()}
        </div>
    );
};

export default ComputerWizardBuild;
