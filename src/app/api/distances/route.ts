// @ts-ignore
import Openrouteservice from 'openrouteservice-js';
import { schools } from "../../data/schools";
import { Journey } from "../../data/postcodes";

export async function generateJounreyData(lng: Number, lat: Number) {
  const distMatrix = new Openrouteservice.Matrix({
    api_key: process.env.OPENROUTE_API_KEY,
    host: process.env.OPENROUTE_SERVICE
  });

  let locations = [[lng, lat]];
  for (let school of schools) {
    locations.push([school.lng, school.lat]);
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

  const response: { schoolJourneys: Journey[] } = { schoolJourneys: [] };

  // populate the routes that generated the distances/times
  for (let i = 1; i < result.distances[0].length; i++) {

    // get the route between the two points
    const directions = new Openrouteservice.Directions({
      api_key: process.env.OPENROUTE_API_KEY,
      host: process.env.OPENROUTE_SERVICE
    });

    let route = await directions.calculate({
      coordinates: [
        [lng, lat],
        [schools[i-1].lng, schools[i-1].lat]
      ],
      profile: "foot-walking",
      format: "geojson"
    });

    response.schoolJourneys.push({
      name: schools[i-1].name,
      colour: schools[i-1].colour,
      journeyType: "walking",
      distance: result.distances[0][i] * 0.000621371,
      duration: result.durations[0][i] / 60,
      location: {'lng': schools[i-1].lng, 'lat': schools[i-1].lat},
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