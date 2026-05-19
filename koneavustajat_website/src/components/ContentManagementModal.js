// components/ContentManagementModal.js
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { useModal, useLanguage, useContent, useError } from "../utils/Contexts";
import { useRenderContent } from "../utils/ContentUtils";
import { useLocation } from "react-router-dom";

const ContentManagementModal = ({ fetchWholeContent, fetchContentIdentifiers, addContent, updateContent}) => {
	const renderContent = useRenderContent();
	const { displayError } = useError();
	const { isOpen, modalContent, closeModal } = useModal();
	const { fetchPageContent } = useContent();
	const { language } = useLanguage();
	const location = useLocation();
	const [mode, setMode] = useState("add");
	const [formFields, setFormFields] = useState({
		Site_Identifier: "",
		Identifiers: { page: "", section: "", specific: "" },
		Main_Tag: "p",
		Content_Text: "",
		Content_Type: "site_text", 
		Status: "",
		Language: ""
	});
	const [availableIdentifiers, setAvailableIdentifiers] = useState([]);
	const [availableLanguages, setAvailableLanguages] = useState([]);
	const [warning, setWarning] = useState("");
	const [languageOverride, setLanguageOverride] = useState("");
	const [wholeContent, setWholeContent] = useState([]);

	useEffect(() => {
		fetchIdentifiers();
		if (mode === "add") {
			addMode();
			/*
			setFormFields((prev) => ({
				...prev,
				Site_Identifier: location.pathname === "/" ? "home" : location.pathname.slice(1),
			}));
			*/
		}
	}, [mode, location]);

	useEffect(() => {
		handleFormData();
	}, [languageOverride, wholeContent, language]);

	useEffect(() => {
		handleLocationWarning();
	}, [location]);

	const fetchIdentifiers = async () => {
		try {
			const identifiers = await fetchContentIdentifiers();
			setAvailableIdentifiers(identifiers[0]);
			setAvailableLanguages(identifiers[1]);
		} catch {
			console.error("Failed to fetch identifiers");
		}
	};

	const addMode = async () => {
		setFormFields({
			Site_Identifier: "",
			Identifiers: { page: location.pathname === "/" ? "home" : location.pathname.slice(1), section: "", specific: "" },
			Main_Tag: "p",
			Content_Text: "",
			Content_Type: "site_text", 
			Status: "",
			//Language: formFields.Language || languageOverride || language
		});
		setWarning("");
	};

	const overrideLanguage = (event) => {
		setLanguageOverride(event.target.value);
	};

/*
	const handleFormData = () => {
		const langData = wholeContent?.find(item => item.Language === (languageOverride || language));
		if (langData) {
			setFormFields(langData);
		}
	};
*/

	const handleFormData = () => {
		if (!wholeContent) return false;
		const langData = wholeContent.find(item => item.Language === (languageOverride || language));
		if (langData) {
			setFormFields((prev) => ({
				...prev,
				...langData,
				Language: langData.Language,
			}));
		} else {
			setFormFields((prev) => ({
				...prev,
				Content_Text: formFields.Content_Text, // Or Content_Text: ""
				Language: languageOverride || language,
			}));
		}
	};

	const handleChange2 = (event) => {
		setFormFields((prev) => ({ ...prev, [event.target.name]: event.target.value }));
	};

	const handleChange = (event) => {
		if (event.target.name.includes("Identifiers")) {
			const key = event.target.name.split(".")[1];
			setFormFields((prev) => ({
				...prev,
				Identifiers: {
					...prev.Identifiers,
					[key]: event.target.value,
				},
			}));
		} else if (event.target.name.includes("Status")) {
			setFormFields((prev) => ({
				...prev,
				[event.target.name]: event.target.checked ? "published" : "draft",
			}));
		} else {
			setFormFields((prev) => ({
				...prev,
				[event.target.name]: event.target.value,
			}));
		}
	};

	const handleIdentifierSelect = async (event) => {
		const identifier = event.target.value;
		setFormFields((prev) => ({ ...prev, Site_Identifier: identifier }));

		const identifiers = identifier.split(".");
		if (identifiers[0].length === 0) {
			return false;
		}
		const data = await fetchWholeContent({ page: identifiers[0], section: identifiers[1], specific: identifiers[2] });
		if (Array.isArray(data)) setWholeContent(data);

		if (identifier !== "" && !identifier.startsWith(location.pathname === "/" ? "home" : location.pathname.slice(1))) {
			setWarning("Warning: The selected identifier is outside the current page.");
		} else {
			setWarning("");
		}
	};
	
	const handleLocationWarning = () => {
		const identifier = formFields.Site_Identifier;

		if (identifier !== "" && !identifier.startsWith(location.pathname === "/" ? "home" : location.pathname.slice(1))) {
			setWarning("Warning: The selected identifier is outside the current page.");
		} else {
			setWarning("");
		}
	};

	// Handle mode toggle
	/*const toggleMode = () => {
		setMode((prev) => (prev === "add" ? "update" : "add"));
		setFormFields({
			Site_Identifier: "",
			Identifiers: { page: "", section: "", specific: "" },
			Main_Tag: "p",
			Content_Text: "",
			Content_Type: "site_text", 
			Status: "",
		});
		setWarning("");
	};*/

	const toggleMode = () => {
		setMode((prev) => (prev === "add" ? "update" : "add"));
		setFormFields({
			Site_Identifier: mode === "add" ? (location.pathname === "/" ? "home" : location.pathname.slice(1)) : "",
			Identifiers: { page: location.pathname === "/" ? "home" : location.pathname.slice(1), section: "", specific: "" },
			Main_Tag: "p",
			Content_Text: "",
			Content_Type: "site_text", 
			Status: "",
		});
		setWarning("");
		setWholeContent([]);
		setLanguageOverride("");
	};

	const handleSubmit = async () => {
		try {
			if (mode === "add") {
				formFields.Language = formFields.Language || languageOverride || language;
				const success = await addContent(formFields);
				if (success) {
					await closeModal();
					displayError(success.message, "success");
				}
			}

			if (mode === "update") {
				const identifiers = formFields.Site_Identifier.split(".");
				if (identifiers[0].length === 0) {
					return false;
				}

				const success = await updateContent(formFields);
				if (success) {
					await closeModal();
					displayError(success.message, "success");
				}
				if (success && identifiers[0].startsWith(location.pathname === "/" ? "home" : location.pathname.slice(1))) {
					await fetchPageContent({ page: identifiers[0] }); // Fetch content to be rendered

					const data = await fetchWholeContent({ page: identifiers[0], section: identifiers[1], specific: identifiers[2] }); // Fetch content for updated item, in modal
					if (Array.isArray(data)) setWholeContent(data);
				}
			}

			setLanguageOverride(language || "");
			setFormFields({
				Site_Identifier: mode === "add" ? (location.pathname === "/" ? "home" : location.pathname.slice(1)) : "",
				Identifiers: { page: location.pathname === "/" ? "home" : location.pathname.slice(1), section: "", specific: "" },
				Main_Tag: "p",
				Content_Text: "",
				Content_Type: "site_text", 
				Status: "",
				//Language: language
				});
				
		} catch (error) {
			console.error(error);
			displayError(error);
		}
	};

	return (
		<Modal show={isOpen} onHide={closeModal} centered className="cms-modal">
			<Modal.Header closeButton>
				<Modal.Title>{mode === "add" ? renderContent("contentmanagementmodal.button.submit_add", "Add Content") : renderContent("contentmanagementmodal.button.submit_update", "Update Content")}</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Form>
					<Form.Group className="mb-3">
						<Button variant="secondary" onClick={toggleMode}>
							Switch to {mode === "add" ? "Update" : "Add"} Mode
						</Button>
					</Form.Group>
					{warning && <Alert variant="warning">{warning}</Alert>}
					<Form.Group className="mb-3">
						<Form.Label>{renderContent("contentmanagementmodal.field.site_identifier", "Site Identifier")}</Form.Label>
						{mode === "add" ? (
							<>
								<Form.Control
									type="text"
									name="Identifiers.page"
									value={formFields.Identifiers.page}
									onChange={handleChange}
									placeholder={renderContent("contentmanagementmodal.placeholder.page", "page")}
								/>
								<Form.Control
									type="text"
									name="Identifiers.section"
									value={formFields.Identifiers.section}
									onChange={handleChange}
									placeholder={renderContent("contentmanagementmodal.placeholder.section", "section")}
								/>
								<Form.Control
									type="text"
									name="Identifiers.specific"
									value={formFields.Identifiers.specific}
									onChange={handleChange}
									placeholder={renderContent("contentmanagementmodal.placeholder.specific", "specific")}
								/>
							</>
						) : (
							<Form.Select className="modal-select" value={formFields.Site_Identifier} onChange={handleIdentifierSelect}>
								<option value="" className="modal-select-option">{renderContent("contentmanagementmodal.identifier.select", "Select an identifier")}</option>
								{availableIdentifiers.map((id) => (
									<option key={id} value={id} className="modal-select-option">
										{id}
									</option>
								))}
							</Form.Select>
						)}
					</Form.Group>
					<Form.Group className="mb-3">
					<Form.Label>{renderContent("contentmanagementmodal.field.language", "Language")}</Form.Label>
					<Form.Select className="modal-select" value={languageOverride || language} onChange={overrideLanguage}>
						{availableLanguages.map((id) => (
							<option key={id} value={id} className="modal-select-option">
								{id}
							</option>
						))}
					</Form.Select>
					</Form.Group>
					{["Main_Tag", "Content_Text", "Content_Type"].map((field) => (
						<Form.Group className="mb-3" key={field}>
							<Form.Label>{field.replace("_", " ")}</Form.Label>
							<Form.Control
								type={field === "Content_Text" ? "textarea" : "text"}
								name={field}
								value={formFields[field]}
								onChange={handleChange}
							/>
						</Form.Group>
					))}
					{mode === "update" && (
						<p>{renderContent("contentmanagementmodal.version.current", "Current version:")} {formFields.Version || "No version"}</p>
					)}
					<Form.Group className="mb-3">
						<Form.Check
							onChange={handleChange}
							checked={formFields.Status === "published"}
							type="checkbox"
							name="Status"
							label={renderContent("contentmanagementmodal.label.publish", "Publish")}
						/>
					</Form.Group>
				</Form>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="secondary" onClick={closeModal}>
					{renderContent("contentmanagementmodal.button.close", "Close")}
				</Button>
				<Button variant="primary" onClick={handleSubmit}>
					{mode === "add" ? renderContent("contentmanagementmodal.button.submit_add", "Add Content") : renderContent("contentmanagementmodal.button.submit_update", "Update Content")}
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default ContentManagementModal;
