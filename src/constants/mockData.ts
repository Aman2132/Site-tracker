import { AppEvent, Person, Photo, Site } from '@/types/domain';

/**
 * Static seed data for the mock api/ layer (src/api/*). This is the only
 * file that should need to change to reskin the demo dataset; nothing
 * downstream (stores, controllers, screens) imports these constants
 * directly — they always go through api/.
 */

export const SEED_SITE: Site = {
  name: 'Sector 62 · Tower B',
  lat: 28.6139,
  lng: 77.209,
  radius: 150,
};

export const SEED_PEOPLE: Person[] = [
  {
    id: 'rk',
    name: 'Ramesh Kumar',
    role: 'Driver · Crew A',
    color: '#1a73e8',
    kind: 'vehicle',
    lat: 28.6142,
    lng: 77.2096,
    accuracy: 12,
    lastFixAt: Date.now(),
    battery: 0.71,
    paused: false,
  },
  {
    id: 'sy',
    name: 'Suryakant Yadav',
    role: 'Mason · Crew A',
    color: '#188038',
    kind: 'walk',
    lat: 28.6138,
    lng: 77.209,
    accuracy: 7,
    lastFixAt: Date.now(),
    battery: 0.68,
    paused: false,
  },
  {
    id: 'pd',
    name: 'Pooja Devi',
    role: 'Helper · Crew A',
    color: '#a142f4',
    kind: 'still',
    lat: 28.6136,
    lng: 77.2089,
    accuracy: 6,
    lastFixAt: Date.now(),
    battery: 0.55,
    paused: false,
  },
  {
    id: 'at',
    name: 'Arjun Thakur',
    role: 'Bar bender · Crew B',
    color: '#9aa0a6',
    kind: 'stale',
    lat: 28.614,
    lng: 77.2093,
    accuracy: 64,
    lastFixAt: Date.now() - 2 * 3600e3 - 14 * 60e3,
    battery: 0.09,
    paused: false,
  },
  {
    id: 'vs',
    name: 'Vikas Singh',
    role: 'Carpenter · Crew B',
    color: '#f29900',
    kind: 'walk',
    lat: 28.6134,
    lng: 77.2087,
    accuracy: 8,
    lastFixAt: Date.now(),
    battery: 0.62,
    paused: false,
  },
];

export const SEED_PHOTOS: Photo[] = [
  {
    id: 'ph1',
    uri: 'https://picsum.photos/seed/site-col-l4/600',
    lat: 28.6139,
    lng: 77.209,
    accuracy: 8,
    takenAt: Date.now() - 20 * 60e3,
    personId: 'sy',
    task: 'Column grid L4',
    synced: true,
  },
  {
    id: 'ph2',
    uri: 'https://picsum.photos/seed/site-shutter/600',
    lat: 28.61385,
    lng: 77.20895,
    accuracy: 6,
    takenAt: Date.now() - 55 * 60e3,
    personId: 'vs',
    task: 'Shuttering · Block C',
    synced: true,
  },
  {
    id: 'ph3',
    uri: 'https://picsum.photos/seed/site-rebar/600',
    lat: 28.61375,
    lng: 77.20905,
    accuracy: 9,
    takenAt: Date.now() - 3 * 3600e3,
    personId: 'at',
    task: 'Rebar tie-in · Bay 2',
    synced: true,
  },
  {
    id: 'ph4',
    uri: 'https://picsum.photos/seed/site-material/600',
    lat: 28.6141,
    lng: 77.2094,
    accuracy: 11,
    takenAt: Date.now() - 6 * 3600e3,
    personId: 'pd',
    task: 'Material delivery',
    synced: false,
  },
];

export const SEED_EVENTS: AppEvent[] = [
  { id: 'ev1', at: Date.now() - 9 * 60e3, text: 'Suryakant uploaded 2 photos', kind: 'info' },
  { id: 'ev2', at: Date.now() - 40 * 60e3, text: 'Arjun Thakur — battery below 10%', kind: 'warn' },
  { id: 'ev3', at: Date.now() - 70 * 60e3, text: 'Vikas Singh entered Sector 62 · Tower B', kind: 'info' },
  { id: 'ev4', at: Date.now() - 5 * 3600e3, text: 'Ramesh Kumar left Sector 62 · Tower B', kind: 'warn' },
];
