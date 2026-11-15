import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapCanvas from './components/MapCanvas';
import UIControls from './components/UIControls';

export default function App() {
  const [solHour, setSolHour] = useState(12.0);
  const [isPlayingTime, setIsPlayingTime] = useState(false);

  const [geologyVisible, setGeologyVisible] = useState(true);
  const [imagesVisible, setImagesVisible] = useState(true);
  const [routeVisible, setRouteVisible] = useState(true);

  const [geologyData, setGeologyData] = useState([]);
  const [imagesData, setImagesData] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [geoRes, imgRes] = await Promise.all([
          axios.get('/api/geology'),
          axios.get('/api/images')
        ]);
        setGeologyData(geoRes.data);
        setImagesData(imgRes.data);
      } catch (err) {
        console.error('[API FETCH ERROR] Defaulting to fallback stores:', err);
      }
    };

    fetchInitialData();
    handleCalculateRoute(18.38, 77.58, 18.42, 77.40);
  }, []);

  useEffect(() => {
    let interval = null;
    if (isPlayingTime) {
      interval = setInterval(() => {
        setSolHour((prev) => {
          const next = prev + 0.1;
          return next >= 24.66 ? 0.0 : next;
        });
      }, 80);
    }
    return () => clearInterval(interval);
  }, [isPlayingTime]);

  const handleCalculateRoute = async (startLat, startLon, endLat, endLon) => {
    setRouteLoading(true);
    try {
      const response = await axios.post('/api/route', {
        start_lat: startLat,
        start_lon: startLon,
        end_lat: endLat,
        end_lon: endLon,
        steps: 70
      });
      setRouteData(response.data);
      setRouteVisible(true);
    } catch (err) {
      console.error('[ROUTE ERROR] Path calculation failed:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <main className="w-screen h-screen relative bg-[#080608] overflow-hidden select-none font-mono">
      <MapCanvas
        solHour={solHour}
        geologyVisible={geologyVisible}
        imagesVisible={imagesVisible}
        routeVisible={routeVisible}
        geologyData={geologyData}
        imagesData={imagesData}
        routeData={routeData}
        onSelectImage={(img) => setSelectedImage(img)}
      />

      <UIControls
        solHour={solHour}
        setSolHour={setSolHour}
        isPlayingTime={isPlayingTime}
        setIsPlayingTime={setIsPlayingTime}
        geologyVisible={geologyVisible}
        setGeologyVisible={setGeologyVisible}
        imagesVisible={imagesVisible}
        setImagesVisible={setImagesVisible}
        routeVisible={routeVisible}
        setRouteVisible={setRouteVisible}
        routeData={routeData}
        onCalculateRoute={handleCalculateRoute}
        routeLoading={routeLoading}
        selectedImage={selectedImage}
        onCloseImageModal={() => setSelectedImage(null)}
      />
    </main>
  );
}
