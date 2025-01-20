import Openrouteservice from 'openrouteservice-js';
import { schools } from "../../data/schools";

export async function generateJounreyData(lng, lat) {
  const distMatrix = new Openrouteservice.Matrix({
    api_key: process.env.OPENROUTE_API_KEY,
    host: process.env.OPENROUTE_SERVICE
  });

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

  const response = {'schoolJourneys': []};

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
      distance: (result.distances[0][i] * 0.000621371).toFixed(2),
      duration: (result.durations[0][i] / 60).toFixed(2),
      location: {'lng': schools[i-1].lng, 'lat': schools[i-1].lat},
      route: route.geo // this needs to be [number, number] Lat, Lng pairs
    });
  }

  return response;
}

export async function GET(Request) {
  try {
    // request a route from openstreetmap between the two points
    console.log("Requesting route from OpenRouteService", process.env.OPENROUTE_SERVICE);

    const locations = [];
    const url = new URL(Request.url);
    const lng = parseFloat(url.searchParams.get('lng'));
    const lat = parseFloat(url.searchParams.get('lat'));

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
  } catch (err) {
    console.log("An error occurred: " + err.message)
    return new Response(err.response, {
      status: 500,
      headers: {
        "content-type": "application/json",
      },
    });
  }
}