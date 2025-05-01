import { readFileSync, createWriteStream } from 'fs';
import { PostcodeData } from '../src/app/data/postcodes';
import { JSONStream } from 'JSONStream';

const postcodesData: PostcodeData[] = JSON.parse(readFileSync('/home/catchments/src/app/data/postcodes.json', 'utf-8'));

postcodesData.forEach(postcode => {
  // get the shortest distance to BACA, Longhill and PACA as this will be the only schools that has available spaces
  if (!postcode.journeys) {
    return;
  }
  const baca = postcode?.journeys?.['walking']?.filter(journey => journey.name === 'BACA')?.[0] ?? { distance: Infinity };
  const paca = postcode?.journeys?.['walking']?.filter(journey => journey.name ==='PACA')[0] ?? { distance: Infinity };
  const longhill = postcode?.journeys?.['walking']?.filter(journey => journey.name ==='Longhill High')[0] ?? { distance: Infinity };

  if (baca.distance <= paca.distance && baca.distance <= longhill.distance) {
    postcode.closestPlacement = 'BACA';
  } else if (paca.distance <= baca.distance && paca.distance <= longhill.distance) {
    postcode.closestPlacement = 'PACA';
  } else {
    postcode.closestPlacement = 'Longhill High';
  }
});

const stream = createWriteStream('/home/catchments/src/app/data/withpostcodes.json');
const jsonStream = JSONStream.stringify('[\n', ',\n', '\n]\n');
jsonStream.pipe(stream);
postcodesData.forEach(postcode => jsonStream.write(postcode));
jsonStream.end();

//writeFileSync('/home/catchments/src/app/data/withpostcodes.json', JSON.stringify(postcodesData, null, 2), 'utf-8');