import React, { useState, useEffect } from 'react';

const PartsDisplay = () => {
  const [parts, setParts] = useState([]);
  const [error, setError] = useState(null);

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/part');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setParts(result);
    } catch (error) {
      console.error('Error fetching parts:', error);
      setError('Error fetching parts');
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

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
          <li key={part.PartID}>
            <strong>ID:</strong> {part.PartID} <br />
            <strong>Name:</strong> {part.PartName} <br />
            <strong>Description:</strong> {part.PartDescription} <br />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PartsDisplay;

