import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addToWizard, removeFromWizard, clearWizard } from "../redux/wizardSlice";
import { Form, Button, InputGroup, Dropdown, DropdownButton, Container, Row, Col, Image, CloseButton, ListGroup } from "react-bootstrap";

const ComputerWizardWizard = () => {
	const [currentOperation, setCurrentOperation] = useState("wizard");
	const [formFields, setFormFields] = useState({
		price: 0,
		useCase: "noPreference",
		performancePreference: "noPreference",
		formFactor: "noPreference",
		colorPreference: "noPreference",
		otherColor: "",
		rgbPreference: "noPreference",
		cpuManufacturer: "noPreference",
		gpuManufacturer: "noPreference",
		psuBias: "noPreference",
		storageBias: "noPreference",
		additionalStorage: "noPreference"
	});

    const wizard = useSelector((state) => state.wizard.wizard);
    const dispatch = useDispatch();

    const wizardItems = Object.values(wizard);
    const wizardEntries = Object.entries(wizard);
	console.log(wizardItems);
	console.log(wizardEntries);

    const totalPrice = wizardItems.reduce((acc, item) => {
        return acc + (parseFloat(item.Price) || 0);
    }, 0).toFixed(2);

	const handleAddToWizard = (formFields) => {
        if (formFields) {
            const newItem = {
                ...formFields,
                table: "wizard",
            };
            dispatch(addToWizard(newItem));
        } else {
            console.error("Unable to add to wizard!");
        }
	};
	
    const handleRemoveFromWizard = (itemId) => {
        dispatch(removeFromWizard(itemId));
    };

    const handleClearWizard= () => {
        dispatch(clearWizard());
    };

	const closeForm = () => {
		setCurrentOperation("");
	};

	const handleComputerWizardForm = (operation) => {
		setCurrentOperation(operation);
	};

	const handleInputChange = (event) => {
		setFormFields((prevFields) => ({
			...prevFields,
			[event.target.name]: event.target.value
		}));
	};

	const handleSubmit = (event) => {
		event.preventDefault();

		if (Number.isNaN(formFields.price) || formFields.price === 0 || formFields.price === undefined) {
			alert("Price must be a number between 500-5000");
		}

		if (formFields.price < 500 || formFields.price > 5000) {
			alert("Price must be between 500-5000");
		}

		if (formFields.otherColor !== "" && formFields.colorPreference !== "other") {
			let resetValue = "";
			event.target.otherColor.value = resetValue;
			formFields.otherColor = resetValue;
		}

		try {
			handleAddToWizard(formFields);
			console.log(formFields);
		} catch (error) {
			console.error("Error updating credentials:", error);
			alert("Error updating credentials.");
		}
	};
	
	const clearWizardButton = () => {
		if (wizardEntries && wizardEntries.length > 0) {
			return (
				<Button onClick={() => handleClearWizard()}>Clear</Button>
			)
			
		}
	}

    const renderWizardItems = () => {
    	if (wizardEntries && wizardEntries.length > 0) {
    		return (
    			<ListGroup className="wizard-details">
    				<h3>Wizard build</h3>
    				{wizardEntries.map(([wizardKey, wizardVal]) => (
    					<ListGroup.Item key={wizardKey}>
    						<p>
    							{Object.keys(wizardVal).map((key, idx) =>
									key !== "table" && (
										<ListGroup.Item key={key}>
											{key}: {wizardVal[key] || "None"}
										</ListGroup.Item>
									)
    							)}
    							<Button
    								className="user-select-button"
    								onClick={() => handleRemoveFromWizard(wizardKey)}>
    								<span>Remove</span>
    							</Button>
    						</p>
    					</ListGroup.Item>
    				))}
    			</ListGroup>
    		);
    	}
    };

	const renderAdvancedButton = () => {
		if (currentOperation === "wizardAdvanced") {
			return (
				<div>
					<Button className="setWizardAdvanced" onClick={() => handleComputerWizardForm("wizard")}>
						Advanced ▲
					</Button>
				</div>
			);
		} else {
			return (
				<div>
					<Button className="setWizardAdvanced" onClick={() => handleComputerWizardForm("wizardAdvanced")}>
						Advanced ▼
					</Button>
				</div>
			);
		}
	};

	const renderComputerWizard = () => {
		if (currentOperation === "wizard" || currentOperation === "wizardAdvanced") {
			return (
				<Container id="wizardForm">
					<Form onSubmit={handleSubmit} className="wizardForm">
						<Col>
							<Button variant="danger" className="closeForm" onClick={() => closeForm()}>
								x
							</Button>
						</Col>
						<h2>Computer Wizard</h2>
						<br />

						{/* Max Price Field */}
						<Form.Group controlId="price">
							<Form.Label>Max price (500-5000):</Form.Label>
							<Form.Control
								type="number"
								name="price"
								min="500"
								max="5000"
								step="50"
								value={formFields.price}
								onChange={handleInputChange}
								required
							/>
						</Form.Group>
						<br />

						{/* Use Case Field */}
						<Form.Group controlId="useCase">
							<Form.Label>Use case:</Form.Label>
							<Form.Control
								as="select"
								name="useCase"
								value={formFields.useCase}
								onChange={handleInputChange}>
								<option value="noPreference">No preference</option>
								<option value="gaming">Gaming</option>
								<option value="work">Work/Office</option>
								<option value="streaming">Streaming</option>
								<option value="generalUse">General Use/Browsing</option>
								<option value="editing">Video/Photo editing</option>
								<option value="workstation">Workstation</option>
							</Form.Control>
						</Form.Group>
						<br />

						{/* Performance Preference */}
						<Form.Group controlId="performancePreference">
							<Form.Label>Performance preference:</Form.Label>
							<Form.Control
								as="select"
								name="performancePreference"
								value={formFields.performancePreference}
								onChange={handleInputChange}>
								<option value="noPreference">No preference</option>
								<option value="maxGpu">Maximum graphics power</option>
								<option value="maxCpu">Maximum processing power</option>
								<option value="maxRamAmount">Maximum RAM amount</option>
								<option value="maxRamSpeed">Maximum RAM speed</option>
								<option value="maxStorageAmount">Maximum storage amount</option>
								<option value="maxEfficiency">Maximum efficiency</option>
							</Form.Control>
						</Form.Group>
						<br />

						{/* Form Factor */}
						<Form.Group controlId="formFactor">
							<Form.Label>Size preference:</Form.Label>
							<Form.Control
								as="select"
								name="formFactor"
								value={formFields.formFactor}
								onChange={handleInputChange}>
								<option value="noPreference">No preference</option>
								<option value="smallest">Smallest possible/HTPC sized</option>
								<option value="small">Smaller ITX sized</option>
								<option value="medium">Regular ATX sized</option>
								<option value="large">Larger E-ATX sized</option>
								<option value="largest">No upper limit</option>
							</Form.Control>
						</Form.Group>
						<br />

						{/* Color Preference */}
						<Form.Group controlId="colorPreference">
							<Form.Label>Color preference:</Form.Label>
							<Form.Control
								as="select"
								name="colorPreference"
								value={formFields.colorPreference}
								onChange={handleInputChange}>
								<option value="noPreference">No preference</option>
								<option value="black">Black</option>
								<option value="white">White</option>
								<option value="red">Red</option>
								<option value="blue">Blue</option>
								<option value="other">Other</option>
							</Form.Control>
							<br />
							<Form.Control
								type="text"
								name="otherColor"
								placeholder="Choose any other color"
								value={formFields.otherColor}
								onChange={handleInputChange}
								disabled={formFields.colorPreference !== "other"}
							/>
						</Form.Group>
						<br />

						{/* RGB Preference */}
						<Form.Group controlId="rgbPreference">
							<Form.Label>RGB lighting preference:</Form.Label>
							<Form.Control
								as="select"
								name="rgbPreference"
								value={formFields.rgbPreference}
								onChange={handleInputChange}>
								<option value="noPreference">No preference</option>
								<option value="noRgb">No RGB if possible</option>
								<option value="minimumRgb">Small amount of RGB</option>
								<option value="largeRgb">Large amount of RGB</option>
								<option value="maximumRgb">Maximum amount of RGB</option>
							</Form.Control>
						</Form.Group>
						<br />

						{renderAdvancedButton()}
						<br />
						{renderAdvancedComputerWizard()}
						<br />

						<Button variant="primary" type="submit">
							Build computer!
						</Button>
					</Form>
				</Container>
			);
		} else {
			return (
				<Container className="userCredentialChange">
					<Button onClick={() => handleComputerWizardForm("wizard")}>Start to build a computer!</Button>
				</Container>
			);
		}
	};

	const renderAdvancedComputerWizard = () => {
		if (currentOperation === "wizardAdvanced") {
			return (
				<div>
					<Form.Group controlId="cpuManufacturer">
						<Form.Label>CPU Manufacturer:</Form.Label>
						<Form.Control
							as="select"
							name="cpuManufacturer"
							value={formFields.cpuManufacturer}
							onChange={handleInputChange}>
							<option value="noPreference">No preference</option>
							<option value="amdPreference">AMD</option>
							<option value="intelPreference">Intel</option>
						</Form.Control>
					</Form.Group>
					<br />

					<Form.Group controlId="gpuManufacturer">
						<Form.Label>GPU Manufacturer:</Form.Label>
						<Form.Control
							as="select"
							name="gpuManufacturer"
							value={formFields.gpuManufacturer}
							onChange={handleInputChange}>
							<option value="noPreference">No preference</option>
							<option value="amdPreference">AMD</option>
							<option value="nvidiaPreference">NVIDIA</option>
							<option value="intelPreference">Intel</option>
						</Form.Control>
					</Form.Group>
					<br />

					<Form.Group controlId="psuBias">
						<Form.Label>Power supply bias:</Form.Label>
						<Form.Control
							as="select"
							name="psuBias"
							value={formFields.psuBias}
							onChange={handleInputChange}>
							<option value="noPreference">No preference</option>
							<option value="bestEfficiency">Better efficiency/Lower wattage</option>
							<option value="balanced">Balanced efficiency & wattage</option>
							<option value="highWattage">Higher wattage/Worse efficiency</option>
						</Form.Control>
					</Form.Group>
					<br />

					<Form.Group controlId="storageBias">
						<Form.Label>Storage bias:</Form.Label>
						<Form.Control
							as="select"
							name="storageBias"
							value={formFields.storageBias}
							onChange={handleInputChange}>
							<option value="noPreference">No preference</option>
							<option value="onlyM2">Only M.2 SSDs</option>
							<option value="onlySsd">Only SSDs</option>
							<option value="bootSsd">Boot SSD with any mixture of storage</option>
							<option value="balanced">Any mixture of storage</option>
							<option value="onlyHdd">Only HDDs</option>
						</Form.Control>
					</Form.Group>
					<br />

					<Form.Group controlId="additionalStorage">
						<Form.Label>Additional storage:</Form.Label>
						<Form.Control
							as="select"
							name="additionalStorage"
							value={formFields.additionalStorage}
							onChange={handleInputChange}>
							<option value="noPreference">No preference</option>
							<option value="noAdded">No additional storage</option>
							<option value="oneAdded">1 extra storage drive</option>
							<option value="twoAdded">2 extra storage drives</option>
							<option value="threeAdded">3 extra storage drives</option>
							<option value="maxAdded">As many as I can get</option>
						</Form.Control>
					</Form.Group>
					<br />
				</div>
			);
		}
	};

	return (
		<div>
			{clearWizardButton()}
			{renderComputerWizard()}
			{renderWizardItems()}
		</div>
	);
};

export default ComputerWizardWizard;
