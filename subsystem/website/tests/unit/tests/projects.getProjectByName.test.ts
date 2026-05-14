/**
 * Regression tests for getProjectByName — inline GeoJSON in geoJsonUrl field.
 *
 * When `geoJsonUrl` is a valid JSON string, the code now detects it,
 * parses it directly (without a network call), and populates `location.center`
 * from `computeCentroid`.
 *
 * Test strategy (3 cases):
 *  1. Happy path  — inline FeatureCollection Polygon → location.center populated.
 *  2. No fetch    — fetch() is never called when geoJsonUrl is inline JSON.
 *  3. Negative    — non-matching feature key → center stays undefined (invariant).
 *
 * GeoJSON inline fixture: unit-square Polygon [lng ∈ 0–2, lat ∈ 0–2].
 *   Key: properties.cd_key === 'A001'
 *   Expected centroid (area-weighted): { lat: 1, lng: 1 }
 *
 * Spreadsheet row layout consumed by getProjectByName:
 *   [0] ignored
 *   [1] configArr = [geoJsonKey, geoJsonUrl, zoom, centerLat, centerLng]
 *   [2] ignored
 *   [3] headers   = [code, name, …variables]
 *   [4] data row  = ['A001', 'Location A']
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { sheets } from 'src/google';
import { getProjectByName } from 'src/multimapas/projects';

// ---------------------------------------------------------------------------
// Module mock — prevent all real Google API / Drive / Sheets calls
// ---------------------------------------------------------------------------

// jest.mock is hoisted above imports by babel-jest, so the mocked exports are
// available to the module-under-test at require() time.
jest.mock('src/google', () => {
  return {
    getAuth: jest.fn().mockResolvedValue({}),
    listAllFoldersInFolder: jest
      .fn()
      .mockResolvedValue([{ id: 'proj-1', name: 'TestProject' }]),
    listAllSheetsInFolder: jest
      .fn()
      .mockResolvedValue([{ id: 'dados-1', name: 'Dados' }]),
    sheets: {
      spreadsheets: {
        get: jest.fn(),
        values: {
          get: jest.fn(),
        },
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Inline FeatureCollection chosen as the representative inline format:
 * a JSON string stored directly in the spreadsheet cell (configArr[1]).
 *
 * A FeatureCollection string is more representative than a bare Geometry
 * because it matches the same shape that a URL-fetched GeoJSON would return,
 * making the detection path symmetric (try JSON.parse, fall back to fetch).
 *
 * Single unit-square Polygon — centroid: { lat: 1, lng: 1 }.
 */
const inlineFeatureCollection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { cd_key: 'A001' },
      geometry: {
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
      },
    },
  ],
};

/**
 * Builds the `sheets.spreadsheets.values.get` response for the 'Region1' tab
 * of the 'Dados' spreadsheet. Accepts any geoJsonUrl value (URL string or
 * inline JSON string) so the same helper serves both inline and URL variants.
 */
const makeSheetValues = (geoJsonUrl: string) => {
  return {
    data: {
      values: [
        [],
        ['cd_key', geoJsonUrl, 10, -23.5, -46.6],
        [],
        ['code', 'name'],
        ['A001', 'Location A'],
      ],
    },
  };
};

// ---------------------------------------------------------------------------
// Test-level globals
// ---------------------------------------------------------------------------

let fetchMock: jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let originalFetch: any;

beforeAll(() => {
  // Snapshot the original fetch before overwriting so we can restore it in
  // afterAll and prevent leaking the mock into other test files.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalFetch = (global as any).fetch;

  // Replace global fetch so any call is intercepted and will reject.
  // This makes Case 2 detectable (call count) without triggering real network.
  fetchMock = jest
    .fn()
    .mockRejectedValue(
      new TypeError(
        'Not a valid URL — fetch must not be called for inline JSON'
      )
    );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = fetchMock;

  // The Dados spreadsheet exposes a single tab 'Region1' for all tests.
  (sheets.spreadsheets.get as jest.Mock).mockResolvedValue({
    data: { sheets: [{ properties: { title: 'Region1' } }] },
  });
});

afterAll(() => {
  // Restore the original fetch to prevent leaking the mock into other suites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getProjectByName — inline GeoJSON in geoJsonUrl', () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  /**
   * Case 1 — Happy path.
   *
   * When geoJsonUrl contains an inline JSON string, getProjectByName should
   * parse it directly and populate location.center from computeCentroid.
   */
  test('Case 1 (happy path): location.center populated from inline FeatureCollection centroid', async () => {
    (sheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce(
      makeSheetValues(JSON.stringify(inlineFeatureCollection))
    );

    const project = await getProjectByName('TestProject');

    expect(project).toBeDefined();
    const location = project!.regions[0].locations[0];
    expect(location.code).toBe('A001');

    expect(location.center).toBeDefined();
    expect(location.center!.lat).toBeCloseTo(1, 5);
    expect(location.center!.lng).toBeCloseTo(1, 5);
  });

  /**
   * Case 2 — No fetch call.
   *
   * When geoJsonUrl is parseable as JSON, the code should never reach fetch().
   * `beforeEach` clears fetchMock.mock.calls before each test, so this
   * assertion is independent of Case 1.
   */
  test('Case 2: fetch() is never called when geoJsonUrl contains inline JSON', async () => {
    (sheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce(
      makeSheetValues(JSON.stringify(inlineFeatureCollection))
    );

    await getProjectByName('TestProject');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * Case 3 — Negative / invariant (passes before AND after the fix).
   *
   * A location whose code does not appear in the FeatureCollection must not
   * receive a center, even after the inline-JSON path is implemented.
   */
  test('Case 3 (negative): location with no matching feature key stays without center', async () => {
    const noMatchCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { cd_key: 'UNRELATED' },
          geometry: {
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
          },
        },
      ],
    };

    (sheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce(
      makeSheetValues(JSON.stringify(noMatchCollection))
    );

    const project = await getProjectByName('TestProject');

    const location = project!.regions[0].locations[0];
    // The inline GeoJSON has no feature with cd_key === 'A001', so center
    // must remain undefined regardless of the inline-vs-URL path.
    expect(location.center).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// URL GeoJSON centroid tests
// ---------------------------------------------------------------------------

/**
 * Covers the URL GeoJSON path: when geoJsonUrl is a real URL string,
 * `fetch()` must be called once with that URL and `location.center` must be
 * populated from `computeCentroid` applied to the returned FeatureCollection.
 *
 * Same unit-square Polygon fixture — expected centroid: { lat: 1, lng: 1 }.
 */
describe('getProjectByName — URL GeoJSON centroid enrichment', () => {
  const GEO_URL = 'https://example.com/geo.geojson';

  const urlFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { cd_key: 'A001' },
        geometry: {
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
        },
      },
    ],
  };

  beforeEach(() => {
    fetchMock.mockClear();
    // For URL tests, fetch should succeed and return the FeatureCollection.
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(urlFeatureCollection),
    });

    (sheets.spreadsheets.values.get as jest.Mock).mockResolvedValue(
      makeSheetValues(GEO_URL)
    );
  });

  test('location.center is populated from URL GeoJSON centroid', async () => {
    const project = await getProjectByName('TestProject');

    expect(project).toBeDefined();
    const location = project!.regions[0].locations[0];
    expect(location.center).toBeDefined();
    expect(location.center!.lat).toBeCloseTo(1, 5);
    expect(location.center!.lng).toBeCloseTo(1, 5);
  });

  test('fetch() is called once with the geoJsonUrl', async () => {
    await getProjectByName('TestProject');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(GEO_URL);
  });

  test('fetch() is NOT called when geoJsonUrl is inline JSON', async () => {
    // Override the sheet to use inline JSON instead of a URL.
    (sheets.spreadsheets.values.get as jest.Mock).mockResolvedValue(
      makeSheetValues(
        JSON.stringify({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { cd_key: 'A001' },
              geometry: {
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
              },
            },
          ],
        })
      )
    );

    // Reset fetch to the rejecting mock so any call would be detectable.
    fetchMock.mockRejectedValue(
      new TypeError('fetch must not be called for inline JSON')
    );

    const project = await getProjectByName('TestProject');

    expect(fetchMock).not.toHaveBeenCalled();
    // Center is still populated via the inline path.
    const location = project!.regions[0].locations[0];
    expect(location.center).toBeDefined();
  });

  test('location.center remains undefined when fetch returns non-ok response', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    const project = await getProjectByName('TestProject');

    const location = project!.regions[0].locations[0];
    expect(location.center).toBeUndefined();
  });
});
