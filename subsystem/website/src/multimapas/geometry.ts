/**
 * Pure geometry utilities for GeoJSON features.
 *
 * No external dependencies — all math is self-contained so this module can
 * be safely imported on both server (getStaticProps) and client without
 * bundle-size concerns.
 */

type LatLng = { lat: number; lng: number };

/**
 * Computes the area-weighted geometric centroid of a closed ring of
 * [lng, lat] coordinate pairs using the standard polygon centroid formula.
 *
 * Returns { cx, cy, area } where cx/cy are in the same coordinate space as
 * the input ring (GeoJSON = longitude/latitude) and area is the signed
 * shoelace area (negative = clockwise, positive = counter-clockwise).
 */
const ringCentroid = (
  ring: GeoJSON.Position[]
): { cx: number; cy: number; area: number } => {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;

  for (let i = 0; i < n - 1; i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[i + 1];
    const cross = xi * yj - xj * yi;
    area += cross;
    cx += (xi + xj) * cross;
    cy += (yi + yj) * cross;
  }

  area /= 2;
  // Guard against degenerate (zero-area) rings.
  if (area === 0) {
    return { cx: 0, cy: 0, area: 0 };
  }

  cx /= 6 * area;
  cy /= 6 * area;
  return { cx, cy, area };
};

/**
 * Computes the centroid of a GeoJSON Polygon using its exterior ring.
 * Holes (inner rings) are intentionally ignored — for map centering purposes
 * the exterior ring centroid is accurate enough and avoids edge cases where
 * the true centroid falls inside a hole.
 *
 * Returns null for degenerate (zero-area) polygons.
 */
const polygonCentroid = (
  polygon: GeoJSON.Polygon
): { centroid: LatLng; area: number } | null => {
  const exterior = polygon.coordinates[0];
  if (!exterior || exterior.length < 4) {
    return null;
  }

  const { cx, cy, area } = ringCentroid(exterior);
  if (area === 0) {
    return null;
  }

  // GeoJSON coordinates are [lng, lat], so cx = lng, cy = lat.
  return { centroid: { lng: cx, lat: cy }, area: Math.abs(area) };
};

/**
 * Computes the area-weighted centroid of a GeoJSON Polygon or MultiPolygon.
 *
 * For `MultiPolygon`: each constituent polygon contributes proportionally to
 * its area. This gives the correct centre-of-mass for irregular or
 * geographically split regions (e.g. archipelagos).
 *
 * Returns null for unsupported geometry types, empty coordinates, or
 * degenerate (zero-area) geometries.
 */
export const computeCentroid = (geometry: GeoJSON.Geometry): LatLng | null => {
  if (geometry.type === 'Polygon') {
    const result = polygonCentroid(geometry);
    return result?.centroid ?? null;
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons: GeoJSON.Polygon[] = geometry.coordinates.map((rings) => {
      return {
        type: 'Polygon',
        coordinates: rings,
      };
    });

    let totalArea = 0;
    let wLng = 0;
    let wLat = 0;

    for (const poly of polygons) {
      const result = polygonCentroid(poly);
      if (!result) {
        continue;
      }
      totalArea += result.area;
      wLng += result.centroid.lng * result.area;
      wLat += result.centroid.lat * result.area;
    }

    if (totalArea === 0) {
      return null;
    }
    return { lng: wLng / totalArea, lat: wLat / totalArea };
  }

  return null;
};
