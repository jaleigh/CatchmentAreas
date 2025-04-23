export interface LatLong {
  lng: number;
  lat: number;
}

export interface School {
  name: string;
  catchment: string;
  lng: number;
  lat: number;
  entrances: Array<LatLong>;
  colour: string;
}

export const schools: School[] = [
  {
    name: 'Varndean School',
    catchment: 'StringerVarndean',
    lng: -0.13648267150638296,
    lat: 50.84996246606285,
    entrances: [{lat: 50.848958, lng: -0.136222}, {lat: 50.850123, lng: -0.135150}],
    colour: 'red'
  },
  {
    name: 'Dorthy Stringer',
    catchment: 'StringerVarndean',
    lng: -0.14334912643220177,
    lat: 50.84877028209984,
    entrances: [{lat: 50.849719, lng: -0.142787}, {lat: 50.846838, lng: -0.141942}],
    colour: 'blue'
  },
  {
    name: 'Hove Park',
    catchment: 'BlatchingtonHove',
    lng: -0.179361,
    lat: 50.840592,
    entrances: [{lat: 50.839065, lng: -0.180437}, {lat: 50.840592, lng: -0.178157}],
    colour: 'green'
  },
  {
    name: 'Blatchington Mill',
    catchment: 'BlatchingtonHove',
    lng: -0.18379413197832176,
    lat: 50.84494638334588,
    entrances: [{lat: 50.842350, lng: -0.183161}, {lat: 50.845649, lng: -0.181637}],
    colour: 'purple'
  },
  {
    name: 'Patcham High',
    catchment: 'PatchamHigh',
    lng: -0.14338958779814723,
    lat: 50.86270805216661,
    entrances: [{lat: 50.862404, lng: -0.142905}, {lat: 50.863767, lng: -0.144205}],
    colour: 'orange'
  },
  {
    name: 'Longhill High',
    catchment: 'Longhill',
    lng: -0.06719373251716731,
    lat: 50.81838888519547,
    entrances: [],
    colour: 'yellow'
  },
  /*{
    name: 'Kings School',
    lng: -0.19195826296668858,
    lat: 50.85370861230319,
    entrances: [],
    colour: 'pink'
  },
  {
    name: 'Cardinal Newman',
    lng: -0.1589023153430958,
    lat: 50.8371715366439,
    entrances: [],
    colour: 'brown'
  },*/
  {
    name: 'BACA',
    catchment: 'BrightonAldridge',
    lng: -0.09278489104966146,
    lat: 50.85880054711686,
    entrances: [{lat: 50.858060, lng: -0.093756}, {lat: 50.858166, lng: -0.087841}],
    colour: 'black'
  },
  {
    name: 'PACA',
    catchment: 'Portslade',
    lng: -0.22580460499288743,
    lat: 50.85085909379337,
    entrances: [],
    colour: 'grey'
  }
];