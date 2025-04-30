export interface LngLat {
  lng: number,
  lat: number
};

export type CatchmentName = 'Patcham' | 'StringerVarndean' | 'BrightonAldridge' | 'Longhill' | 'BlatchingtonHove' | 'Portslade';
export type JourneyName = 'Varndean School' | 'Dorthy Stringer' | 'Hove Park' | 'Blatchington Mill' | 'Patcham High' | 'Longhill High' | 'BACA' | 'PACA';

export interface Journey {
  name: JourneyName
  journeyType: 'walking' | 'driving' | 'bus',
  distance: number,
  duration: number,
  location: LngLat,
  route: Array<LngLat>
  colour?: string
};

export interface PostcodeData {
  postcode: string,
  lng: number,
  lat: number
  journeys?: Array<Journey>
  closestPlacement: JourneyName // this is the closest school that you end up at if you get none of your preferences
  oldCatchment?: CatchmentName
  newCatchment?: CatchmentName
};

export const clusteredPostcodes: PostcodeData[] = [];
export const postcodes: PostcodeData[] = [];
