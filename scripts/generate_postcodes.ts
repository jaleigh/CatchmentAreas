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

const clusterPostcodes = function(postcodes: any, numClusters = 200) {
  let data = [];
  let centres = [];
  const skip = Math.round(postcodes.length / numClusters);
  for (let i = 0; i < postcodes.length; ++i) {
    if (i % skip == 0) {
      centres.push([postcodes[i].lng, postcodes[i].lat]);
    }
    data.push([postcodes[i].lng, postcodes[i].lat]);
  }
  console.log(`Running kmeans on ${data.length} with ${centres.length} clusters`);
  let res = kmeans(data, centres.length, { initialization: centres });
  console.log(res);
  let clusteredPostcodes = [];
  for (let i = 0; i < res.centroids.length; ++i) {
    clusteredPostcodes.push({
      lng: res.centroids[i][0],
      lat: res.centroids[i][1],
      postcode: undefined,
    });
  }

  // assign a postcode to each cluster on a first-come-first-serve basis
  for (let i = 0; i < postcodes.length; ++i) {
    let clusterIndex = res.clusters[i];
    if (!clusteredPostcodes[clusterIndex].postcode) {
      clusteredPostcodes[clusterIndex].postcode = postcodes[i].postcode;
    }
  }

  clusteredPostcodes = clusteredPostcodes.filter(cluster => cluster.postcode !== undefined && cluster.lng !== 0 && cluster.lat !== 0);

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
          duration: p.duration,
          distance: p.distance,
          journeyType: p.journeyType,
          route: p.route,
          location: p.location
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

const clusteredPostcodes = clusterPostcodes(postcodes, 400);

addJourneyData(clusteredPostcodes);

const output = postcodes.map((postcode: any) => 
  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat} },`
).join('\n');

const clusterdOutput = clusteredPostcodes.map((postcode) => 
  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat} },`
).join('\n');


writeFileSync('./output_postcodes.txt', output);
writeFileSync('./output_clusters.txt', clusterdOutput);