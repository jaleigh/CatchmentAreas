// @ts-expect-error this just a script for generating data, who cares about types
import Openrouteservice from 'openrouteservice-js';
import { schools, School } from "../../data/schools";
import { Journey, JourneyName } from "../../data/postcodes";

// Configure the API route to be static or dynamic (MUST set to static for deployment as we are only deploying static sites)
// COMMENT OUT TO ACTUALLY USE
export const dynamic = "force-static"; // or "force-dynamic"
export const revalidate = 60; // Revalidate every 60 seconds

type LocationMapEntry = { school: School, loc: { lat: number, lng: number } } | null;
type Location = [number, number];

// generate the walking journey data for a given location
export async function generateJourneyData(
  lng: number,
  lat: number,
  profile: 'foot-walking' | 'public-transport' = 'foot-walking',
  arriveBy: Date | null = null) {

  const distMatrix = new Openrouteservice.Matrix({
    api_key: process.env.OPENROUTE_API_KEY,
    host: process.env.OPENROUTE_SERVICE
  });

  // schools have multiple entrances so keep track of the school to index to the location array
  const locations: Location[] = [[lng, lat]];
  const locationMap: LocationMapEntry[] = [null];
  for (const school of schools) {
    locations.push([school.lng, school.lat]);
    locationMap.push({school: school, loc: {lat: school.lat, lng: school.lng}});
    school.entrances.forEach((entrance) => {
      locations.push([entrance.lng, entrance.lat]);
      locationMap.push({school, loc: entrance});
    });
  }

  const result = await distMatrix.calculate({
    locations: locations,
    metrics: ["distance", "duration"],
    profile: profile, // options are cycling-regular, foot-walking, driving-car
    sources: [0],
    destinations: ['all'],
    units: "m"
  })

  if (!result.distances[0]) {
    console.log("No distances returned");
  }

  // find the best entrace for each school
  const response: { schoolJourneys: Journey[] } = { schoolJourneys: [] };

  const bestEntrance: { [key: string]: number } = {};
  for (let i = 1; i < result.distances[0].length; i++) {
    const info = locationMap[i];
    if (!info) continue;
    if (!bestEntrance[info.school.name] || result.distances[0][i] < result.distances[0][bestEntrance[info.school.name]]) {
      bestEntrance[info.school.name] = i;
    }
  }

  // populate the routes that generated the distances/times
  for (let i = 1; i < result.distances[0].length; i++) {

    // pick the best entrance for each school and request the route to this entrance
    const info = locationMap[i];
    if (!info || bestEntrance[info.school.name] != i) {
      // this distance is the best entrance for the school so skip
      continue;
    }

    // get the route between the two points
    const directions = new Openrouteservice.Directions({
      api_key: process.env.OPENROUTE_API_KEY,
      host: process.env.OPENROUTE_SERVICE
    });

    const route = await directions.calculate({
      coordinates: [
        [lng, lat],
        [info.loc.lng, info.loc.lat]
      ],
      profile: profile,
      format: "geojson",
      arrival: arriveBy ? arriveBy.toISOString() : null, // arrival is hidden in the api not sure if it works
    });

    response.schoolJourneys.push({
      name: info.school.name as JourneyName,
      colour: info.school.colour,
      journeyType: profile == 'foot-walking' ? "walking" : 'bus',
      distance: route.features[0].properties.summary.distance * 0.000621371,
      duration: route.features[0].properties.summary.duration / 60,
      transfers: route.features[0].properties.summary.transfers,
      location: {'lng': info.loc.lng, 'lat': info.loc.lat},
      route: route.features[0].geometry.coordinates.map((p: any) => [p[1], p[0]]) // this needs to be [Lat, Lng] pairs for polyline
    });
  }

  return response;
}


export async function GET(Request: any) {
  try {
    // request a route from openstreetmap between the two points
    const locations = [];
    const url = new URL(Request.url);
    const lng = parseFloat(url.searchParams.get('lng') || '');
    const lat = parseFloat(url.searchParams.get('lat') || '');

    console.log(`Requesting route from OpenRouteService lng: ${lng} ${lat}`);

    if (!isNaN(lng) && !isNaN(lat)) {
      locations.push([lng, lat]);
    } else {
      return new Response("Invalid coordinates", {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    const response = await generateJourneyData(lng, lat);

    return new Response(JSON.stringify(response), {
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (err: any) {
    console.log("An error occurred: " + err.message)
    return new Response(err.response, {
      status: 500,
      headers: {
        "content-type": "application/json",
      },
    });
  }
}