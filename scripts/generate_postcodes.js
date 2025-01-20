const { readFileSync } = require('fs');
const { parse } = require('csv-parse/sync');
const { writeFileSync } = require('fs');
const { kmeans } = require('ml-kmeans');
const { generateJounreyData } = require('../src/app/api/distances/route.js')

function loadPostcodesFromCSV(filePath) {
  const fileContent = readFileSync(filePath, 'utf8');
  const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
  });
  return records.map((record) => ({
      postcode: record.pcd,
      lng: record.long ? parseFloat(record.long) : undefined,
      lat: record.lat ? parseFloat(record.lat) : undefined
  }));
}

const clusterPostcodes = function(postcodes, numClusters = 200) {
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
    });
  }

  // assign a postcode to each cluster on a first-come-first-serve basis
  for (let i = 0; i < postcodes.length; ++i) {
    let clusterIndex = res.clusters[i];
    if (!clusteredPostcodes[clusterIndex].postcode) {
      clusteredPostcodes[clusterIndex].postcode = postcodes[i].postcode;
    }
  }

  return clusteredPostcodes;
}

const addJourneyData = async function(postcodes) {
  for (let i = 0; i < postcodes.length; ++i) {
    // make the request to the journey data to each of the 
    const rep = await generateJounreyData(postcodes[i].lng, postcodes[i].lat);
    rep.schoolJourneys.forEach((p) => {
      postcodes[i].duration = p.duration,
      postcodes[i].distance = p.distance,
      postcodes[i].journeyType = p.journeyType,
      postcodes[i].route = p.route,
      postcodes[i].location = p.location

      postcodes[i].journeys.push({
        duration: p.duration,
        distance: p.distance,
      });
  }
}
const postcodes = loadPostcodesFromCSV('./postcodes.csv');

const clusteredPostcodes = clusterPostcodes(postcodes, 400);

const output = postcodes.map((postcode) => 
  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat} },`
).join('\n');

const clusterdOutput = clusteredPostcodes.map((postcode) => 
  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat} },`
).join('\n');


writeFileSync('./output_postcodes.txt', output);
writeFileSync('./output_clusters.txt', clusterdOutput);