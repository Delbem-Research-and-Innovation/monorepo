import type { Location, MapConfig, Region } from './projects';

/**
 * Resolves the `Region.Location` entry whose `code` matches the given geovis
 * `featureId`.
 *
 * Rationale: geovis emits `featureId` as `string | number` (MapLibre can
 * assign integer ids to features). Coercing both sides to `String` before
 * comparison prevents mismatches when numeric ids are used in the GeoJSON
 * source (e.g. `35001` vs `"35001"`).
 */
export const locationForFeatureId = (
  featureId: string | number,
  region: Region
): Location | undefined => {
  return region.locations.find((l) => {
    return String(l.code) === String(featureId);
  });
};

/**
 * Converts a geovis `featureId` to a plain string location code.
 *
 * Rationale: the `setLocationCode` prop always receives a string. Geovis
 * can emit numeric feature ids (e.g. from integer-keyed GeoJSON sources),
 * so an explicit String() coercion is required at the click-handler boundary.
 */
export const codeFromFeatureId = (featureId: string | number): string => {
  return String(featureId);
};

/**
 * Returns the camera options to restore the map view when the user deselects
 * a location (clears `selectedLocationCode`).
 *
 * Rationale: geovis uses `[lng, lat]` for `LngLat` (matching GeoJSON
 * coordinates), whereas `MapConfig.center` stores `{ lat, lng }`. The swap
 * is intentional and mirrors the same convention used in `toGeoVisSpec`.
 */
export const cameraForDeselection = (
  region: Region
): { center: [number, number]; zoom: number; animate: boolean } => {
  return {
    center: [region.mapConfig.center.lng, region.mapConfig.center.lat],
    zoom: region.mapConfig.zoom,
    animate: true,
  };
};

// Re-export MapConfig so consumers can reference the type without a second import.
export type { MapConfig };
