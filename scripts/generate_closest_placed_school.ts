import { readFileSync, writeFileSync } from 'fs';
import { PostcodeData } from '../src/app/data/postcodes';
import { postcodes } from '../src/app/data/postcodes';

const postcodesData: PostcodeData[] = JSON.parse(readFileSync('/home/catchments/src/app/data/preClosestForced_postcodes.json', 'utf-8'));

postcodesData.forEach(postcode => {
  // get the shortest distance to BACA, Longhill and PACA as this will be the only schools that has available spaces
  if (!postcode.journeys) {
    return;
  }
  const baca = postcode.journeys.filter(journey => journey.name ==='BACA')[0];
  const paca = postcode.journeys.filter(journey => journey.name ==='PACA')[0];
  const longhill = postcode.journeys.filter(journey => journey.name ==='Longhill High')[0];

  if (baca.distance <= paca.distance && baca.distance <= longhill.distance) {
    postcode.closestPlacement = 'BACA';
  } else if (paca.distance <= baca.distance && paca.distance <= longhill.distance) {
    postcode.closestPlacement = 'PACA';
  } else {
    postcode.closestPlacement = 'Longhill High';
  }
});

writeFileSync('/home/catchments/src/app/data/postcodes.json', JSON.stringify(postcodesData, null, 2), 'utf-8');