import React, { useEffect, useState } from "react";
import { useLanguage, useContent } from "./Contexts";

export const useRenderContent = () => {
	const { language } = useLanguage();
	const { content } = useContent();

	const renderContent = (identifier, fallback = "Content could not be loaded") => {
		if (content && content[identifier]) {
			return content[identifier][language] || fallback;
		}
		return fallback;
	};

	return renderContent;
};

export const fetchPageContent = async (fetchContent, identifiers, setContent) => {
    try {
        const data = await fetchContent(identifiers);
        setContent(data);
    } catch (error) {
        console.error(`Error while fetching content:`, error);
    }
};
