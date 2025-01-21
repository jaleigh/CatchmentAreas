// @ts-ignore
import Openrouteservice from 'openrouteservice-js';
import { schools, School } from "../../data/schools";
import { Journey } from "../../data/postcodes";

export async function generateJounreyData(lng: Number, lat: Number) {
  const distMatrix = new Openrouteservice.Matrix({
    api_key: process.env.OPENROUTE_API_KEY,
    host: process.env.OPENROUTE_SERVICE
  });

  // schools have multiple entrances so keep track of the school to index to the location array
  let locations = [[lng, lat]];
  type LocationMapEntry = { school: School, loc: { lat: number, lng: number } } | null;
  let locationMap: LocationMapEntry[] = [null];
  for (let school of schools) {
    locations.push([school.lng, school.lat]);
    locationMap.push({school: school, loc: {lat: school.lat, lng: school.lng}});
    school.entrances.forEach((entrance) => {
      locations.push([entrance.lng, entrance.lat]);
      locationMap.push({school, loc: entrance});
    });
  }

  let result = await distMatrix.calculate({
    locations: locations,
    metrics: ["distance", "duration"],
    profile: "foot-walking", // options are cycling-regular, foot-walking, driving-car
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

    let route = await directions.calculate({
      coordinates: [
        [lng, lat],
        [info.loc.lng, info.loc.lat]
      ],
      profile: "foot-walking",
      format: "geojson"
    });

    response.schoolJourneys.push({
      name: info.school.name,
      colour: info.school.colour,
      journeyType: "walking",
      distance: result.distances[0][i] * 0.000621371,
      duration: result.durations[0][i] / 60,
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

    const response = await generateJounreyData(lng, lat);

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