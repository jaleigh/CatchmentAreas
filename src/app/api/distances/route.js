import Openrouteservice from 'openrouteservice-js';
import { schools } from "../../data/schools";

export async function GET(Request) {
  // request a route from openstreetmap between the two points
  const distMatrix = new Openrouteservice.Matrix({
    api_key: process.env.OPENROUTE_API_KEY
  });

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

  for (let school of schools) {
    locations.push([school.lng, school.lat]);
  }

  try {
    let result = await distMatrix.calculate({
      locations: locations,
      metrics: ["distance", "duration"],
      profile: "foot", //"driving-car", //url.searchParams.get("profile"),
      sources: [0],
      destinations: ['all'],
      units: "m"
    })

    // Add your own result handling here
    let response = {'schoolDists': []};
    for (let i = 1; i < result.distances[0].length; i++) {
      response.schoolDists.push({
        name: schools[i-1].name,
        distance: (result.distances[0][i] * 0.000621371).toFixed(2),
        duration: (result.durations[0][i] / 60).toFixed(2),
        location: {'lng': schools[i-1].lng, 'lat': schools[i-1].lat}
      });
    }

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