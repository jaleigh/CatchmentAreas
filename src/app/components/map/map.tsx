"use client"
// IMPORTANT: the order matters!
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents, Polyline } from "react-leaflet";
import { schools, School } from "../../data/schools";
import { useState, useEffect } from 'react';
import { LatLngExpression } from "leaflet";
import L from 'leaflet';
import { CircularProgress, Grid, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { AppBar, Toolbar, Typography, Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import { Journeys, PostcodeData, JourneyType } from "../../data/postcodes";
import { Catchments, CatchmentBoundary } from "../../data/catchments";
import { Journey } from "../../data/postcodes";
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { ChevronLeftOutlined } from "@mui/icons-material";

interface JourneyUI extends Journey {
  renderRoute: boolean;
};

interface Routes {
  id: number;
  startPoint: LatLngExpression;
  postcode?: string;
  schoolJourneys: JourneyUI[];
}

enum RenderOptions {
  HidePostcodes = 0,
  ShowPostcodes = 1,
  ClosestSchool = 2,
  SecondClosestSchool = 3,
  ThirdClosestSchool = 4,
  showDistanceMap = 5,
  ClosestPlacedSchool = 6,
  CatchmentSchoolDist = 7
};

enum RenderCaptchmentOptions {
  HideCatchments = 0,
  OldCatchments = 1,
  NewCatchments = 2
};

interface CatchmentSet {
  old: Catchments;
  new: Catchments;
};

const diskIcon = (color: string) => L.divIcon({
  className: 'custom-disk-icon',
  html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

const loadPostcodeData = async () => {
  const part1 = await import('../../data/postcodes_half_part1.json').then(module => module.default as PostcodeData[]);
  const part2 = await import('../../data/postcodes_half_part2.json').then(module => module.default as PostcodeData[]);
  const data = {
    default: [...part1, ...part2]
  };
  return data.default as PostcodeData[];
};

const loadCatchmentBoudaries = async () => {
  const newCatchments = await import('../../data/new_catchments.json').then(module => module.default as unknown as Catchments);
  const oldCatchments = await import('../../data/old_catchments.json').then(module => module.default as unknown as Catchments);
  return {
    "old": { catchments: oldCatchments.catchments },
    "new": { catchments: newCatchments.catchments }
  } as CatchmentSet;
};

// Finds the furthest away catchment school
const findFurthestCatchmentSchool = (postcode: PostcodeData, useNewCatchment: boolean) => {
  let maxDist = 0;
  let furthestSchool = '';
  for (let n=0; n < schools.length; ++n) {
    const school = schools[n];
    const catchment = useNewCatchment ? postcode.newCatchment : postcode.oldCatchment;
    if (school.catchment !== catchment || !postcode?.journeys?.walking) {
      continue;
    }
    for (const journey of postcode.journeys.walking) {
      if (journey.name === school.name) {
        if (journey.distance > maxDist) {
          maxDist = journey.distance;
          furthestSchool = school.name;
        }
      }
    }
  }

  return maxDist;
};

const Map = () => {

  const [sortedPostcodes, setSortedPostcodes] = useState<PostcodeData[]>([]);
  const [catchments, setCatchments] = useState<CatchmentSet>({ old: { catchments: [] }, new: { catchments: [] } });
  const [routes, setRoutes] = useState<Routes>({ id: 0, startPoint: [0, 0], schoolJourneys: [] });
  const [renderOption, setRenderOption] = useState<RenderOptions>(RenderOptions.ShowPostcodes);
  const [renderCatchments, setRenderCatchments] = useState<RenderCaptchmentOptions>(RenderCaptchmentOptions.NewCatchments);
  const [apiAvailable, setApiAvailable] = useState<boolean>(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [maxDistance, setMaxDistance] = useState(4);
  const [loading, setLoading] = useState(true);
  const [journeyType, setJourneyType] = useState<JourneyType>('walking');
  const [infoDialogOpen, setInfoDialogOpen] = useState(true); // Dialog open state

  useEffect(() => {
    loadPostcodeData().then((data) => {
      // sort the postcode journey so the shortes distance is index 0
      const sorted = data.map((p: PostcodeData) => {
        if (p.journeys) {
          p.journeys.walking = p.journeys?.walking?.sort((a, b) => (a.distance as number) - (b.distance as number));
          p.journeys.bus = p.journeys?.bus?.sort((a, b) => (a.distance as number) - (b.distance as number));
        }
        return p;
      });
      setSortedPostcodes(sorted);
      setLoading(false);
    });
    loadCatchmentBoudaries().then((data) => {
      setCatchments(data);
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

  const convertDistToColor = (distance: number) => {
    const minDistance = 0.5;
    const clampedDistance = Math.max(minDistance, Math.min(maxDistance, distance));
    const ratio = (clampedDistance - minDistance) / (maxDistance - minDistance);
    const red = Math.floor(255 * ratio);
    const green = Math.floor(255 * (1 - ratio));
    return `rgb(${red},${green},0)`;
  };

  const toogleInfoBox = () => {
    setInfoDialogOpen(!infoDialogOpen); // Close the dialog
  };

  return (
    <>
      {/* Info Dialog */}
      <Dialog id="d" open={infoDialogOpen} onClose={toogleInfoBox}>
        <DialogTitle>Welcome to the Map</DialogTitle>
        <DialogContent>
          <p style={{ marginBottom: '1rem' }}>
            This map allows you to explore routes to schools. A blur dot is a postcode. Click on a blue dot to see the route to schools.
            The left hand panel show the distance and time to each school. These are safe walking distances as determined by OpenRouteService (https://openrouteservice.org/)
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Click on the bus route to load the Brighon and Hove bus website for that postcode to school journey.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Use the dropdowns to change the catchment boundaries overlays (these aren't exact as the council don't provide the data).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Render options drop down allows you to see the closest school, 2nd closest school, 3rd closest school for each postcode. School colour code is on the left.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The closest placed school shows all postcodes whose closest placed school is over the max dist - set in the "Max Distance" box. A placed school is BACA, PACA and Longhill as the council data shows these are the only schools that will have spare places for displaced pupils.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Catchment School Dist displays a red dot for any postcode whose furthest away catchment school is over max dist - set in the "Max Distance box". Distances are in miles.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Schools drop down allows you see a distance map to the selected school.
          </p>
          <p></p>
        </DialogContent>
        <DialogActions>
          <Button onClick={toogleInfoBox} color="primary">
            Got it!
          </Button>
        </DialogActions>
      </Dialog>
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
            <h2 style={{ fontWeight: 'bold', paddingTop: '10px' }}>Route Information {routes.postcode}</h2>
            {routes.schoolJourneys?.map((dest: JourneyUI) => (
              <div key={"dd" + dest.name} style={{ marginBottom: '1rem' }}>
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
                  <button
                  onClick={() => {
                    const formattedPostcode = routes.postcode?.replace(/ /g, '+').toUpperCase();
                    const startLat = Array.isArray(routes.startPoint) ? routes.startPoint[0] : routes.startPoint.lat;
                    const startLng = Array.isArray(routes.startPoint) ? routes.startPoint[1] : routes.startPoint.lng;
                    const schoolLat = dest.location.lat;
                    const schoolLng = dest.location.lng;
                    // get the current date
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    if (today.getDay() === 5) { // Check if today is Friday
                      tomorrow.setDate(today.getDate() + 3); // Set to next Monday
                    } else if (today.getDay() === 6) { // Check if today is Saturday
                      tomorrow.setDate(today.getDate() + 2); // Set to next Monday
                    }
                    const yyyyMmDd = tomorrow.toISOString().split('T')[0];
                    const url = `https://www.buses.co.uk/directions?origin%5Bname%5D=${formattedPostcode}&origin%5Blocation%5D%5Blat%5D=${startLat}&origin%5Blocation%5D%5Blon%5D=${startLng}&destination%5Bname%5D=School&destination%5Blocation%5D%5Blat%5D=${schoolLat}&destination%5Blocation%5D%5Blon%5D=${schoolLng}&time%5Bwhen%5D=arrive&time%5Bdate%5D=${yyyyMmDd}&time%5Btime%5D=09%3A00`;
                    window.open(url, 'us route');
                  }}
                  style={{
                    backgroundColor: 'black',
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
                    "Bus route"
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
            <Toolbar style={{ paddingTop: '10px', paddingBottom: '10px', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
              <Typography variant="h6" style={{ flexGrow: 0 }}>
              </Typography>
                {/* <FormControl variant="outlined" style={{ minWidth: 120, marginLeft: '10px' }}>
                  <InputLabel id="journey-type-select-label">Journey Type</InputLabel>
                  <Select
                    labelId="journey-type-select-label"
                    id="journey-type-select"
                    value={journeyType}
                    onChange={(event) => {
                      setJourneyType(event.target.value as JourneyType);
                      setSortedPostcodes([...sortedPostcodes]); // force a render
                    }}
                    label="Journey Type"
                  >
                    <MenuItem value="walking">Walking</MenuItem>
                    <MenuItem value="bus">Bus</MenuItem>
                  </Select>
                </FormControl> */}
                <FormControl variant="outlined">
                  <InputLabel id="catchment-select-label">Catchment Boundaries</InputLabel>
                  <Select
                  labelId="catchment-select-label"
                  id="catchment-select"
                  value={renderCatchments}
                  onChange={(event) => setRenderCatchments(event.target.value as RenderCaptchmentOptions)}
                  label="Catchment Boundaries"
                  >
                  <MenuItem value={RenderCaptchmentOptions.HideCatchments}>Hide Catchments</MenuItem>
                  <MenuItem value={RenderCaptchmentOptions.OldCatchments}>Old Catchments</MenuItem>
                  <MenuItem value={RenderCaptchmentOptions.NewCatchments}>New Catchments</MenuItem>
                  </Select>
                </FormControl>
                <Button color="inherit" onClick={() => {setRenderOption(renderOption ? 0 : 1)}}>
                  {renderOption != RenderOptions.HidePostcodes ? "Hide Postcodes" : "Show Postcodes"}
                </Button>
                <FormControl variant="outlined" style={{ minWidth: 200, marginLeft: '10px' }}>
                  <InputLabel id="render-options-select-label">Render Options</InputLabel>
                  <Select
                    labelId="render-options-select-label"
                    id="render-options-select"
                    value={renderOption}
                    onChange={(event) => {
                      setRenderOption(event.target.value as RenderOptions);
                      setSortedPostcodes([...sortedPostcodes]); // force a render
                    }}
                    label="Render Options"
                  >
                    <MenuItem value={RenderOptions.ClosestSchool}>Closest School</MenuItem>
                    <MenuItem value={RenderOptions.SecondClosestSchool}>2nd Closest School</MenuItem>
                    <MenuItem value={RenderOptions.ThirdClosestSchool}>3rd Closest School</MenuItem>
                    <MenuItem value={RenderOptions.ClosestPlacedSchool}>Closest Placed School</MenuItem>
                    <MenuItem value={RenderOptions.CatchmentSchoolDist}>Catchment School Dist</MenuItem>
                  </Select>
                </FormControl>
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
                  style={{ padding: '2px', marginLeft: '10px', width: '150px' }}
                />
                <Tooltip title="Help" onClick={toogleInfoBox}>
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
            id={"map" + Date.now()}
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
              <Marker key={"s" + school.name} position={[school.lat, school.lng]}>
                <Popup key={"ss" + school.name}>{school.name}</Popup>
              </Marker>
            ))}
            <MapClickHandler />
            {renderCatchments != RenderCaptchmentOptions.HideCatchments && (
              (renderCatchments == RenderCaptchmentOptions.NewCatchments ? catchments.new.catchments : catchments.old.catchments).map((boundary: CatchmentBoundary) => (
              <Polyline key={"c" + boundary.name} positions={boundary.coordinates} color="grey" />
              ))
            )}
            {(renderOption == RenderOptions.ShowPostcodes ||
             renderOption == RenderOptions.ClosestSchool ||
             renderOption == RenderOptions.SecondClosestSchool ||
             renderOption == RenderOptions.ThirdClosestSchool ||
             renderOption == RenderOptions.ClosestPlacedSchool ||
             renderOption == RenderOptions.CatchmentSchoolDist) && 
             sortedPostcodes.map((p: PostcodeData) => {
              // render the closest school for each marker
              let colour = "blue";
              if (renderOption == RenderOptions.ClosestPlacedSchool && p.journeys) {
                const closestSchool = p.journeys[journeyType as keyof Journeys]?.filter(j => j.name === p.closestPlacement)[0];
                if (closestSchool && closestSchool.distance > maxDistance && (p.newCatchment === 'StringerVarndean' || p.newCatchment === 'BlatchingtonHove')) {
                  colour = "red";
                } else {
                  return;
                }
//                colour = convertDistToColor(closestSchool.distance || 0);
              } else if (renderOption == RenderOptions.CatchmentSchoolDist && p.journeys) {
                if (findFurthestCatchmentSchool(p, renderCatchments === RenderCaptchmentOptions.NewCatchments) >  maxDistance) {
                  colour = "red";
                } else {
                  return;
                }
              } else if (renderOption > RenderOptions.ShowPostcodes && p.journeys) {
                const closestSchool = p.journeys[journeyType as keyof Journeys]?.[renderOption as number - 2];
                colour = closestSchool && typeof closestSchool.colour === 'string' ? closestSchool.colour : "blue";
              }
              return <Marker
                key={p.postcode}
                position={[p.lat, p.lng]}
                icon={diskIcon(colour)}
                eventHandlers={{
                  click: () => {
                    const journeys = p.journeys?.[journeyType as keyof Journeys];
                    setRoutes({
                      id: 0,
                      startPoint: [p.lat, p.lng],
                      postcode: p.postcode,
                      schoolJourneys: journeys ? journeys.map((j) => ({ ...j, renderRoute: true, id: 0, colour: j.colour || 'white' })) : []
                    });
                  }}}
                />
            })}
            {renderOption == RenderOptions.showDistanceMap && 
            selectedSchool &&
            sortedPostcodes.map((p: PostcodeData) => {
              // render the distance for each marker to the selected school
              const journeys = p.journeys?.[journeyType as keyof Journeys];
              const distance = journeys?.find(j => j.name === selectedSchool)?.distance;
              const colour = convertDistToColor(distance || 0);
              return <Marker
                key={p.postcode}
                position={[p.lat, p.lng]}
                icon={diskIcon(colour)}
                eventHandlers={{
                  click: () => {
                    const journeys = p.journeys?.[journeyType as keyof Journeys];
                    setRoutes({
                      id: 0,
                      startPoint: [p.lat, p.lng],
                      schoolJourneys: journeys ? journeys.map((j) => ({ ...j, renderRoute: true, id: 0, colour: j.colour || 'white' })) : []
                    });
                  }}}
                />
            })}
            {routes.schoolJourneys?.map((dest: JourneyUI) => (
              // render a poly line for the journey to each school in a different color
              dest.renderRoute &&
              <>
              <Polyline key={"p" + dest.name} positions={dest.route} color={dest.colour}/>
              <Marker 
                key={"m" + dest.name}
                position={routes.startPoint}
                icon={diskIcon("red")}
                />
              </>
            ))}
          </MapContainer>
        </Grid>
      </Grid>
    </>
  );
};

export default Map;