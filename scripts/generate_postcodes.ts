import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { kmeans } from 'ml-kmeans';
import { generateJounreyData } from '../src/app/api/distances/route.js';

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

const filterPostcodesToCity = function(postcodes: any) {
  const bBox = {
    tl: {lat: 50.873210, lng: -0.234723},
    br: {lat: 50.797310, lng: -0.030338}
  }

  let filteredPostcodes = [];
  for (let i = 0; i < postcodes.length; ++i) {
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
    // make the request to the journey data to each of the
    try {
      const rep = await generateJounreyData(postcodes[i].lng, postcodes[i].lat);
      rep.schoolJourneys.forEach((p) => {
        if (!postcodes[i].journeys) {
          postcodes[i].journeys = [];
        }
        postcodes[i].journeys.push({
          name: p.name,
          duration: p.duration,
          distance: p.distance,
          journeyType: p.journeyType,
          route: p.route,
          location: p.location,
          colour: p.colour,
        });
      });
      if (i % 10 == 0) {
        console.log(`Processed ${i} postcodes`);
      }
    } catch (e) {
      console.error(`Failed to get journey data for ${postcodes[i].postcode} ${postcodes[i].lng}, ${postcodes[i].lat}`);
    }
  }
};

const postcodes = loadPostcodesFromCSV('./postcodes.csv');
const filteredPostcodes = filterPostcodesToCity(postcodes);

const clusteredPostcodes = clusterPostcodes(filteredPostcodes, 5000);

//await addJourneyData(filteredPostcodes);
await addJourneyData(clusteredPostcodes);

const output = filteredPostcodes.map((postcode: any) => 
  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat}, journeys: ${JSON.stringify(postcode.journeys)} },`
).join('\n');

const clusterdOutput = clusteredPostcodes.map((postcode) => 
  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat}, journeys: ${JSON.stringify(postcode.journeys)} },`
).join('\n');


writeFileSync('./postcodes.txt', output);
writeFileSync('./clusters.txt', clusterdOutput);

writeFileSync('../src/app/data/postcodes.json', JSON.stringify(filteredPostcodes));
writeFileSync('../src/app/data/clusters.json', JSON.stringify(clusteredPostcodes));
