// Longitude, Latitude coordinates for the catchment areas
import { LngLat } from './postcodes';

export interface CatchmentBoundary {
  name: 'Patcham' | 'StringerVarndean' | 'BrightonAldridge' | 'Longhill' | 'BlatchingtonHove' | 'Portslade',
  coordinates: Array<LngLat>
};

export interface Catchments {
  catchments: Array<CatchmentBoundary>
};