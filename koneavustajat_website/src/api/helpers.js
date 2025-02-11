// File name: helpers.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for api helpers

import { fetchServerRoutes } from "./api";
import React, { useEffect, useState, createContext, useContext } from "react";
import "../style/style.scss";

export const checkAllowedTableNames = async (routeTypeArr, tableName) => {
    if (!Array.isArray(routeTypeArr)) {
        // console.error("Function parameter 1 must be an array!");
        throw ("Function parameter 1 must be an array!");
    }

    const allowedTableNamesArray = [];
    const allRoutes = await fetchServerRoutes();
    const transformRouteTypes = routeTypeArr.map((col) => col.toLowerCase());

    for (let route in allRoutes) {
        if (transformRouteTypes.includes(route.toLowerCase())) {
            for (let r of allRoutes[route]) {
                let path = r.path.toLowerCase();

                path = path.includes("/api/") ? path.split("/api/")[1] : path;

                allowedTableNamesArray.push(path);
            }
        }
    }

    const isTableNameAllowed = allowedTableNamesArray.some((allowedRoute) => {
        const allowedSegments = allowedRoute.split("/");
        const tableNameSegments = tableName.split("/");

        if (allowedSegments.length !== tableNameSegments.length) {
            return false;
        }

        return allowedSegments.every((segment, index) => {
            return segment.startsWith(":") || segment === tableNameSegments[index];
        });
    });

    if (!isTableNameAllowed || tableName === "") {
        throw (`tableName "${tableName}" is not allowed!`);
    }

    return allowedTableNamesArray;
};

export const checkAllowedPartNames = async (partName) => {
    const allowedPartNamesArray = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory", "inventory"];

    if (!allowedPartNamesArray.includes(partName) || partName === "") {
        throw (`partName "${partName}" is not allowed!`);
    }

    return true;
};

export const checkSearchTerms2 = async (searchTerms) => {
    let correctSearchTerms = {};
    if (!Array.isArray(searchTerms) && (typeof searchTerms !== "object" || searchTerms !== null)) {
        console.log("Try to keep searchTerms as an object!");
        if (typeof searchTerms === "string") {
            correctSearchTerms[searchTerms] = searchTerms;
        }
    } else if (Array.isArray(searchTerms)) {
        for (const term of searchTerms) {
            if (typeof term === "string") {
                correctSearchTerms[term] = term;
            } else {
                throw(`Invalid array element: ${term}. Expected a string.`);
            }
        }
    } else {
        throw(`Something went wrong with searchTerms => ${searchTerms}`);
    }

    return correctSearchTerms;
};

export const checkSearchTerms = async (searchTerms) => {
    if (typeof searchTerms !== "object") {
        console.log("Try to keep searchTerms as an object!");
    }

    let correctSearchTerms = {};

    if (typeof searchTerms === "string" && searchTerms !== undefined && searchTerms !== null && searchTerms !== "") {
        correctSearchTerms.tableName = searchTerms;
    } else if (Array.isArray(searchTerms)) {
        for (const term of searchTerms) {
            if (typeof term === "string" && term !== undefined && term !== null && term !== "") {
                correctSearchTerms.tableName = term;
            } else {
                throw(`Invalid array element: ${term}. Expected a string.`);
            }
        }
    } else if (typeof searchTerms === "object" && searchTerms !== null) {
        for (const term in searchTerms) {
            if (correctSearchTerms.tableName === undefined || correctSearchTerms.tableName === null || correctSearchTerms.tableName === "") {
                delete correctSearchTerms.tableName;
            }
        }
        correctSearchTerms = searchTerms;
    } else {
        throw(
            `Invalid searchTerms type. Expected an object, array, or string but received: ${typeof searchTerms}`
        );
    }

    return correctSearchTerms;
};

export const buildQuery = async (correctSearchTerms, itemsBool, page = null) => {
    if (Array.isArray(correctSearchTerms)) {
        throw("Invalid function parameter 1. Expected an object but received: Array");
    }

    if (typeof correctSearchTerms !== "object" || correctSearchTerms === null) {
        throw(`Invalid function parameter 1. Expected an object but received: ${typeof correctSearchTerms}`);
    }

    if (typeof itemsBool !== "boolean") {
        throw(`Invalid function parameter 2. Expected a boolean but received: ${typeof itemsBool}`);
    }

    const params = new URLSearchParams();
    for (const term in correctSearchTerms) {
        if (term !== "page") {
            params.append(term, correctSearchTerms[term]);
        }
    }

    if (page !== null) {
        params.append("page", page);
    } else if (correctSearchTerms.page) {
        params.append("page", correctSearchTerms.page);
    }

    if (itemsBool) params.append("items", 50);
    const query = params.toString();

    return query;
};

export const validateIdentifiers = async (identifiers) => {
    const hierarchy = ["page", "section", "specific"];
    const identifierKeys = Object.keys(identifiers);

    // Map keys to their corresponding hierarchy levels
    const levels = identifierKeys.map((key) => hierarchy.indexOf(key));

    // Check for invalid keys
    if (levels.includes(-1)) {
        console.error("Invalid keys found in identifiers");
        return false;
    }

    // Sort the levels to ensure they are in order
    levels.sort((a, b) => a - b);

    // Check that levels are contiguous starting from 0
    for (let i = 0; i < levels.length; i++) {
        if (levels[i] !== i) {
            console.error("Invalid hierarchy in identifiers");
            return false;
        }
    }

    // Identifiers are valid
    return true;
};

export const checkRes = async (response, data) => {
	if (!response.ok) {
		//alert(`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
		throw (`HTTP error ${response.status}: ${data.message ? data.message : response.message}`);
	}
	return response.ok;
};

export const sanitizeData = (data) => {
	if (data === null || data === undefined) {
		return "";
	}

	if (Array.isArray(data)) {
		return data.map(sanitizeData);
	}

	if (typeof data === "object") {
		return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, sanitizeData(value)]));
	}

	return data;
};