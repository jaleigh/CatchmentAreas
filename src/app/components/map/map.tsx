"use client"
// IMPORTANT: the order matters!
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents, Polyline } from "react-leaflet";
import { schools } from "../../data/schools";
import { useState, useEffect } from 'react';
import { LatLngExpression } from "leaflet";
import L from 'leaflet';
import { Grid } from "@mui/material";
import { AppBar, Toolbar, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import dynamic from 'next/dynamic';
import { PostcodeData } from "../../data/postcodes";

interface Journey {
  id: number;
  name: string;
  distance: number;
  duration: number;
  journeyType: string;
  route: LatLngExpression[];
  colour: string;
  renderRoute: boolean;
}

interface Routes {
  id: number;
  startPoint: LatLngExpression;
  schoolJourneys: Journey[];
}

const diskIcon = (color: string) => L.divIcon({
  className: 'custom-disk-icon',
  html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

const loadData = async () => {
  const data = await import('../../data/clusters.json');
  return data.default as PostcodeData[];
};

const Map = () => {

  const [sortedPostcodes, setSortedPostcodes] = useState<PostcodeData[]>([]);
  const [routes, setRoutes] = useState<Routes>({ id: 0, startPoint: [0, 0], schoolJourneys: [] });
  const [renderPostcodes, setRenderPostcodes] = useState<number>(1);

  useEffect(() => {
    loadData().then((data) => {
      // sort the postcode journey so the shortes distance is index 0
      const sorted = data.map((p: PostcodeData) => {
        return {...p, journeys: p.journeys ? p.journeys.sort((a, b) => (a.distance as number) - (b.distance as number)) : []};
      });
      setSortedPostcodes(sorted);
    });
  }, []);


  const ClickHandler = () => {
    useMapEvents({
      click: (event: any) => {
        const { lat, lng } = event.latlng;
        // get the routes to the schools from the click location
        setRoutes({ id: 0, startPoint: [lat, lng], schoolJourneys: [] });
        const fetchDistances = async () => {
          const response = await fetch(`/api/distances?lat=${lat}&lng=${lng}`);
          if (response.ok) {
            const data = await response.json();
            // convert data to Routes and lat, lng
            routes.schoolJourneys = data.schoolJourneys.map((j: Journey) => {
              j.renderRoute = true;
              return j;
            });
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

  const toggleRenderRoute = (journeyName: string) => {
    const updatedRoutes = {
      ...routes,
      schoolJourneys: routes.schoolJourneys.map((j: Journey) => 
        j.name === journeyName ? { ...j, renderRoute: !j.renderRoute } : j
      )
    };
    setRoutes(updatedRoutes);
  }

  return (
    <>
      <Grid container spacing={2} style={{ height: '100%' }}>
        <Grid item xs={2} style={{ height: '100%' }}>
          <div style={{ backgroundColor: 'white', overflowY: 'auto', padding: '10px' }}>
            <h2>Colours</h2>
            <ul>
              {schools.map((school) => (
                <li key={school.name} style={{ color: school.colour }}>
                  {school.name}: {school.colour}
                </li>
              ))}
            </ul>
            <h2>Route Information</h2>
            {routes.schoolJourneys?.map((dest: Journey) => (
              <div key={dest.name} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', color: dest.colour }}>{dest.name} - {dest.journeyType}</div>
                  <button 
                  onClick={() => toggleRenderRoute(dest.name || '')} 
                  style={{
                  backgroundColor: dest.renderRoute ? '#f44336' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '1px 2px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'inline-block',
                  fontSize: '10px',
                  margin: '2px 2px',
                  cursor: 'pointer',
                  borderRadius: '1px'
                  }}
                  >
                  {dest.renderRoute ? "Hide Route" : "Show Route"}
                  </button>
                </div>
                <div style={{ paddingLeft: '1rem' }}>{dest.distance.toFixed(2)} miles</div>
                <div style={{ paddingLeft: '1rem' }}>{dest.duration.toFixed(2)} minutes</div>
              </div>
            ))}
          </div>
        </Grid>
        <Grid item xs={10} style={{ height: '100%' }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" style={{ flexGrow: 1 }}>
              </Typography>
                <Button color="inherit" onClick={() => {setRenderPostcodes(renderPostcodes ? 0 : 1)}}>
                {renderPostcodes ? "Hide Postcodes" : "Show Postcodes"}
                </Button>
                 <Button color="inherit" onClick={() => {
                  setRenderPostcodes(2);
                  setSortedPostcodes([...sortedPostcodes]); // force a render
                  }}>
                Closest School
                </Button>
                <Button color="inherit" onClick={() => {
                  setRenderPostcodes(3);
                  setSortedPostcodes([...sortedPostcodes]);
                  }}>
                2nd Closest School
                </Button>
                <Button color="inherit" onClick={() => {
                  setRenderPostcodes(4);
                  setSortedPostcodes([...sortedPostcodes]);
                  }}>
                3rd Closest School
                </Button>
            </Toolbar>
          </AppBar>
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
            {renderPostcodes && sortedPostcodes.map((p: PostcodeData) => {
              // find the closest school
              let colour = "blue";
              if (renderPostcodes > 1 && p.journeys) {
                const closestSchool = p.journeys[renderPostcodes - 2];
                colour = typeof closestSchool.colour === 'string' ? closestSchool.colour : "blue";
              }
                return <Marker key={p.postcode} position={[p.lat, p.lng]} icon={diskIcon(colour)} />;
            })}
            {routes.schoolJourneys?.map((dest: Journey) => (
              // render a poly line for the journey to each school in a different color
              dest.renderRoute && 
              <Polyline key={"p" + dest.name} positions={dest.route} color={dest.colour}/>
            ))}
          </MapContainer>
        </Grid>
      </Grid>
    </>
  );
};

export default Map;