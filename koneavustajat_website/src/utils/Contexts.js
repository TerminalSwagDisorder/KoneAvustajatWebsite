import React, { useEffect, useState, createContext, useContext, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { checkIfSignedIn, refreshProfile, handleSignout } from '../api/api';

// Create contexts
const ThemeContext = createContext();
const LanguageContext = createContext();
const ContentContext = createContext();
const ModalContext = createContext();
const AuthContext = createContext();
const PaymentContext = createContext();
const ErrorContext = createContext();

export const useTheme = () => useContext(ThemeContext);
export const useLanguage = () => useContext(LanguageContext);
export const useContent = () => useContext(ContentContext);
export const useModal = () => useContext(ModalContext);
export const useAuth = () => useContext(AuthContext);
export const usePayment = () => useContext(PaymentContext);
export const useError = () => useContext(ErrorContext);

export const AuthProvider = ({ children }) => {
	const [currentUser, setCurrentUser] = useState(null);
    const { displayError } = useError();
  	const errorDisplayedRef = useRef(false); // To avoid repeated error messages
	const currentUserRef = useRef(currentUser);
	const timeoutRef = useRef(null);


	// Check if the user is signed in on page load
	const fetchUserStatus = async () => {
		try {
			// Initialize currentUser with user data
			const userData = await checkIfSignedIn();
			if (userData && userData.userData) {
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
		currentUserRef.current = currentUser;
	}, [currentUser]);

	useEffect(() => {
		fetchUserStatus();
	}, []);

	useEffect(() => {
		const checkLoginStatus = async () => {
			try {
				const currentLogin = await checkIfSignedIn();
				let delay = 20000;

				if (currentUserRef.current) {
					delay = 10000;
					if (currentLogin.message !== "Authenticated") {
						if (!errorDisplayedRef.current) {
							//await refreshProfileData();
							await handleSignout();
							setCurrentUser(null);
							displayError("You have been logged out!");
							errorDisplayedRef.current = true;
						}
					} else {
						errorDisplayedRef.current = false;
						delay = 20000;
					}
				}
				timeoutRef.current = setTimeout(checkLoginStatus, delay);
			} catch (error) {
				console.error("Error checking login status:", error.message || error);
				timeoutRef.current = setTimeout(checkLoginStatus, 10000);
			}
		};

		timeoutRef.current = setTimeout(checkLoginStatus, 3000);

		return () => {
			clearTimeout(timeoutRef.current);
		};
	}, [displayError]);

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
			return data;
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
			return data;
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
	const { currentUser } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [modalContent, setModalContent] = useState(null);

	const openModal = (content) => {
        if (!currentUser || currentUser.RoleID !== 4) {
			setModalContent(null);
			setIsOpen(false);
            console.warn("Unauthorized attempt to open modal.");
            return;
        }
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

export const PaymentProvider = ({ children }) => {
	const [clientSecret, setClientSecret] = useState(null);

	return (
		<PaymentContext.Provider value={{ clientSecret, setClientSecret }}>
			{children}
		</PaymentContext.Provider>
	);
};

export const ErrorProvider = ({ children }) => {
	const [errorContent, setErrorContent] = useState(null);
	const [type, setType] = useState(null);
	const timerRef = useRef(null);

	const displayError = useCallback((content, errorType = "error") => {
		setErrorContent(content.message ? content.message : content);
		setType(errorType);

		if (timerRef.current) clearTimeout(timerRef.current);

		timerRef.current = setTimeout(() => {
			setErrorContent(null);
			setType(null);
		}, 5000);
	}, []);

	const clearError = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		setErrorContent(null);
		setType(null);
	}, []);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	return (
		<ErrorContext.Provider value={{ errorContent, type, displayError, clearError }}>
			{children}
		</ErrorContext.Provider>
	);
};