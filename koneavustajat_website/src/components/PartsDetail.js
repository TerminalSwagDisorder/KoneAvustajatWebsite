import React, { useState, useEffect } from "react";
import { fetchDynamicData } from "../api/api";

const PartsDetail = ({ partName, id }) => {
    const [part, setPart] = useState(null);

    useEffect(() => {
        const loadPart = async () => {
            try {
                const data = await fetchDynamicData(0, 'part/id', partName);
                setPart(data.find(p => p.ID === id)); // Assuming data is an array and filtering by ID
            } catch (error) {
                console.error(error);
            }
        };

        loadPart();
    }, [partName, id]);

    if (!part) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>{part.name}</h1>
            <p>{part.description}</p>
            <p>Price: {part.price}</p>
        </div>
    );
};

export default PartsDetail;
