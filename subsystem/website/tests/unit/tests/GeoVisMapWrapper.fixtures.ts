/**
 * Shared fixtures and helpers for GeoVisMapWrapper test suite.
 *
 * Extracted to prevent duplication across sibling test files per the
 * 400-line test file size limit convention.
 */
import type { Region, Variable } from 'src/multimapas/projects';

export const region: Region = {
  name: 'Distrito Municipal 2025',
  mapConfig: {
    center: { lat: -23.5, lng: -46.6 },
    zoom: 10,
    geoJsonUrl: 'https://example.com/geo.geojson',
    geoJsonKey: 'cd_distrito',
  },
  variables: [],
  locations: [
    { code: '35001', name: 'Distrito A' },
    { code: '35002', name: 'Distrito B' },
  ],
};

export const variable: Variable = {
  name: 'Indicador X',
  data: {},
  captions: [],
  polygonsOptions: {},
};

export const variable2: Variable = {
  name: 'Indicador Y',
  data: {},
  captions: [],
  polygonsOptions: {},
};

/**
 * Creates a controllable native map mock with captured event handlers.
 *
 * The returned `moveStartHandlers`, `moveHandlers`, `moveEndHandlers` arrays
 * are populated by `nativeMap.on()` — the same closures that the
 * `GeoVisMapInner` pan/zoom effect registers. Calling `handlers[n]()` in a
 * test simulates the corresponding MapLibre event on map n.
 */
export const makeNativeMapMock = (
  center = { lng: -46.6, lat: -23.5 },
  zoom = 10
) => {
  const moveStartHandlers: Array<() => void> = [];
  const moveHandlers: Array<() => void> = [];
  const moveEndHandlers: Array<() => void> = [];
  const nativeMap = {
    on: jest.fn((event: string, handler: () => void) => {
      if (event === 'movestart') {
        moveStartHandlers.push(handler);
      }
      if (event === 'move') {
        moveHandlers.push(handler);
      }
      if (event === 'moveend') {
        moveEndHandlers.push(handler);
      }
    }),
    off: jest.fn(),
    getCenter: () => {
      return center;
    },
    getZoom: () => {
      return zoom;
    },
    flyTo: jest.fn(),
  };
  const runtime = {
    getAdapter: () => {
      return {
        getNativeInstance: () => {
          return nativeMap;
        },
      };
    },
  };
  return {
    nativeMap,
    runtime,
    moveStartHandlers,
    moveHandlers,
    moveEndHandlers,
  };
};
