import React, { useEffect, useState } from "react";
import { useLanguage, useContent } from "./Contexts";
import { fetchContent } from "../api/api";

export const useRenderContent = () => {
	const { language } = useLanguage();
	const { content, overridenContent } = useContent();
	const renderContent = (identifier, fallback = "Content could not be loaded") => {
		if (content && content[identifier]) {
			return content[identifier][language || "en"] || fallback;
		}
		if (overridenContent && overridenContent[identifier]) {
			return overridenContent[identifier][language || "en"] || fallback;
		}
		return fallback;
	};

	return renderContent;
};

export const fetchPageContent = async (identifiers) => {
	if (typeof identifiers !== "object") {
		throw new Error(`Page identifiers should be an object with "Page" (Required), "Section" (Optional) & "Specific" (Optional).`);
	}
    try {
        const data = await fetchContent(identifiers);
        return data;
    } catch (error) {
        console.error(`Error while fetching content:`, error);
    }
};
