/**
 * @jest-environment jsdom
 *
 * Unit tests for GeoVisMapWrapper component.
 *
 * Strategy: mock the entire `@ttoss/geovis` module so the MapLibre WebGL
 * engine is never instantiated. Hook return values are controlled per-test
 * via `mockReturnValue`, letting us exercise the component's reaction to
 * hover/click events and camera reset logic without a real browser.
 */
import { render, screen } from '@testing-library/react';
import type { MapClickInfo, MapHoverInfo } from '@ttoss/geovis';
import { useGeoVis, useGeoVisClick, useGeoVisHover } from '@ttoss/geovis';
import * as React from 'react';
import { GeoVisMapWrapper } from 'src/multimapas/GeoVisMapWrapper';
import type { Region, Variable } from 'src/multimapas/projects';

// ---------------------------------------------------------------------------
// Module mock — replaces MapLibre/WebGL-dependent code with controllable stubs.
// jest.mock is hoisted above imports by babel-jest, so the mocked exports are
// what every import in this file (and in GeoVisMapWrapper) will receive.
// ---------------------------------------------------------------------------

jest.mock('@ttoss/geovis', () => {
  // require() is used instead of the outer React import because jest.mock
  // factories are hoisted before imports are evaluated.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');

  // Create jest.fn instances upfront so GeoVisHoverTooltip can share the same
  // reference with the exported useGeoVisHover hook.
  const mockUseGeoVisHover = jest.fn(() => {
    return null;
  });
  const mockUseGeoVisClick = jest.fn(() => {
    return null;
  });
  const mockUseGeoVis = jest.fn(() => {
    return { setView: jest.fn(), spec: {} };
  });

  return {
    GeoVisProvider: ({ children }: { children: unknown }) => {
      return children;
    },
    GeoVisCanvas: () => {
      return R.createElement('div', { 'data-testid': 'geovis-canvas' });
    },
    GeoVisLegend: () => {
      return R.createElement('div', { 'data-testid': 'geovis-legend' });
    },
    /**
     * GeoVisHoverTooltip stub: reads the current hover info from the shared
     * mockUseGeoVisHover fn so that tests controlling mockHover also drive
     * what the render prop receives.
     */
    GeoVisHoverTooltip: ({
      render: renderProp,
    }: {
      render: (info: unknown) => React.ReactNode;
    }) => {
      const info = mockUseGeoVisHover();
      return info ? (renderProp(info) as React.ReactElement) : null;
    },
    useGeoVisHover: mockUseGeoVisHover,
    useGeoVisClick: mockUseGeoVisClick,
    useGeoVis: mockUseGeoVis,
  };
});

// Typed references to the mocked hooks (jest.mock replaces them in-place).
const mockHover = useGeoVisHover as jest.Mock;
const mockClick = useGeoVisClick as jest.Mock;
const mockGeoVis = useGeoVis as jest.Mock;

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const region: Region = {
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

const variable: Variable = {
  name: 'Indicador X',
  data: {},
  captions: [],
  polygonsOptions: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GeoVisMapWrapper', () => {
  let setLocationCode: jest.Mock;
  let mockSetView: jest.Mock;

  beforeEach(() => {
    setLocationCode = jest.fn();
    mockSetView = jest.fn();
    mockHover.mockReturnValue(null);
    mockClick.mockReturnValue(null);
    mockGeoVis.mockReturnValue({ setView: mockSetView, spec: {} });
  });

  test('hover: renders hovered location name in the info panel', () => {
    // Arrange — simulate geovis emitting a hover event for feature '35001'
    const hoverInfo: MapHoverInfo = {
      layerId: 'l',
      sourceId: 's',
      featureId: '35001',
      value: 200,
      point: { x: 100, y: 100 },
    };
    mockHover.mockReturnValue(hoverInfo);

    // Act
    render(
      <GeoVisMapWrapper
        region={region}
        variable={variable}
        setLocationCode={setLocationCode}
      />
    );

    // Assert — the location name must be visible somewhere in the DOM
    expect(screen.getByText('Distrito A')).toBeInTheDocument();
  });

  test('click: calls setLocationCode with the string featureId when a feature is clicked', () => {
    // Arrange — simulate geovis emitting a click event for feature '35002'
    const clickInfo: MapClickInfo = {
      layerId: 'l',
      sourceId: 's',
      featureId: '35002',
      value: 600,
      lngLat: [-46.6, -23.5],
      point: { x: 50, y: 50 },
    };
    mockClick.mockReturnValue(clickInfo);

    // Act
    render(
      <GeoVisMapWrapper
        region={region}
        variable={variable}
        setLocationCode={setLocationCode}
      />
    );

    // Assert — parent must receive the code as a string (not a number)
    expect(setLocationCode).toHaveBeenCalledWith('35002');
  });

  test('camera reset: calls setView with [lng, lat] center when selectedLocationCode is empty', () => {
    // Rationale: MapConfig.center is { lat, lng } but geovis LngLat is [lng, lat].
    // A wrong order would move the camera to the Indian Ocean instead of São Paulo.
    render(
      <GeoVisMapWrapper
        region={region}
        variable={variable}
        selectedLocationCode=""
        setLocationCode={setLocationCode}
      />
    );

    expect(mockSetView).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-46.6, -23.5] })
    );
  });
});
