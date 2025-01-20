"use client"
// IMPORTANT: the order matters!
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { schools } from "../../data/schools";
import { useState } from 'react';
import { LatLngExpression } from "leaflet";

interface Destination {
  id: number;
  name: string;
  distance: number;
  duration: number;
}

interface Routes {
  id: number;
  startPoint: LatLngExpression;
  schoolDists: Destination[];
}
const Map = () => {

  const [routes, setRoutes] = useState<Routes>({ id: 0, startPoint: [0, 0], schoolDists: [] });

  const ClickHandler = () => {
    useMapEvents({
      click: (event) => {
        const { lat, lng } = event.latlng;
        // get the routes to the schools from the click location
        setRoutes({ id: 0, startPoint: [lat, lng], schoolDists: [] });
        const fetchDistances = async () => {
          const response = await fetch(`/api/distances?lat=${lat}&lng=${lng}`);
          if (response.ok) {
            const data = await response.json();
            // convert data to Routes and lat, lng
            routes.schoolDists = data.schoolDists;
            routes.startPoint = [lat, lng];
            setRoutes(routes);
          } else {
            console.error('Failed to fetch distances:', response.statusText);
          }
        };
        fetchDistances();
      }
    });
    return null;
  }

  return (
    <MapContainer
      id="map"
      center={[50.84078, -0.14691]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", cursor: "crosshair" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {
        schools.map((school) => (
          <Marker key={school.name} position={[school.lat, school.lng]}>
            <Popup>{school.name}</Popup>
          </Marker>
        ))
      }
      <ClickHandler />
      {
        routes.schoolDists.length > 0 &&
        <Popup key="dist-popup" position={routes.startPoint}>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {
            routes.schoolDists?.map((dest: Destination) => (
              <div key={dest.id} style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 'bold' }}>{dest.name}</div>
              <div style={{ paddingLeft: '1rem' }}>{dest.distance} miles</div>
              <div style={{ paddingLeft: '1rem' }}>{dest.duration} minutes</div>
              </div>
            ))}
          </div>
        </Popup>
      }
    </MapContainer>
  );
};

export default Map;