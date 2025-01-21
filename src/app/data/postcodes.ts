export interface LngLat {
  lng: number,
  lat: number
};

export interface Journey {
  name: string,
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
};

export const clusteredPostcodes: PostcodeData[] = [];
export const postcodes: PostcodeData[] = [];
