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
import { CircularProgress, Grid, IconButton, TextField } from "@mui/material";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { AppBar, Toolbar, Typography, Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import dynamic from 'next/dynamic';
import { PostcodeData } from "../../data/postcodes";
import { Journey } from "../../data/postcodes";
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

interface JourneyUI extends Journey {
  renderRoute: boolean;
};

interface Routes {
  id: number;
  startPoint: LatLngExpression;
  schoolJourneys: JourneyUI[];
}

enum RenderOptions {
  HidePostcodes = 0,
  ShowPostcodes = 1,
  ClosestSchool = 2,
  SecondClosestSchool = 3,
  ThirdClosestSchool = 4,
  showDistanceMap = 5
};

const diskIcon = (color: string) => L.divIcon({
  className: 'custom-disk-icon',
  html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

const loadData = async () => {
  const part1 = await import('../../data/postcodes_half_part1.json').then(module => module.default as PostcodeData[]);
  const part2 = await import('../../data/postcodes_half_part2.json').then(module => module.default as PostcodeData[]);
  const data = {
    default: [...part1, ...part2]
  };
  return data.default as PostcodeData[];
};

const Map = () => {

  const [sortedPostcodes, setSortedPostcodes] = useState<PostcodeData[]>([]);
  const [routes, setRoutes] = useState<Routes>({ id: 0, startPoint: [0, 0], schoolJourneys: [] });
  const [renderOption, setRenderOption] = useState<RenderOptions>(RenderOptions.ShowPostcodes);
  const [apiAvailable, setApiAvailable] = useState<boolean>(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [maxDistance, setMaxDistance] = useState(4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().then((data) => {
      // sort the postcode journey so the shortes distance is index 0
      const sorted = data.map((p: PostcodeData) => {
        return {...p, journeys: p.journeys ? p.journeys.sort((a, b) => (a.distance as number) - (b.distance as number)) : []};
      });
      setSortedPostcodes(sorted);
      setLoading(false);
    });
  }, []);


  const MapClickHandler = () => {
    useMapEvents({
      click: (event: any) => {
        if (apiAvailable) {
          const { lat, lng } = event.latlng;
          // get the routes to the schools from the click location
          setRoutes({ id: 0, startPoint: [lat, lng], schoolJourneys: [] });
          const fetchDistances = async () => {
            const response = await fetch(`/api/distances?lat=${lat}&lng=${lng}`);
            if (response.ok) {
              const data = await response.json();
              // convert data to Routes and lat, lng
              routes.schoolJourneys = data.schoolJourneys.map((j: JourneyUI) => {
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
      }
    });
    return null;
  }

  const toggleRenderRoute = (journeyName: string) => {
    const updatedRoutes = {
      ...routes,
      schoolJourneys: routes.schoolJourneys.map((j: JourneyUI) => 
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
            <h2 style={{ fontWeight: 'bold', paddingTop: '10px' }}>Route Information</h2>
            {routes.schoolJourneys?.map((dest: JourneyUI) => (
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
                <Button color="inherit" onClick={() => {setRenderOption(renderOption ? 0 : 1)}}>
                {renderOption != RenderOptions.HidePostcodes ? "Hide Postcodes" : "Show Postcodes"}
                </Button>
                 <Button color="inherit" onClick={() => {
                  setRenderOption(RenderOptions.ClosestSchool);
                  setSortedPostcodes([...sortedPostcodes]); // force a render
                  }}>
                Closest School
                </Button>
                <Button color="inherit" onClick={() => {
                  setRenderOption(RenderOptions.SecondClosestSchool);
                  setSortedPostcodes([...sortedPostcodes]);
                  }}>
                2nd Closest School
                </Button>
                <Button color="inherit" onClick={() => {
                  setRenderOption(RenderOptions.ThirdClosestSchool);
                  setSortedPostcodes([...sortedPostcodes]);
                  }}>
                3rd Closest School
                </Button>
                <FormControl variant="outlined" style={{ minWidth: 120, marginLeft: '10px' }}>
                  <InputLabel id="school-select-label">Schools</InputLabel>
                  <Select
                  labelId="school-select-label"
                  id="school-select"
                  label="Schools"
                  onChange={(event) => {
                    const selectedSchool = schools.find(school => school.name === event.target.value);
                    setSelectedSchool(selectedSchool?.name || '');
                    setRenderOption(RenderOptions.showDistanceMap);
                  }}
                  >
                  {schools.map((school) => (
                    <MenuItem key={school.name} value={school.name}>
                    {school.name}
                    </MenuItem>
                  ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Max Distance (miles)"
                  type="number"
                  value={maxDistance}
                  onChange={(event) => setMaxDistance(parseFloat(event.target.value))}
                  style={{ padding: '2px', marginLeft: '10px', width: '100px' }}
                />
                <Tooltip title="Select the school from the drop down to see the distances to each school, red is the furthest (set in the text box), green is the closest">
                  <IconButton color="inherit">
                    <HelpOutlineIcon />
                  </IconButton>
                </Tooltip>
                
            </Toolbar>
          </AppBar>
            {loading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000
            }}>
              <CircularProgress />
            </div>
            )}
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
            <MapClickHandler />
            {(renderOption == RenderOptions.ShowPostcodes ||
             renderOption == RenderOptions.ClosestSchool ||
             renderOption == RenderOptions.SecondClosestSchool ||
             renderOption == RenderOptions.ThirdClosestSchool) && 
             sortedPostcodes.map((p: PostcodeData) => {
              // render the closest school for each marker
              let colour = "blue";
              if (renderOption > RenderOptions.ShowPostcodes && p.journeys) {
                const closestSchool = p.journeys[renderOption as number - 2];
                colour = typeof closestSchool.colour === 'string' ? closestSchool.colour : "blue";
              }
              return <Marker
                key={p.postcode}
                position={[p.lat, p.lng]}
                icon={diskIcon(colour)}
                eventHandlers={{
                  click: () => {
                    setRoutes({
                      id: 0,
                      startPoint: [p.lat, p.lng],
                      schoolJourneys: p.journeys ? p.journeys.map((j) => ({ ...j, renderRoute: true, id: 0, colour: j.colour || 'white' })) : []
                    });
                  }}}
                />
            })}
            {renderOption == RenderOptions.showDistanceMap && 
            selectedSchool &&
            sortedPostcodes.map((p: PostcodeData) => {
              // render the distance for each marker to the selected school
              const distance = p.journeys?.find(j => j.name === selectedSchool)?.distance;
              const convertDistToColor = (distance: number) => {
                const minDistance = 0.5;
                const clampedDistance = Math.max(minDistance, Math.min(maxDistance, distance));
                const ratio = (clampedDistance - minDistance) / (maxDistance - minDistance);
                const red = Math.floor(255 * ratio);
                const green = Math.floor(255 * (1 - ratio));
                return `rgb(${red},${green},0)`;
              };

              const colour = convertDistToColor(distance || 0);
              return <Marker
                key={p.postcode}
                position={[p.lat, p.lng]}
                icon={diskIcon(colour)}
                eventHandlers={{
                  click: () => {
                    setRoutes({
                      id: 0,
                      startPoint: [p.lat, p.lng],
                      schoolJourneys: p.journeys ? p.journeys.map((j) => ({ ...j, renderRoute: true, id: 0, colour: j.colour || 'white' })) : []
                    });
                  }}}
                />
            })}
            {routes.schoolJourneys?.map((dest: JourneyUI) => (
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