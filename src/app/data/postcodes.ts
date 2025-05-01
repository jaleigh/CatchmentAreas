export interface LngLat {
  lng: number,
  lat: number
};

export type CatchmentName = 'Patcham' | 'StringerVarndean' | 'BrightonAldridge' | 'Longhill' | 'BlatchingtonHove' | 'Portslade';
export type JourneyName = 'Varndean School' | 'Dorthy Stringer' | 'Hove Park' | 'Blatchington Mill' | 'Patcham High' | 'Longhill High' | 'BACA' | 'PACA';
export type JourneyType = 'walking' | 'bus';

export interface Journey {
  name: JourneyName
  journeyType: JourneyType,
  distance: number, // miles
  duration: number, // minutes
  location: LngLat,
  route: Array<LngLat>
  colour?: string
  transfers?: number // number of transfers for bus journeys
};

export interface Journeys {
  walking?: Array<Journey>,
  bus?: Array<Journey>
};

export interface PostcodeData {
  postcode: string,
  lng: number,
  lat: number
  journeys?: Journeys
  closestPlacement: JourneyName // this is the closest school that you end up at if you get none of your preferences
  oldCatchment?: CatchmentName
  newCatchment?: CatchmentName
};

export const clusteredPostcodes: PostcodeData[] = [];
export const postcodes: PostcodeData[] = [];
