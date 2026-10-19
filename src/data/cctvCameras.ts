import rawCameras from './cctvCameras.json';

export interface TrafficCamera {
  key: string;
  region: string;
  district: string;
  description: string;
  lat: number;
  lng: number;
  url: string;
}

export const CCTV_CAMERAS: TrafficCamera[] = rawCameras as TrafficCamera[];
