/**
 * Unit tests for helpers exported from projects.ts:
 *   - asFeatureCollection (P4a — 7 cases)
 *   - isValidNumber       (P4a — 5 cases)
 *
 * Total: 12 cases.
 *
 * projects.ts imports from 'next/cache', 'src/google', and './polygons'.
 * These are mocked here so the module can be loaded without real side-effects.
 */

import { asFeatureCollection, isValidNumber } from 'src/multimapas/projects';

jest.mock('src/google', () => {
  return {
    getAuth: jest.fn().mockResolvedValue({}),
    listAllFoldersInFolder: jest.fn().mockResolvedValue([]),
    listAllSheetsInFolder: jest.fn().mockResolvedValue([]),
    sheets: {
      spreadsheets: {
        get: jest.fn(),
        values: { get: jest.fn() },
      },
    },
  };
});

// ---------------------------------------------------------------------------
// asFeatureCollection
// ---------------------------------------------------------------------------

describe('asFeatureCollection', () => {
  const validFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: '1' },
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
      },
    ],
  };

  // Case 1 — Happy path: valid FeatureCollection JSON string
  test('Case 1: valid FeatureCollection JSON string → returns parsed FeatureCollection', () => {
    const input = JSON.stringify(validFeatureCollection);

    const result = asFeatureCollection(input);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('FeatureCollection');
    expect(Array.isArray(result!.features)).toBe(true);
  });

  // Case 2 — null input
  test('Case 2: null → returns null', () => {
    expect(asFeatureCollection(null)).toBeNull();
  });

  // Case 3 — undefined input
  test('Case 3: undefined → returns null', () => {
    expect(asFeatureCollection(undefined)).toBeNull();
  });

  // Case 4 — Object input with correct type and features array (bypass JSON.parse)
  test('Case 4: plain object with type=FeatureCollection and features array → returns it directly', () => {
    const result = asFeatureCollection(validFeatureCollection);

    expect(result).toBe(validFeatureCollection);
  });

  // Case 5 — Object missing features (or features not an array)
  test('Case 5: object with type=FeatureCollection but features is not an array → returns null', () => {
    const badObj = { type: 'FeatureCollection', features: 'not-an-array' };

    expect(asFeatureCollection(badObj)).toBeNull();
  });

  // Case 6 — Malformed JSON string (catch branch)
  test('Case 6: malformed JSON string → returns null (catch block, no throw)', () => {
    const malformed = '{"type": FeatureCollection';

    expect(() => {
      return asFeatureCollection(malformed);
    }).not.toThrow();
    expect(asFeatureCollection(malformed)).toBeNull();
  });

  // Case 7 — Valid JSON but type !== 'FeatureCollection'
  test('Case 7: valid JSON string but type !== FeatureCollection → returns null', () => {
    const notACollection = JSON.stringify({
      type: 'Feature',
      geometry: null,
      properties: {},
    });

    expect(asFeatureCollection(notACollection)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidNumber
// ---------------------------------------------------------------------------

describe('isValidNumber', () => {
  // Case 1 — Numeric string
  test('Case 1: numeric string → true', () => {
    expect(isValidNumber('42')).toBe(true);
    expect(isValidNumber('-23.5')).toBe(true);
  });

  // Case 2 — Zero (important: zero is a valid coordinate, must not be treated as falsy)
  test('Case 2: zero (0 and "0") → true', () => {
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber('0')).toBe(true);
  });

  // Case 3 — Empty string
  test('Case 3: empty string → false', () => {
    expect(isValidNumber('')).toBe(false);
  });

  // Case 4 — null
  test('Case 4: null → false', () => {
    expect(isValidNumber(null)).toBe(false);
  });

  // Case 5 — String 'NaN'
  test("Case 5: string 'NaN' → false", () => {
    expect(isValidNumber('NaN')).toBe(false);
  });
});
