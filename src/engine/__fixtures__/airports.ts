import type { Airport } from '../types.ts'

/** The demo scenario's airports, as loaded from OurAirports (October 2026). */
export const DEMO_AIRPORTS: Airport[] = [
  { ident: 'KTEB', code: 'TEB', name: 'Teterboro Airport', municipality: 'Teterboro', latitude: 40.850101, longitude: -74.060799, longest_runway_ft: 6997 },
  { ident: 'KPBI', code: 'DJT', name: 'President Donald J. Trump International Airport', municipality: 'West Palm Beach', latitude: 26.683201, longitude: -80.095596, longest_runway_ft: 10001 },
  { ident: 'KASE', code: 'ASE', name: 'Aspen-Pitkin County Airport (Sardy Field)', municipality: 'Aspen', latitude: 39.223202, longitude: -106.869003, longest_runway_ft: 8006 },
  { ident: 'KVNY', code: 'VNY', name: 'Van Nuys Airport', municipality: 'Van Nuys', latitude: 34.209801, longitude: -118.489998, longest_runway_ft: 8001 },
  { ident: 'KBED', code: 'BED', name: 'Laurence G Hanscom Field', municipality: 'Bedford', latitude: 42.470001, longitude: -71.289001, longest_runway_ft: 7011 },
]
