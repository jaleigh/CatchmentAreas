import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { kmeans } from 'ml-kmeans';
import { generateJourneyData } from '../src/app/api/distances/route.js';

function loadPostcodesFromCSV(filePath: string) {
  const fileContent = readFileSync(filePath, 'utf8');
  const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
  });
  return records.map((record: any) => ({
      postcode: record.pcd,
      lng: record.long ? parseFloat(record.long) : undefined,
      lat: record.lat ? parseFloat(record.lat) : undefined
  }));
}

const filterPostcodesToCity = function(postcodes: any, skip: number = 1) {
  const bBox = {
    tl: {lat: 50.873210, lng: -0.234723},
    br: {lat: 50.797310, lng: -0.030338}
  }

  let filteredPostcodes = [];
  for (let i = 0; i < postcodes.length; i+=skip) {
    // filter out postcodes outside the core of the city
    if (postcodes[i].lat < bBox.br.lat || postcodes[i].lat > bBox.tl.lat || postcodes[i].lng < bBox.tl.lng || postcodes[i].lng > bBox.br.lng) {
      continue;
    }
    filteredPostcodes.push(postcodes[i]);
  }

  return filteredPostcodes;
}

const clusterPostcodes = function(postcodes: any, numClusters = 200) {
  let data = [];
  let centres = [];
  let names = [];

  for (let i = 0; i < postcodes.length; ++i) {
    data.push([postcodes[i].lng, postcodes[i].lat]);
    names.push(postcodes[i].postcode);
  }

  // select the initial centres based on a grid of the city bbox
  const minLat = Math.min(...data.map(d => d[1]));
  const maxLat = Math.max(...data.map(d => d[1]));
  const minLng = Math.min(...data.map(d => d[0]));
  const maxLng = Math.max(...data.map(d => d[0]));

  const latStep = (maxLat - minLat) / numClusters;
  const lngStep = (maxLng - minLng) / numClusters;

  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    for (let lng = minLng; lng <= maxLng; lng += lngStep) {
      centres.push([lng, lat]);
      if (centres.length >= numClusters) break;
    }
    if (centres.length >= numClusters) break;
  }

  /* // select centres by stepping through the data
  const skip = Math.round(data.length / numClusters);
  for (let i = 0; i < data.length; i += skip) {
    centres.push(data[i]);
  }*/

  console.log(`Running kmeans on ${data.length} with ${centres.length} clusters`);
  let res = kmeans(data, centres.length, { initialization: centres });
  let clusteredPostcodes = [];
  for (let i = 0; i < res.centroids.length; ++i) {
    clusteredPostcodes.push({
      lng: res.centroids[i][0],
      lat: res.centroids[i][1],
      postcode: undefined,
      journeys: []
    });
  }

  // assign a postcode to each cluster on a first-come-first-serve basis
  for (let i = 0; i < res.clusters.length; ++i) {
    let clusterIndex = res.clusters[i];
    if (!clusteredPostcodes[clusterIndex].postcode) {
      clusteredPostcodes[clusterIndex].postcode = names[i];
    }
  }

  clusteredPostcodes = clusteredPostcodes.filter(cluster => cluster.postcode !== undefined && cluster.lng !== 0 && cluster.lat !== 0);

  console.log(`Num clusters After Filtring ${clusteredPostcodes.length}`);

  // make sure all clusters are unique - kmeans init probably wasn't very good
  const uniqueClusters = new Set();
  clusteredPostcodes = clusteredPostcodes.filter(cluster => {
    const key = `${cluster.lng},${cluster.lat}`;
    if (uniqueClusters.has(key)) {
      return false;
    }
    uniqueClusters.add(key);
    return true;
  });

  console.log(`Num clusters After Deduping ${clusteredPostcodes.length}`);

  return clusteredPostcodes;
}

const addJourneyData = async function(postcodes: any) {
  for (let i = 0; i < postcodes.length; ++i) {
    /*
    postcodes[i].journeys = {
      walking: [],
      bus: []
    };
    try {
      const rep = await generateJourneyData(postcodes[i].lng, postcodes[i].lat, 'foot-walking');
      rep.schoolJourneys.forEach((p) => {
        postcodes[i].journeys.walking.push({
          name: p.name,
          duration: p.duration,
          distance: p.distance,
          journeyType: p.journeyType,
          route: p.route,
          location: p.location,
          colour: p.colour,
        });
      });
    } catch (e) {
      console.error(`Failed to get walking data for ${postcodes[i].postcode} ${postcodes[i].lng}, ${postcodes[i].lat} ${e}`);
    }*/

    postcodes[i].journeys.bus = [];
    try {
      const busRep = await generateJourneyData(postcodes[i].lng, postcodes[i].lat, 'public-transport', new Date("2025-05-01T08:50:00Z"));
      busRep.schoolJourneys.forEach((p) => {
        postcodes[i].journeys.bus.push({
          name: p.name,
          duration: p.duration,
          distance: p.distance,
          journeyType: p.journeyType,
          route: p.route,
          location: p.location,
          colour: p.colour,
        });
      });
    } catch (e) {
      console.error(`Failed to get bus data for ${postcodes[i].postcode} ${postcodes[i].lng}, ${postcodes[i].lat} ${e}`);
    }
  }
};

const isPointInsidePolygon = function(lng: number, lat: number, polygon: any) {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const lat0 = polygon[i][0], lng0 = polygon[i][1];
    const lat1 = polygon[j][0], lng1 = polygon[j][1];

    const intersect = ((lng0 > lng) !== (lng1 > lng)) && (lat < (lat1 - lat0) * (lng - lng0) / (lng1 - lng0) + lat0);
    if (intersect) inside = !inside;
  }
  return inside;
}

const addCatchmentToPostcodes = function(postcodes: any) {
  // add the old and new catchment areas to each postcode
  const oldCatchments = JSON.parse(readFileSync('../src/app/data/old_catchments.json', 'utf8')).catchments;
  for (let i = 0; i < postcodes.length; ++i) {
    for (let j = 0; j < oldCatchments.length; ++j) {
      if (isPointInsidePolygon(postcodes[i].lng, postcodes[i].lat, oldCatchments[j].coordinates)) {
        postcodes[i].oldCatchment = oldCatchments[j].name;
        break;
      }
    }
  }

  const newCatchments = JSON.parse(readFileSync('../src/app/data/new_catchments.json', 'utf8')).catchments;
  for (let i = 0; i < postcodes.length; ++i) {
    for (let j = 0; j < newCatchments.length; ++j) {
      if (isPointInsidePolygon(postcodes[i].lng, postcodes[i].lat, newCatchments[j].coordinates)) {
        postcodes[i].newCatchment = newCatchments[j].name;
        break;
      }
    }
  }
}

/*
const postcodes = loadPostcodesFromCSV('./postcodes.csv');
const filteredPostcodes = filterPostcodesToCity(postcodes, 2);
//const clusteredPostcodes = clusterPostcodes(filteredPostcodes, 3000);

await addCatchmentToPostcodes(filteredPostcodes);
writeFileSync('../src/app/data/postcodes.json', JSON.stringify(filteredPostcodes));
*/

// ors-app runs out of memory it can only do 500 or so before crashing, so read it back in and add missing journey data
const postcodesData = JSON.parse(readFileSync('../src/app/data/postcodes.json', 'utf8'));
let processedCnt = 0;
for (let i = 0; i < postcodesData.length; i++) {
  if (!postcodesData[i].journeys || postcodesData[i].journeys.walking.length === 0 || postcodesData[i].journeys.bus.length === 0) {
    await addJourneyData([postcodesData[i]]);
    ++processedCnt;
  }

  if (i % 10 == 0) {
    console.log(`Processed ${i} postcodes`);
  }

  if (processedCnt % 100 == 0 && processedCnt != 0) {
    console.log(`postcodes saving to file ${i}`);
    writeFileSync('../src/app/data/postcodes.json', JSON.stringify(postcodesData));
  }
}

//await addJourneyData(clusteredPostcodes);

//const output = filteredPostcodes.map((postcode: any) => 
//  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat}, journeys: ${JSON.stringify(postcode.journeys)} },`
//).join('\n');

/*
const clusterdOutput = clusteredPostcodes.map((postcode) => 
  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat}, journeys: ${JSON.stringify(postcode.journeys)} },`
).join('\n');
*/

//writeFileSync('./postcodes.txt', output);
//writeFileSync('./clusters.txt', clusterdOutput);


//writeFileSync('../src/app/data/clusters.json', JSON.stringify(clusteredPostcodes));
