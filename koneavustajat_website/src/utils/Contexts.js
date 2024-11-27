import React, { useEffect, useState, createContext, useContext } from "react";

// Light & Darkmode switch
// Create a context for the theme
export const ThemeContext = createContext();
export const LanguageContext = createContext();

export const useTheme = () => useContext(ThemeContext);
export const useLanguage = () => useContext(LanguageContext);

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