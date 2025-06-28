import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

function App() {
  const [astarcoordinates, setAstarCoordinates] = useState([]);
  const [coordinates, setCoordinates] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [start, setStart] = useState('');
  const [distance, setDistance] = useState(0);
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState('Disconnected');
  const [mapInitialized, setMapInitialized] = useState(false);

  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const boatPathRef = useRef(null);
  const boatMarkersRef = useRef([]);
  const pathMarkersRef = useRef([]);
  const weatherMarkersRef = useRef([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const options = {
      key: 'ENTER WINDY API KEY',
      verbose: true,
      zoom: 5,
    };

    windyInit(options, (windyAPI) => {
      const { map } = windyAPI;
      mapRef.current = map;
      setMapInitialized(true);

      // Initialize both polylines
      polylineRef.current = L.polyline([], {
        color: '#8B0000',
        weight: 3,
        opacity: 0.9,
      }).addTo(map);

      boatPathRef.current = L.polyline([], {
        color: '#000000',
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
    });

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  // Handle A* Path Updates
  useEffect(() => {
    if (!mapInitialized || astarcoordinates.length === 0) return;

    // Update A* polyline
    boatPathRef.current.setLatLngs(astarcoordinates);

    // Clear old markers
    boatMarkersRef.current.forEach(marker => marker.remove());
    boatMarkersRef.current = [];

    // Add new markers
    astarcoordinates.forEach(coord => {
      const marker = L.circleMarker(coord, {
        radius: 1,
        color: '#000000',
        fillColor: '#000000',
        fillOpacity: 1
      }).addTo(mapRef.current);
      marker.bindTooltip(`A*: ${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}`);
      boatMarkersRef.current.push(marker);
    });

    mapRef.current.panTo(astarcoordinates[astarcoordinates.length - 1]);
  }, [astarcoordinates, mapInitialized]);

  // Handle Optimal Path Updates
  useEffect(() => {
    if (!mapInitialized || coordinates.length === 0) return;

    // Update optimal path polyline
    polylineRef.current.setLatLngs(coordinates);

    // Clear old markers
    pathMarkersRef.current.forEach(marker => marker.remove());
    pathMarkersRef.current = [];

    // Add new markers
    coordinates.forEach(coord => {
      const marker = L.circleMarker(coord, {
        radius: 2,
        color: '#8B0000',
        fillColor: '#8B0000',
        fillOpacity: 1
      }).addTo(mapRef.current);
      marker.bindTooltip(`Optimal: ${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}`);
      pathMarkersRef.current.push(marker);
    });

    mapRef.current.panTo(coordinates[coordinates.length - 1]);
  }, [coordinates, mapInitialized]);

  // Handle Weather Data Updates
  useEffect(() => {
    if (!mapInitialized) return;

    weatherMarkersRef.current.forEach(marker => marker.remove());
    weatherMarkersRef.current = [];

    weatherData.forEach(point => {
      const { coordinate, wind_speed, wind_direction, wave_height, wave_dir, current_vel, current_dir } = point;

      const weatherMarker = L.circleMarker(coordinate, {
        radius: 2,
        color: '#8B0000',
        fillColor: '#8B0000',
        fillOpacity: 0.7
      }).addTo(mapRef.current);

      weatherMarker.bindPopup(`
        <div>
          <strong>Weather Conditions</strong><br/>
          Coordinate: ${coordinate[0].toFixed(4)}, ${coordinate[1].toFixed(4)}<br/>
          Wind Speed: ${wind_speed} km/hr<br/>
          Wind Direction: ${wind_direction}°<br/>
          Wave Height: ${wave_height} m<br/>
          Wave Direction: ${wave_dir}°<br/>
          Current Velocity: ${current_vel} km/hr<br/>
          Current Direction: ${current_dir}°
        </div>`);

      weatherMarkersRef.current.push(weatherMarker);
    });
  }, [weatherData, mapInitialized]);

  const validateCoordinates = (input) => {
    const coords = input.split(',').map(Number);
    return coords.length === 2 &&
      !isNaN(coords[0]) && !isNaN(coords[1]) &&
      Math.abs(coords[0]) <= 90 && Math.abs(coords[1]) <= 180;
  };

  const connectWebSocket = () => {
    setStatus('Connecting...');
    wsRef.current = new WebSocket('ws://localhost:5000');

    wsRef.current.onopen = () => {
      setStatus('Calculating Routes...');
      wsRef.current.send(JSON.stringify({
        type: 'start',
        start: start.split(',').map(Number),
        end: end.split(',').map(Number)
      }));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'final') {
        setCoordinates(data.path);
        setAstarCoordinates(data.apath);
        setWeatherData(data.weather);
        setDistance(data.distance);
        setStatus('Routes Calculated');
      } else if (data.type === 'error') {
        setStatus(`Error: ${data.message}`);
      }
    };

    wsRef.current.onerror = () => setStatus('Connection Error');
    wsRef.current.onclose = () => setStatus('Disconnected');
  };

  const startNavigation = () => {
    if (!validateCoordinates(start) || !validateCoordinates(end)) {
      alert('Invalid coordinates! Use format: lat,lon');
      return;
    }
    connectWebSocket();
  };

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      <div id="windy" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }} />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        padding: '15px 20px',
        color: '#fff',
        background: 'rgba(0, 0, 0,0.8)',
        backdropFilter: 'blur(40px)',
        fontSize: '20px',
        fontWeight: 'bold',
        zIndex: 10
      }}>
        🚢 AI Ship Navigation System
      </div>

      <div style={{
        position: 'absolute',
        top: '60px',
        left: '20px',
        width: '300px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '15px',
        padding: '20px',
        color: '#fff',
        zIndex: 10
      }}>
        <div style={{ marginBottom: '10px' }}>
          Status: <strong>{status}</strong>
        </div>

        <input
          type="text"
          placeholder="Start (lat,lon)"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="End (lat,lon)"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={startNavigation}
          style={{ ...buttonStyle, marginTop: '10px' }}
          disabled={status === 'Connecting...'}
        >
          {status.startsWith('Calculating') ? 'Calculating...' : 'Start Navigation'}
        </button>

        <div style={{
          marginTop: '40px',
          fontSize: '16px',
          padding: '15px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          background: 'rgba(255, 255, 255, 0.07)',
          color: '#fff',
          textAlign: 'center'
        }}>
          Total Distance: <strong>{distance} KM</strong>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '93%',
  marginBottom: '10px',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#fff',
  outline: 'none',
};

const buttonStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: 'rgba(14, 25, 229, 0.5)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: '0.3s ease-in-out',
  ':disabled': {
    backgroundColor: 'rgba(100, 100, 100, 0.5)',
    cursor: 'not-allowed'
  }
};

export default App;