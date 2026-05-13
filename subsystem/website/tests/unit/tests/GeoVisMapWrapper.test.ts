/**
 * Unit tests for GeoVisMapWrapper pure helpers.
 *
 * The helpers encapsulate the integration logic between geovis events and
 * the Region/Location data model so the React component stays thin. Each
 * helper maps to one of the behaviours that replace the existing Google Maps
 * implementation:
 *
 * - locationForFeatureId  → hover / click → LocationInfo panel
 * - codeFromFeatureId     → click → setLocationCode callback
 * - cameraForDeselection  → clearing selection → map resets to region defaults
 */
import {
  cameraForDeselection,
  cameraForSelection,
  codeFromFeatureId,
  locationForFeatureId,
} from 'src/multimapas/GeoVisMapWrapper.helpers';
import type { Location, MapConfig, Region } from 'src/multimapas/projects';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const mapConfig: MapConfig = {
  center: { lat: -23.5, lng: -46.6 },
  zoom: 10,
  geoJsonUrl: 'https://example.com/geo.geojson',
  geoJsonKey: 'cd_distrito',
};

const region: Region = {
  name: 'Distrito Municipal 2025',
  mapConfig,
  variables: [],
  locations: [
    { code: '35001', name: 'Distrito A' },
    { code: '35002', name: 'Distrito B' },
  ],
};

// ---------------------------------------------------------------------------
// locationForFeatureId
// ---------------------------------------------------------------------------

describe('locationForFeatureId', () => {
  test('returns the Location whose code matches a string featureId', () => {
    const loc = locationForFeatureId('35001', region);
    expect(loc?.name).toBe('Distrito A');
  });

  test('returns undefined when no Location matches the featureId', () => {
    expect(locationForFeatureId('UNKNOWN', region)).toBeUndefined();
  });

  test('coerces a numeric featureId to string before matching', () => {
    // geovis can emit featureId as number when the GeoJSON feature id is numeric
    const loc = locationForFeatureId(35001, region);
    expect(loc?.name).toBe('Distrito A');
  });
});

// ---------------------------------------------------------------------------
// codeFromFeatureId
// ---------------------------------------------------------------------------

describe('codeFromFeatureId', () => {
  test('converts a numeric featureId to a string location code', () => {
    // Ensures the setLocationCode callback always receives a string,
    // even when geovis emits a numeric id (e.g. integer tile feature ids).
    expect(codeFromFeatureId(35001)).toBe('35001');
  });
});

// ---------------------------------------------------------------------------
// cameraForDeselection
// ---------------------------------------------------------------------------

describe('cameraForDeselection', () => {
  test('center is [lng, lat] — not [lat, lng] — matching geovis LngLat convention', () => {
    // mapConfig stores center as { lat, lng }; geovis expects [lng, lat].
    // Wrong order would move the map to the Indian Ocean instead of São Paulo.
    const camera = cameraForDeselection(region);
    expect(camera.center).toEqual([-46.6, -23.5]);
  });
});

// ---------------------------------------------------------------------------
// cameraForSelection
// ---------------------------------------------------------------------------

describe('cameraForSelection', () => {
  test('returns null when location has no center', () => {
    const loc: Location = { code: '35001', name: 'Distrito A' };
    expect(cameraForSelection(loc)).toBeNull();
  });

  test('center is [lng, lat] — not [lat, lng] — matching geovis LngLat convention', () => {
    const loc: Location = {
      code: '35001',
      name: 'Distrito A',
      center: { lat: -23.5, lng: -46.6 },
    };
    const camera = cameraForSelection(loc);
    expect(camera?.center).toEqual([-46.6, -23.5]);
  });

  test('animate is true', () => {
    const loc: Location = {
      code: '35001',
      name: 'Distrito A',
      center: { lat: -23.5, lng: -46.6 },
    };
    const camera = cameraForSelection(loc);
    expect(camera?.animate).toBe(true);
  });
});
