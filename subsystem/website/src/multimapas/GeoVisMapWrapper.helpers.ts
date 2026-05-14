import type { SetViewOptions } from '@ttoss/geovis';

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
 * Returns the camera options to center the map on the given location after a
 * dropdown or programmatic selection.
 *
 * Rationale: `Location.center` is populated at build time by `getProjectByName`
 * — either from manual `center_lat`/`center_lng` spreadsheet columns or from
 * `computeCentroid` applied to the GeoJSON source (URL or inline string).
 * Both paths produce `{ lat, lng }` so the swap to `[lng, lat]` (GeoJSON /
 * geovis convention) is always the same.
 *
 * Returns `null` when `location.center` is absent (e.g. mock data without
 * centroid enrichment or a network failure at build time). The caller must
 * check for `null` and skip the `setView` call.
 */
export const cameraForSelection = (
  location: Location
): SetViewOptions | null => {
  if (!location.center) {
    return null;
  }
  return {
    center: [location.center.lng, location.center.lat] as [number, number],
    animate: true,
  };
};

/**
 * Returns the camera options to restore the map view when the user deselects
 * a location (clears `selectedLocationCode`).
 *
 * Rationale: geovis uses `[lng, lat]` for `LngLat` (matching GeoJSON
 * coordinates), whereas `MapConfig.center` stores `{ lat, lng }`. The swap
 * is intentional and mirrors the same convention used in `toGeoVisSpec`.
 *
 * Guards against `mapConfig.center` being `undefined` (not all regions define
 * a default center). When absent, `center` is omitted and geovis keeps its
 * current camera position.
 */
export const cameraForDeselection = (region: Region): SetViewOptions => {
  const { mapConfig } = region;
  return {
    ...(mapConfig.center != null && {
      center: [mapConfig.center.lng, mapConfig.center.lat] as [number, number],
    }),
    ...(mapConfig.zoom != null && { zoom: mapConfig.zoom }),
    animate: true,
  };
};

// Re-export MapConfig so consumers can reference the type without a second import.
export type { MapConfig };
