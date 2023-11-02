// Geolocation.tsx
import React, { useState, useEffect } from 'react';

interface PositionState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
}

const Geolocation: React.FC = () => {
  const [position, setPosition] = useState<PositionState>({
    latitude: null,
    longitude: null,
    error: null
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // console.log(`Latitude: ${position.coords.latitude}`);
        // console.log(`Longitude: ${position.coords.longitude}`);

        setPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null
        });
      },
      (error) => {
        console.error("Error occurred while fetching location:", error.message);
        setPosition(prev => ({ ...prev, error: error.message }));
      }
    );
  }, []);

  return (
    <div>
      {position.error ? (
        <div>
          {/* <p>Error: {position.error}</p> */}
          <p>リングを追加するには、GPSの許可が必要です</p>
        </div>
      ) : (
        <>
          <p>現在地</p>
          <p>Latitude: {position.latitude}</p>
          <p>Longitude: {position.longitude}</p>
        </>
      )}
    </div>
  );
};

export default Geolocation;
