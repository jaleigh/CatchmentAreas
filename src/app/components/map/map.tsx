"use client"
// IMPORTANT: the order matters!
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { schools } from "../../data/schools";
import { useState } from 'react';
import { LatLngExpression } from "leaflet";
import { postcodes, PostcodeData } from "../../data/postcodes";
import L from 'leaflet';
import { Grid, Grid2 } from "@mui/material";

interface Journey {
  id: number;
  name: string;
  distance: number;
  duration: number;
  journey: string;
}

interface Routes {
  id: number;
  startPoint: LatLngExpression;
  schoolDists: Journey[];
}

const diskIcon = L.divIcon({
  className: 'custom-disk-icon',
  html: '<div style="background-color: red; width: 10px; height: 10px; border-radius: 50%;"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

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
    <>
      <Grid container spacing={2} style={{ height: '100%' }}>
        <Grid item xs={3} style={{ height: '100%' }}>
          <div style={{ height: '100%', backgroundColor: 'white', overflowY: 'auto', padding: '10px' }}>
            <h2>Route Information</h2>
            {routes.schoolDists?.map((dest: Journey) => (
              <div key={dest.name} style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold' }}>{dest.name} - {dest.journey}</div>
                <div style={{ paddingLeft: '1rem' }}>{dest.distance} miles</div>
                <div style={{ paddingLeft: '1rem' }}>{dest.duration} minutes</div>
              </div>
            ))}
          </div>
        </Grid>
        <Grid item xs={9} style={{ height: '100%' }}>
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
            {schools.map((school) => (
              <Marker key={school.name} position={[school.lat, school.lng]}>
                <Popup>{school.name}</Popup>
              </Marker>
            ))}
            <ClickHandler />
            {postcodes.map((p: PostcodeData) => (
              <Marker key={p.postcode} position={[p.lat, p.lng]} icon={diskIcon} />
            ))}
          </MapContainer>
        </Grid>
      </Grid>
    </>
  );
};

export default Map;