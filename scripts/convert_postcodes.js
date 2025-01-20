const { readFileSync } = require('fs');
const { parse } = require('csv-parse/sync');
const { writeFileSync } = require('fs');

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

const postcodes = loadPostcodesFromCSV('/home/catchments/scripts/postcodes.csv');

const output = postcodes.map((postcode) => 
  `{ postcode: '${postcode.postcode}', lng: ${postcode.lng}, lat: ${postcode.lat} },`
).join('\n');

writeFileSync('/home/catchments/scripts/output_postcodes.txt', output);
