import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addToWizard, removeFromWizard, clearWizard, addToCompletedBuild } from "../redux/wizardSlice";
import { Form, Button, InputGroup, Dropdown, DropdownButton, Container, Row, Col, Image, CloseButton, ListGroup, Alert } from "react-bootstrap";
import { useError } from "../utils/Contexts";

const ComputerWizardWizard = ({ wizardAlgorithm }) => {
	const { displayError } = useError();
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
	const [currentBuild, setCurrentBuild] = useState({});
	const [currentPrice, setCurrentPrice] = useState(0);
	const [chosenPart, setChosenPart] = useState("");

	useEffect(() => {
		if (Object.entries(currentBuild).length > 0) {
			handleAddToWizard();
		}
	}, [currentBuild]);
	
    const wizard = useSelector((state) => state.wizard.wizard);
	const completedBuild = useSelector((state) => state.wizard.completedBuild);
    const dispatch = useDispatch();

    const wizardItems = Object.values(wizard);
    const wizardEntries = Object.entries(wizard);
    const completedBuildItems = Object.values(completedBuild);
    const completedBuildEntries = Object.entries(completedBuild);
	if (wizardItems.length > 0) console.log(wizardItems);
	if (wizardEntries.length > 0) console.log(wizardEntries);
	console.log(wizardEntries);

    const totalPrice = wizardItems
        .filter(item => item && item.Price) // Filter out non-component entries
        .reduce((acc, item) => {
            return acc + (parseFloat(item.Price) || 0);
        }, 0)
        .toFixed(2);

	const handleAddToWizard = () => {
		const newItem = {
			...currentBuild,
			totalPrice: currentPrice,
			table: "wizard",
		};
		dispatch(addToWizard(newItem));

	};

    const handleAddToCompletedBuild = () => {
		if (window.confirm("Are you sure, this will overwrite your existing build!") == false) {
			return false;
		} 
		console.log("wizardEntries", wizardEntries);
		console.log("wizardEntries", wizardEntries[0][1]);

		const modifiedWizardEntries = Object.fromEntries(
			Object.entries(wizardEntries[0][1]).filter(
				([, entry]) => !entry.ShortReason
			)
		);

        const newItem = {
            build: modifiedWizardEntries,
            table: "wizardBuild",
        };
        dispatch(addToCompletedBuild(newItem));
    };
	
	const fetchRandomizedBuild = async (formFields) => {
		if (window.confirm("Are you sure, this will overwrite your existing build!") == false) {
			return false;
		} 
		const randomBuild = await wizardAlgorithm(formFields);
		if (randomBuild) {
			return randomBuild;
		}
		return false;
	};

	const handleWizardBuild = (randomBuild) => {
		if (!randomBuild) {
			return false;
		}
		console.log("randomBuild.partObj", randomBuild.partObj);
		setCurrentBuild(randomBuild.partObj);
		setCurrentPrice(randomBuild.totalPrice);
		console.log(currentBuild);
		return true;
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
	
	const clearForm = () => {
		setFormFields({
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
	};

	const toggleChoosePart = (newChoice) => {
		if (chosenPart === newChoice) {
			setChosenPart("");
		} else {
			setChosenPart(newChoice);
		}
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

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (Number.isNaN(formFields.price) || formFields.price === 0 || formFields.price === undefined) {
			displayError("Price must be a number between 500-5000");
		}

		if (formFields.price < 500 || formFields.price > 5000) {
			displayError("Price must be between 500-5000");
		}

		if (formFields.otherColor !== "" && formFields.colorPreference !== "other") {
			let resetValue = "";
			event.target.otherColor.value = resetValue;
			formFields.otherColor = resetValue;
		}

		try {
			const fetchBuild = await fetchRandomizedBuild(formFields);
			if (fetchBuild) {
				const handle = handleWizardBuild(fetchBuild);
				if (handle) handleAddToWizard(currentBuild);
			}
			//console.log(formFields);
		} catch (error) {
			displayError(error);
			console.error(error);
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
    							{Object.keys(wizardVal).map(
    								(key, idx) =>
										key !== "table" && key !== "totalPrice" && (
										<ListGroup.Item
											onClick={() => toggleChoosePart(wizardVal[key].Name)}
											key={key}>
											{key}: {wizardVal[key].Name || "None"}
											{renderAdditionalInfo(wizardVal[key])}
										</ListGroup.Item>
    							))}
								<ListGroup.Item>
									Total price: {wizardVal.totalPrice}€
								</ListGroup.Item>
    							<Button
    								className="user-select-button"
    								onClick={() => handleRemoveFromWizard(wizardKey)}>
    								<span>Remove</span>
    							</Button>
    							<Button
    								className="user-select-button"
    								onClick={() => handleAddToCompletedBuild(wizardKey)}>
    								<span>Add to build (This will overwrite any existing build)</span>
    							</Button>
    						</p>
    					</ListGroup.Item>
    				))}
    			</ListGroup>
    		);
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
			const formMapping = {
				useCase: {
					noPreference: "No preference",
					gaming: "Gaming",
					work: "Work/Office",
					streaming: "Streaming",
					generalUse: "General Use/Browsing",
					editing: "Video/Photo editing",
					workstation: "Workstation"
				},
				performancePreference: {
					noPreference: "No preference",
					maxGpu: "Maximum graphics power",
					maxCpu: "Maximum processing power",
					maxRamAmount: "Maximum RAM amount",
					maxRamSpeed: "Maximum RAM speed",
					maxStorageAmount: "Maximum storage amount",
					maxEfficiency: "Maximum efficiency"
				},
				formFactor: {
					noPreference: "No preference",
					smallest: "Smallest possible/HTPC sized",
					small: "Smaller ITX sized",
					medium: "Regular ATX sized",
					large: "Larger E-ATX sized",
					largest: "No upper limit"
				},
				colorPreference: {
					noPreference: "No preference",
					black: "Black",
					white: "White",
					red: "Red",
					blue: "Blue",
					other: "Other"
				},
				rgbPreference: {
					noPreference: "No preference",
					noRgb: "No RGB if possible",
					minimumRgb: "Small amount of RGB",
					largeRgb: "Large amount of RGB",
					maximumRgb: "Maximum amount of RGB"
				},
			}
			return (
				<Container id="wizardForm">
					<Form onSubmit={handleSubmit} className="wizardForm">
						<div className="d-flex justify-content-end mb-3">
							<CloseButton onClick={closeForm} />
						</div>
						<h2>Computer Wizard</h2>
						<Alert variant="warning" className="wizardNotice">
							<b>Notice</b>: Depending on your wizard settings, some builds may not populate all parts. <br />
							Certain combinations of preferences might result in incomplete builds due to compatibility or availability limits.
						</Alert>
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
								{(Object.entries(formMapping.useCase).map(([key, value]) =>
									<option value={key}>{value}</option>
							 		)
								)}
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
								{(Object.entries(formMapping.performancePreference).map(([key, value]) =>
									<option value={key}>{value}</option>
							 		)
								)}
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
								{(Object.entries(formMapping.formFactor).map(([key, value]) =>
									<option value={key}>{value}</option>
							 		)
								)}
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
								{(Object.entries(formMapping.colorPreference).map(([key, value]) =>
									<option value={key}>{value}</option>
							 		)
								)}
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
								{(Object.entries(formMapping.rgbPreference).map(([key, value]) =>
									<option value={key}>{value}</option>
							 		)
								)}
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
						<Button variant="primary" onClick={() => clearForm()}>
							Clear settings
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
			const formMapping = {
				cpuManufacturer: {
					noPreference: "No preference",
					amdPreference: "AMD",
					intelPreference: "Intel"
				},
				gpuManufacturer: {
					noPreference: "No preference",
					amdPreference: "AMD",
					nvidiaPreference: "NVIDIA",
					intelPreference: "Intel"
				},
				psuBias: {
					noPreference: "No preference",
					bestEfficiency: "Better efficiency/Lower wattage",
					balanced: "Balanced efficiency & wattage",
					highWattage: "Higher wattage/Worse efficiency"
				},
				storageBias: {
					noPreference: "No preference",
					onlyM2: "Only M.2 SSDs",
					onlySsd: "Only SSDs",
					bootSsd: "Boot SSD with any mixture of storage",
					balanced: "Any mixture of storage",
					onlyHdd: "Only HDDs"
				},
				additionalStorage: {
					noPreference: "No preference",
					noAdded: "No additional storage",
					oneAdded: "1 extra storage drive",
					twoAdded: "2 extra storage drives",
					threeAdded: "3 extra storage drive",
					maxAdded: "As many as I can get"
				}
			}
			return (
				<div>
					<Form.Group controlId="cpuManufacturer">
						<Form.Label>CPU Manufacturer:</Form.Label>
						<Form.Control
							as="select"
							name="cpuManufacturer"
							value={formFields.cpuManufacturer}
							onChange={handleInputChange}>
							{(Object.entries(formMapping.cpuManufacturer).map(([key, value]) =>
								<option value={key}>{value}</option>
								)
							)}
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
							{(Object.entries(formMapping.gpuManufacturer).map(([key, value]) =>
								<option value={key}>{value}</option>
								)
							)}
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
							{(Object.entries(formMapping.psuBias).map(([key, value]) =>
								<option value={key}>{value}</option>
								)
							)}
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
							{(Object.entries(formMapping.storageBias).map(([key, value]) =>
								<option value={key}>{value}</option>
								)
							)}
						</Form.Control>
					</Form.Group>
					<br />

					<Form.Group>
						<Form.Label>Additional storage:</Form.Label>
							<Form.Control
								type="text"
								value=""
								placeholder="Soon to be added"
								disabled
								readOnly>
							</Form.Control>
					</Form.Group>
					{false && ( // Hide until it is actually used3
					 	<>
						<Form.Group controlId="additionalStorage">
							<Form.Label>Additional storage:</Form.Label>
							<Form.Control
								as="select"
								name="additionalStorage"
								value={formFields.additionalStorage}
								onChange={handleInputChange}>
								{(Object.entries(formMapping.additionalStorage).map(([key, value]) =>
									<option value={key}>{value}</option>
									)
								)}
							</Form.Control>
						</Form.Group>
						<br />
						</>
					)}
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
