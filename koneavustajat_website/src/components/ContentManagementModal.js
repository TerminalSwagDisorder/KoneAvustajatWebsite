// components/ContentManagementModal.js
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { useModal, useLanguage } from "../utils/Contexts";
import { useLocation } from "react-router-dom";

const ContentManagementModal = ({ fetchWholeContent, fetchContentIdentifiers }) => {
	const { isOpen, modalContent, closeModal } = useModal();
    const { language } = useLanguage();
	const location = useLocation();
	const [mode, setMode] = useState("add");
	const [formFields, setFormFields] = useState({
	    Site_Identifier: "",
	    Identifiers: { page: "", section: "", specific: "" },
	    Main_Tag: "p",
	    Content_Text: "",
	    Content_Type: "site_text"
	});
	const [availableIdentifiers, setAvailableIdentifiers] = useState([]);
	const [availableLanguages, setAvailableLanguages] = useState([]);
	const [warning, setWarning] = useState("");
    const [languageOverride, setLanguageOverride] = useState("");
    const [wholeContent, setWholeContent] = useState([]);

	useEffect(() => {
		if (mode === "update") {
			fetchIdentifiers();
		}
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

    const fetchIdentifiers = async () => {
        const identifiers = await fetchContentIdentifiers();
        setAvailableIdentifiers(identifiers[0]);
        setAvailableLanguages(identifiers[1]);
    };

    const addMode = async () => {
		setFormFields({
			Site_Identifier: "",
            Identifiers: { page: location.pathname === "/" ? "home" : location.pathname.slice(1), section: "", specific: "" },
			Main_Tag: "p",
			Content_Text: "",
			Content_Type: "site_text",
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
                Content_Text: "",
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

	// Handle mode toggle
	/*const toggleMode = () => {
		setMode((prev) => (prev === "add" ? "update" : "add"));
		setFormFields({
			Site_Identifier: "",
            Identifiers: { page: "", section: "", specific: "" },
			Main_Tag: "p",
			Content_Text: "",
			Content_Type: "site_text",
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
        });
        setWarning("");
        setWholeContent([]);
        setLanguageOverride("");
    };

	const handleSubmit = () => {
		console.log("Submitting form:", formFields);
	};

	return (
		<Modal show={isOpen} onHide={closeModal} centered className="cms-modal">
			<Modal.Header closeButton>
				<Modal.Title>{mode === "add" ? "Add Content" : "Update Content"}</Modal.Title>
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
						<Form.Label>Site Identifier</Form.Label>
						{mode === "add" ? (
                            <>
                                <Form.Control
                                    type="text"
                                    name="Identifiers.page"
                                    value={formFields.Identifiers.page}
                                    onChange={handleChange}
                                    placeholder="page"
                                />
                                <Form.Control
                                    type="text"
                                    name="Identifiers.section"
                                    value={formFields.Identifiers.section}
                                    onChange={handleChange}
                                    placeholder="section"
                                />
                                <Form.Control
                                    type="text"
                                    name="Identifiers.specific"
                                    value={formFields.Identifiers.specific}
                                    onChange={handleChange}
                                    placeholder="specific"
                                />
                            </>
						) : (
							<Form.Select value={formFields.Site_Identifier} onChange={handleIdentifierSelect}>
								<option value="">Select an identifier</option>
								{availableIdentifiers.map((id) => (
									<option key={id} value={id}>
										{id}
									</option>
								))}
							</Form.Select>
						)}
					</Form.Group>
					<Form.Group className="mb-3">
                    <Form.Label>Language</Form.Label>
                    <Form.Select value={languageOverride || language} onChange={overrideLanguage}>
                        {availableLanguages.map((id) => (
                            <option key={id} value={id}>
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
				</Form>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="secondary" onClick={closeModal}>
					Close
				</Button>
				<Button variant="primary" onClick={handleSubmit}>
					{mode === "add" ? "Add Content" : "Update Content"}
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default ContentManagementModal;
