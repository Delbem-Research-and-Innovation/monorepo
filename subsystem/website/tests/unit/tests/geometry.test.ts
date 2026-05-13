/**
 * Unit tests for geometry helpers.
 *
 * computeCentroid: returns the area-weighted geometric centroid of a GeoJSON
 * Polygon or MultiPolygon. Used at build time (getStaticProps) to populate
 * Location.center without requiring manual center_lat/center_lng columns in
 * the spreadsheet.
 *
 * All coordinate fixtures are [lng, lat] (GeoJSON convention).
 * Assertions verify [lat, lng] output (browser/map convention).
 */
import { computeCentroid } from 'src/multimapas/geometry';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Unit square centred at (lng=1, lat=1) — centroid is (lng=1, lat=1). */
const unitSquare: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ],
  ],
};

/**
 * 4×2 rectangle — centroid is at (lng=2, lat=1).
 * Non-square to confirm the formula is not just bbox average for asymmetric shapes.
 */
const rectangle4x2: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [4, 0],
      [4, 2],
      [0, 2],
      [0, 0],
    ],
  ],
};

/**
 * MultiPolygon: two unit squares of equal area.
 * Square A centred at (lng=-1, lat=0); Square B centred at (lng=1, lat=0).
 * Centroid of the union (equal weights) → (lng=0, lat=0).
 */
const twoEqualSquares: GeoJSON.MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    // Square A: x ∈ [-2,0], y ∈ [-1,1]
    [
      [
        [-2, -1],
        [0, -1],
        [0, 1],
        [-2, 1],
        [-2, -1],
      ],
    ],
    // Square B: x ∈ [0,2], y ∈ [-1,1]
    [
      [
        [0, -1],
        [2, -1],
        [2, 1],
        [0, 1],
        [0, -1],
      ],
    ],
  ],
};

/** MultiPolygon with a small and a large square — centroid closer to the large one. */
const twoUnequal: GeoJSON.MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    // Small 1×1 square at origin (area=1)
    [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
    // Large 3×3 square at x=10 (area=9)
    [
      [
        [10, 0],
        [13, 0],
        [13, 3],
        [10, 3],
        [10, 0],
      ],
    ],
  ],
};

// ---------------------------------------------------------------------------
// Tests — Polygon
// ---------------------------------------------------------------------------

describe('computeCentroid — Polygon', () => {
  test('unit square centroid is { lat: 1, lng: 1 }', () => {
    const result = computeCentroid(unitSquare);
    expect(result).not.toBeNull();
    if (!result) {
      return;
    }
    expect(result.lat).toBeCloseTo(1, 5);
    expect(result.lng).toBeCloseTo(1, 5);
  });

  test('4×2 rectangle centroid is { lat: 1, lng: 2 }', () => {
    const result = computeCentroid(rectangle4x2);
    expect(result).not.toBeNull();
    if (!result) {
      return;
    }
    expect(result.lat).toBeCloseTo(1, 5);
    expect(result.lng).toBeCloseTo(2, 5);
  });
});

// ---------------------------------------------------------------------------
// Tests — MultiPolygon
// ---------------------------------------------------------------------------

describe('computeCentroid — MultiPolygon', () => {
  test('two equal squares: centroid at lng=0, lat=0', () => {
    const result = computeCentroid(twoEqualSquares);
    expect(result).not.toBeNull();
    if (!result) {
      return;
    }
    expect(result.lat).toBeCloseTo(0, 5);
    expect(result.lng).toBeCloseTo(0, 5);
  });

  test('two unequal squares: centroid closer to the larger one', () => {
    // Small (area=1) at lng≈0.5; Large (area=9) at lng≈11.5
    // Weighted: (1*0.5 + 9*11.5) / (1+9) = (0.5 + 103.5) / 10 = 10.4
    const result = computeCentroid(twoUnequal);
    expect(result).not.toBeNull();
    if (!result) {
      return;
    }
    expect(result.lng).toBeCloseTo(10.4, 4);
  });
});

// ---------------------------------------------------------------------------
// Tests — Unsupported / edge cases
// ---------------------------------------------------------------------------

describe('computeCentroid — unsupported types', () => {
  test('returns null for Point geometry', () => {
    const point: GeoJSON.Point = { type: 'Point', coordinates: [1, 2] };
    expect(computeCentroid(point as GeoJSON.Geometry)).toBeNull();
  });

  test('returns null for empty MultiPolygon', () => {
    const empty: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [],
    };
    expect(computeCentroid(empty)).toBeNull();
  });
});
