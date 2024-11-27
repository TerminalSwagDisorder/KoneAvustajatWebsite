import React, { useEffect, useState, createContext, useContext } from "react";
import { useLocation } from "react-router-dom";

// Create contexts
const ThemeContext = createContext();
const LanguageContext = createContext();
const ContentContext = createContext();


export const useTheme = () => useContext(ThemeContext);
export const useLanguage = () => useContext(LanguageContext);
export const useContent = () => useContext(ContentContext);


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
		console.log(language, newLanguage);
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
	const location = useLocation();

	const fetchPageContent = async (page) => {
		try {
			const data = await fetchContent({ page });
			setContent(data);
		} catch (error) {
			console.error(`Error fetching content for page ${page}:`, error);
		}
	};

	useEffect(() => {
		// Extract page name from the current route
		const page = location.pathname === "/" ? "home" : location.pathname.slice(1);
		fetchPageContent(page);
        console.log(`Fetching content to: ${page}`);
	}, [location]);

	return (
		<ContentContext.Provider value={{ content }}>
			{children}
		</ContentContext.Provider>
	);
};