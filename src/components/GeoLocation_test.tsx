// Geolocation_test.tsx

import React, { useState, useEffect } from 'react';

interface PositionState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
}

interface GeolocationProps {
  setPosition: (latitude: number, longitude: number) => void;
}

const Geolocation_test: React.FC<GeolocationProps> = ({ setPosition }) => {
  const [position, setLocalPosition] = useState<PositionState>({
    latitude: null,
    longitude: null,
    error: null
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocalPosition(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // console.log(`Latitude: ${latitude}`);
        // console.log(`Longitude: ${longitude}`);

        // 位置情報を親コンポーネントに送る
        setPosition(latitude, longitude);

        setLocalPosition({
          latitude: latitude,
          longitude: longitude,
          error: null
        });
      },
      (error) => {
        console.error("Error occurred while fetching location:", error.message);
        setLocalPosition(prev => ({ ...prev, error: error.message }));
      }
    );
  }, [setPosition]);

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

export default Geolocation_test;
