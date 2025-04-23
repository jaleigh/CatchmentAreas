import * as fs from 'fs';

const inputFilePath = '../src/app/data/postcodes.json';
const outputFilePath1 = '../src/app/data/postcodes_half_part1.json';
const outputFilePath2 = '../src/app/data/postcodes_half_part2.json';

// Read the JSON file
fs.readFile(inputFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  try {
    const postcodes = JSON.parse(data);
    const midIndex = Math.ceil(postcodes.length / 2);

    const part1 = postcodes.slice(0, midIndex);
    const part2 = postcodes.slice(midIndex);

    // Write the first part to a new file
    fs.writeFile(outputFilePath1, JSON.stringify(part1), (err) => {
      if (err) {
        console.error('Error writing the first part:', err);
        return;
      }
      console.log('First part saved to', outputFilePath1);
    });

    // Write the second part to a new file
    fs.writeFile(outputFilePath2, JSON.stringify(part2), (err) => {
      if (err) {
        console.error('Error writing the second part:', err);
        return;
      }
      console.log('Second part saved to', outputFilePath2);
    });
  } catch (err) {
    console.error('Error parsing JSON data:', err);
  }
});