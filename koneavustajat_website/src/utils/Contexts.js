import React, { useEffect, useState, createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import { checkIfSignedIn, refreshProfile } from '../api/api';

// Create contexts
const ThemeContext = createContext();
const LanguageContext = createContext();
const ContentContext = createContext();
const ModalContext = createContext();
const AuthContext = createContext();

export const useTheme = () => useContext(ThemeContext);
export const useLanguage = () => useContext(LanguageContext);
export const useContent = () => useContext(ContentContext);
export const useModal = () => useContext(ModalContext);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [currentUser, setCurrentUser] = useState(null);

	// Check if the user is signed in on page load
	const fetchUserStatus = async () => {
		try {
			// Initialize currentUser with user data
			const userData = await checkIfSignedIn();
			if (userData) {
				// Refresh profile
				const refreshedUserData = await refreshProfile();
				setCurrentUser(refreshedUserData);
			} else {
				setCurrentUser(null);
			}
		} catch (error) {
			console.error("Error fetching user status:", error);
			setCurrentUser(null);
		}
	};
	useEffect(() => {
		fetchUserStatus();
	}, []);

	const handleUserChange = (event) => {
		setCurrentUser(event);
	};
	
	const refreshProfileData = async () => {
		const refreshedUserData = await refreshProfile();
		setCurrentUser(refreshedUserData);
	};
	return (
		<AuthContext.Provider value={{ currentUser, handleUserChange, refreshProfileData }}>
			{children}
		</AuthContext.Provider>
	);
};

export const ThemeProvider = ({ children }) => {
    // Initialize theme from local storage or default to "light"
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

    // Update local storage when theme changes
    useEffect(() => {
        localStorage.setItem("theme", theme);
        document.body.setAttribute("data-theme", theme);  // Apply the theme to the document body
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const LanguageProvider = ({ children }) => {

	const [language, setLanguage] = useState(localStorage.getItem("language") || "en");

	useEffect(() => {
		localStorage.setItem("language", language);
	}, [language]);

	const changeLanguage = (newLanguage) => {
		if (!["en", "fi"].includes(newLanguage)) {
			console.error("Unsupported language:", newLanguage);
		}
		setLanguage(newLanguage);
	};

	return (
		<LanguageContext.Provider value={{ language, changeLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
};

export const ContentProvider = ({ fetchContent, children }) => {
	const [content, setContent] = useState({});
	const [overridenContent, setOverridenContent] = useState({});
	const location = useLocation();

	const fetchPageContent = async (identifiers) => {
        if (typeof identifiers !== "object") {
            throw new Error(`Page identifiers should be an object with "page" (Required), "section" (Optional) & "specific" (Optional).`);
        }
		try {
			const data = await fetchContent(identifiers);
			setContent(data);
		} catch (error) {
			console.error(`Error fetching content for page ${identifiers}:`, error);
		}
	};

	const fetchPageContentOverride = async (identifiers) => {
        if (typeof identifiers !== "object") {
            throw new Error(`Page identifiers should be an object with "page" (Required), "section" (Optional) & "specific" (Optional).`);
        }
		try {
			const data = await fetchContent(identifiers);
            setOverridenContent(data);
			return overridenContent;
		} catch (error) {
			console.error(`Error fetching content for page ${identifiers}:`, error);
		}
	};

	useEffect(() => {
		// Extract page name from the current route
		const page = location.pathname === "/" ? "home" : location.pathname.slice(1);
		fetchPageContent({ page: page });
        console.log(`Fetching content to: ${page}`);
	}, [location]);

	return (
		<ContentContext.Provider value={{ content, fetchPageContent, overridenContent, fetchPageContentOverride }}>
			{children}
		</ContentContext.Provider>
	);
};

export const ModalProvider = ({ children }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [modalContent, setModalContent] = useState(null);

	const openModal = (content) => {
		setModalContent(content);
		setIsOpen(true);
	};

	const closeModal = () => {
		setModalContent(null);
		setIsOpen(false);
	};

	return (
		<ModalContext.Provider value={{ isOpen, modalContent, openModal, closeModal }}>
			{children}
		</ModalContext.Provider>
	);
};