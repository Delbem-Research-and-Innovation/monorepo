import { Geometry } from 'geojson';

import { mapper } from '.';

export type SpatialCore = {
  code: string;
  name: string;
  admin_level: keyof typeof mapper.adminLevelMap | 'unknown';
  source: string;
  startDate: Date;
  properties: object;
  geometry: Geometry;
  raw_srid: keyof typeof mapper.sridMap | 'unknown';
};

export type ObservationCore = {
  data: object;
};
