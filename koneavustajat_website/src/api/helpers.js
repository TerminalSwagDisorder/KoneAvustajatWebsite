// File name: helpers.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for api helpers

import { fetchServerRoutes } from "./api";
import React, { useEffect, useState, createContext, useContext } from "react";
import "../style/style.scss";

export const checkAllowedTableNames = async (routeTypeArr, tableName) => {
    if (!Array.isArray(routeTypeArr)) {
        // console.error("Function parameter 1 must be an array!");
        throw new Error("Function parameter 1 must be an array!");
    }

    const allowedTableNamesArray = [];
    const allRoutes = await fetchServerRoutes();
    
    const transformRouteTypes = routeTypeArr.map((col) => col.toLowerCase());

    for (let route in allRoutes) {
        if (transformRouteTypes.includes(route.toLowerCase())) {
            for (let r of allRoutes[route]) {
                const path = r.path.toLowerCase().includes("/api/") ? r.path.split("/api/")[1] : r.path;
                allowedTableNamesArray.push(path);
            }
        }
    }

    if (!allowedTableNamesArray.includes(tableName) || tableName === "") {
        // console.error(`tableName "${tableName}" is not allowed!`);
        throw new Error(`tableName "${tableName}" is not allowed!`);
    }

    return allowedTableNamesArray;
};

export const checkAllowedPartNames = async (partName) => {
    const allowedPartNamesArray = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory", "inventory"];

    if (!allowedPartNamesArray.includes(partName) || partName === "") {
        throw new Error(`partName "${partName}" is not allowed!`);
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
                throw new Error(`Invalid array element: ${term}. Expected a string.`);
            }
        }
    } else {
        throw new Error(`Something went wrong with searchTerms => ${searchTerms}`);
    }

    return correctSearchTerms;
};

export const checkSearchTerms = async (searchTerms) => {
    if (typeof searchTerms !== "object") {
        console.log("Try to keep searchTerms as an object!");
    }

    let correctSearchTerms = {};

    if (typeof searchTerms === "string" && searchTerms !== undefined && searchTerms !== null && searchTerms !== "") {
        correctSearchTerms[searchTerms] = searchTerms;
    } else if (Array.isArray(searchTerms)) {
        for (const term of searchTerms) {
            if (typeof term === "string" && term !== undefined && term !== null && term !== "") {
                correctSearchTerms[term] = term;
            } else {
                throw new Error(`Invalid array element: ${term}. Expected a string.`);
            }
        }
    } else if (typeof searchTerms === "object" && searchTerms !== null) {
        for (const term in searchTerms) {
            if (searchTerms[term] === undefined || searchTerms[term] === null || searchTerms[term] === "") {
                delete searchTerms[term];
            }
        }
        correctSearchTerms = searchTerms;
    } else {
        throw new Error(
            `Invalid searchTerms type. Expected an object, array, or string but received: ${typeof searchTerms}`
        );
    }

    return correctSearchTerms;
};

export const buildQuery = async (correctSearchTerms, itemsBool, page = null) => {
    if (Array.isArray(correctSearchTerms)) {
        throw new Error("Invalid function parameter 1. Expected an object but received: Array");
    }

    if (typeof correctSearchTerms !== "object" || correctSearchTerms === null) {
        throw new Error(`Invalid function parameter 1. Expected an object but received: ${typeof correctSearchTerms}`);
    }

    if (typeof itemsBool !== "boolean") {
        throw new Error(`Invalid function parameter 2. Expected a boolean but received: ${typeof itemsBool}`);
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