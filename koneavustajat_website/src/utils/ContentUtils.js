import React, { useEffect, useState } from "react";
import { useLanguage } from "./Contexts";

export const useRenderContent = () => {
	const { language } = useLanguage();

	const renderContent = (content, identifier, fallback = "Content could not be loaded") => {
		if (content && content[identifier]) {
			return content[identifier][language] || fallback;
		}
		return fallback;
	};

	return renderContent;
};

export const fetchPageContent = async (fetchContent, { page, section = "", specific = "" }, setContent) => {
	try {
		const data = await fetchContent({ page, section, specific });
		setContent(data);
	} catch (error) {
		console.error(`Error while fetching content for ${page}:`, error);
	}
};
