import React, { useState, useEffect } from "react";
import { fetchDynamicData } from "../api/api";

const PartsList = ({ partName, onSelectPart }) => {
    const [parts, setParts] = useState([]);
    const [page, setPage] = useState(0);

    useEffect(() => {
        const loadParts = async () => {
            try {
                const data = await fetchDynamicData(page, 'part', partName);
                setParts(data);
            } catch (error) {
                console.error(error);
            }
        };

        loadParts();
    }, [partName, page]);

    return (
        <div>
            <h1>{partName} List</h1>
            <ul>
                {parts.map((part) => (
                    <li key={part.ID} onClick={() => onSelectPart(part.ID)}>
                        {part.name}
                    </li>
                ))}
            </ul>
            <button onClick={() => setPage(page - 1)} disabled={page <= 0}>
                Previous
            </button>
            <button onClick={() => setPage(page + 1)}>
                Next
            </button>
        </div>
    );
};

export default PartsList;
