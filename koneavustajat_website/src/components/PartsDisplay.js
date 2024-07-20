import React, { useState, useEffect } from 'react';
import { fetchDynamicData } from '../api/api'; 

const PartsDisplay = ({ partName = "cpu" }) => {
  const [parts, setParts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchParts = async (page) => {
    setLoading(true);
    try {
      const data = await fetchDynamicData(page, 'part', partName);
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }
      setParts(data);
    } catch (error) {
      console.error('Error fetching parts:', error);
      setError(`Error fetching parts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts(page);
  }, [partName, page]);

  if (loading) {
    return <div>Loading parts...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (parts.length === 0) {
    return <div>No parts available</div>;
  }

  return (
    <div>
      <h1>Parts</h1>
      <ul>
        {parts.map((part) => (
          <li key={part.ID}>
            <strong>ID:</strong> {part.ID} <br />
            <strong>Name:</strong> {part.Name || 'Unknown Name'} <br />
            <strong>Price:</strong> {part.Price || 'N/A'} <br />
          </li>
        ))}
      </ul>
      <button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page <= 1}>
        Previous
      </button>
      <button onClick={() => setPage(page + 1)}>
        Next
      </button>
    </div>
  );
};

export default PartsDisplay;
