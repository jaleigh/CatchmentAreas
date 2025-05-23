import proj4 from 'proj4';
import { readFileSync, writeFileSync } from 'fs';

// convert EPSG:27700 (British National Grid) to EPSG:4326 (WGS84)

// Define the EPSG:27700 (British National Grid) and EPSG:4326 (WGS84) projections
proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs");
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

// Load the GeoJSON file
const geojsonPath = "../src/app/data/new_catchments.json";
const geojson = JSON.parse(readFileSync(geojsonPath, "utf8"));

/* This was used for the old catchments - json layout was slightly different
const catchmentPolygons: { [key: string]: [number, number][] } = {};
geojson.features.forEach((feature: { properties: { AreaName: string }; geometry: { coordinates: any } }) => {
  const areaName = feature.properties.AreaName;
  const coords = feature.geometry.coordinates[0][0];
  catchmentPolygons[areaName] = coords.map(([x, y]: [number, number]) => proj4("EPSG:27700", "EPSG:4326", [x, y]));
});
*/

const catchmentPolygons: { catchments: { name: string, coordinates: [number, number][]}[] } = { catchments: [] };
geojson.features.forEach((feature: { properties: { catchment: string }; geometry: { coordinates: any } }) => {
  const areaName = feature.properties.catchment;
  let maxLen = 0;
  let coords: [number, number][] = [];
  for (let i = 0; i < feature.geometry.coordinates.length; ++i) {
    if (feature.geometry.coordinates[i][0].length > maxLen) {
      coords = feature.geometry.coordinates[i][0];
      maxLen = feature.geometry.coordinates[i][0].length;
    }
  }
  catchmentPolygons.catchments.push({
    name: areaName,
    coordinates: coords.map(([x, y]: [number, number]) => {
      const c = proj4("EPSG:27700", "EPSG:4326", [x, y]);
      return [c[1], c[0]]; // Return as [lat, lng]
    })
  });
});

// Save the updated GeoJSON
const outputPath = "../src/app/data/new-catchments-converted.json";
writeFileSync(outputPath, JSON.stringify(catchmentPolygons, null, 2), "utf8");

console.log(`Converted GeoJSON saved to ${outputPath}`);