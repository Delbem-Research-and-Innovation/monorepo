import * as fs from 'fs';
import * as path from 'path';
import * as tj from '@tmcw/togeojson';
import { DOMParser } from 'xmldom';

type GeometryPolygon = {
  type: 'Polygon';
  coordinates: [number, number][][];
};

type Geometry =
  | GeometryPolygon
  | {
      type: 'GeometryCollection';
      geometries: [GeometryPolygon];
    };

type GeoJson = {
  id: string;
  type: 'Feature';
  geometry: Geometry;
  properties: {
    CD_GEOCMU?: string;
    NM_MUNICIP?: string;
  };
};

const getGeoJson = <T = GeoJson>(kmlDir: string) => {
  const kml = new DOMParser().parseFromString(fs.readFileSync(kmlDir, 'utf8'));

  return tj.kml(kml) as unknown as { features: T[] };
};

const readKmls = ({ type }: { type: 'cities' | 'administrativeRegions' }) => {
  const dir = path.join(process.cwd(), 'kmls', type);

  const kmlsDir = fs.readdirSync(dir).map((filename) => {
    return {
      kmlDir: path.join(dir, filename),
      filename,
    };
  });

  return (
    kmlsDir
      .map(({ kmlDir, filename }) => {
        return {
          geoJson: getGeoJson(kmlDir),
          filename,
        };
      })
      .flatMap(({ geoJson, filename }) => {
        const { features } = geoJson;

        return features.flatMap((feature) => {
          const administrativeRegionId = filename.replace('.kml', '');

          const ibgeId =
            type === 'cities'
              ? feature.properties.CD_GEOCMU || ''
              : administrativeRegionId;

          const id = [ibgeId]
            /**
             * Remove undefined values.
             */
            .filter((value) => {
              return value;
            })
            .join('-');

          const coordinates = (() => {
            if (feature.geometry.type === 'Polygon') {
              return feature.geometry.coordinates[0];
            }

            if (feature.geometry.type === 'GeometryCollection') {
              /**
               * Get geometry with the largest coordinates
               */
              const geometry = feature.geometry.geometries.reduce(
                (acc, geometry) => {
                  if (
                    acc.coordinates[0].length > geometry.coordinates[0].length
                  ) {
                    return acc;
                  }

                  return geometry;
                },
                feature.geometry.geometries[0]
              );

              return geometry.coordinates[0];
            }

            return [];
          })();

          const minNumberOfCoordinates = 100;

          const polygon = coordinates
            .map(([lng, lat]) => {
              return [lat, lng];
            })
            /**
             * Filter coordinates to reduce the number of points.
             */
            .filter((_, index, arr) => {
              const ratio = Math.round(arr.length / minNumberOfCoordinates);
              if (ratio === 0) {
                return true;
              }
              return index % ratio === 0;
            });

          return {
            id,
            name: feature.properties.NM_MUNICIP || '',
            administrativeRegionId,
            type,
            ibgeId,
            polygon,
          };
        });
      })
      .filter(({ id }) => {
        return !!id;
      })
      /**
       * Remove duplicates.
       */
      .filter((item, index, self) => {
        return (
          self.findIndex((t) => {
            return t.id === item.id;
          }) === index
        );
      })
  );
};

const POLYGONS = [
  // ...readKmls({ type: 'administrativeRegions' }),
  ...readKmls({ type: 'cities' }),
];

// type Polygon = (typeof POLYGONS)[number];

fs.writeFileSync(
  path.join(process.cwd(), 'src', 'polygons.json'),
  JSON.stringify(POLYGONS, null, 2)
);

const fileSize = fs.statSync(path.join(process.cwd(), 'src', 'polygons.json'));

const sizeInMb = Math.round((fileSize.size / 1024 / 1024) * 100) / 100;

// eslint-disable-next-line no-console
console.log(`Polygons (${sizeInMb} MB) generated successfully!`);
