import React, { useState, useEffect } from 'react';
import { fetchDynamicData } from '../api/api'; 

const PartsDisplay = ({ partName = "cpu" }) => {
  const [parts, setParts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Add a loading state

  const fetchParts = async () => {
    setLoading(true); // Set loading to true at the beginning
    try {
      const data = await fetchDynamicData(1, 'part', partName); // Adjust page number or other parameters as needed
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }
      setParts(data);
    } catch (error) {
      console.error('Error fetching parts:', error);
      setError(`Error fetching parts: ${error.message}`);
    } finally {
      setLoading(false); // Set loading to false after data fetch completes
    }
  };

  useEffect(() => {
    fetchParts();
  }, [partName]); // Add dependencies to refetch if partName changes

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
            <strong>Name:</strong> {part.name || 'Unknown Name'} <br />
            <strong>Description:</strong> {part.description || 'No Description'} <br />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PartsDisplay;
