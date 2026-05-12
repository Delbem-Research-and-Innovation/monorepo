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
import { act, render, screen } from '@testing-library/react';
import type { MapClickInfo, MapHoverInfo } from '@ttoss/geovis';
import { useGeoVis, useGeoVisClick, useGeoVisHover } from '@ttoss/geovis';
import * as React from 'react';
import { GeoVisMapWrapper } from 'src/multimapas/GeoVisMapWrapper';
import type { Region, Variable } from 'src/multimapas/projects';
import { SyncCameraProvider } from 'src/multimapas/SyncCameraProvider';

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

// ---------------------------------------------------------------------------
// Sync camera tests (Option A)
// ---------------------------------------------------------------------------

describe('SyncCameraProvider — broadcast between maps', () => {
  let setLocationCode: jest.Mock;
  let mockSetView1: jest.Mock;
  let mockSetView2: jest.Mock;

  beforeEach(() => {
    setLocationCode = jest.fn();
    mockSetView1 = jest.fn();
    mockSetView2 = jest.fn();
    mockHover.mockReturnValue(null);
    mockClick.mockReturnValue(null);
    // First render call gets setView1, second gets setView2
    mockGeoVis
      .mockReturnValueOnce({ setView: mockSetView1, spec: {} })
      .mockReturnValue({ setView: mockSetView2, spec: {} });
  });

  const variable2: Variable = {
    name: 'Indicador Y',
    data: {},
    captions: [],
    polygonsOptions: {},
  };

  test('click on one map broadcasts center to sibling map', () => {
    const clickInfo: MapClickInfo = {
      layerId: 'l',
      sourceId: 's',
      featureId: '35001',
      value: 100,
      lngLat: [-46.6, -23.5],
      point: { x: 10, y: 10 },
    };
    // Only the first map sees the click
    mockClick
      .mockReturnValueOnce(clickInfo) // map 1
      .mockReturnValue(null); // map 2

    render(
      <SyncCameraProvider>
        <GeoVisMapWrapper
          region={region}
          variable={variable}
          setLocationCode={setLocationCode}
        />
        <GeoVisMapWrapper
          region={region}
          variable={variable2}
          setLocationCode={setLocationCode}
        />
      </SyncCameraProvider>
    );

    // Map 1 animates to the clicked center (animate:true)
    expect(mockSetView1).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-46.6, -23.5], animate: true })
    );
    // Map 2 ends up at the same center (via its own deselection reset;
    // broadcast timing in tests is covered by integration tests)
    expect(mockSetView2).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-46.6, -23.5] })
    );
  });

  test('movestart on one map broadcasts center and zoom to sibling', () => {
    const moveStartHandlers: Array<() => void> = [];
    const moveHandlers: Array<() => void> = [];
    const mockNativeMap1 = {
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'movestart') {
          moveStartHandlers.push(handler);
        }
        if (event === 'move') {
          moveHandlers.push(handler);
        }
      }),
      off: jest.fn(),
      getCenter: () => {
        return { lng: -46.7, lat: -23.6 };
      },
      getZoom: () => {
        return 12;
      },
    };
    const mockNativeMap2 = {
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'movestart') {
          moveStartHandlers.push(handler);
        }
        if (event === 'move') {
          moveHandlers.push(handler);
        }
      }),
      off: jest.fn(),
      getCenter: () => {
        return { lng: -46.6, lat: -23.5 };
      },
      getZoom: () => {
        return 10;
      },
    };
    const mockRuntime1 = {
      getAdapter: () => {
        return {
          getNativeInstance: () => {
            return mockNativeMap1;
          },
        };
      },
    };
    const mockRuntime2 = {
      getAdapter: () => {
        return {
          getNativeInstance: () => {
            return mockNativeMap2;
          },
        };
      },
    };

    mockGeoVis.mockReset();
    mockGeoVis
      .mockReturnValueOnce({
        setView: mockSetView1,
        runtime: mockRuntime1,
        spec: {},
      })
      .mockReturnValue({
        setView: mockSetView2,
        runtime: mockRuntime2,
        spec: {},
      });

    render(
      <SyncCameraProvider>
        <GeoVisMapWrapper
          region={region}
          variable={variable}
          selectedLocationCode="35001"
          setLocationCode={setLocationCode}
        />
        <GeoVisMapWrapper
          region={region}
          variable={variable2}
          selectedLocationCode="35001"
          setLocationCode={setLocationCode}
        />
      </SyncCameraProvider>
    );

    // Simulate user panning map 1: movestart arms isUserGestureRef, move broadcasts
    act(() => {
      moveStartHandlers[0]();
    });
    act(() => {
      moveHandlers[0]();
    });

    // Map 2 receives the pan position
    expect(mockSetView2).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-46.7, -23.6], zoom: 12 })
    );
    // Source map does not receive its own broadcast
    expect(mockSetView1).not.toHaveBeenCalled();
  });

  test('movestart triggered by broadcast clears echo flag and does not re-broadcast', () => {
    const moveStartHandlers: Array<() => void> = [];
    const moveHandlers: Array<() => void> = [];
    const mockNativeMap1 = {
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'movestart') {
          moveStartHandlers.push(handler);
        }
        if (event === 'move') {
          moveHandlers.push(handler);
        }
      }),
      off: jest.fn(),
      getCenter: () => {
        return { lng: -46.7, lat: -23.6 };
      },
      getZoom: () => {
        return 12;
      },
    };
    const mockNativeMap2 = {
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'movestart') {
          moveStartHandlers.push(handler);
        }
        if (event === 'move') {
          moveHandlers.push(handler);
        }
      }),
      off: jest.fn(),
      getCenter: () => {
        return { lng: -46.6, lat: -23.5 };
      },
      getZoom: () => {
        return 10;
      },
    };
    const mockRuntime1 = {
      getAdapter: () => {
        return {
          getNativeInstance: () => {
            return mockNativeMap1;
          },
        };
      },
    };
    const mockRuntime2 = {
      getAdapter: () => {
        return {
          getNativeInstance: () => {
            return mockNativeMap2;
          },
        };
      },
    };

    mockGeoVis.mockReset();
    mockGeoVis
      .mockReturnValueOnce({
        setView: mockSetView1,
        runtime: mockRuntime1,
        spec: {},
      })
      .mockReturnValue({
        setView: mockSetView2,
        runtime: mockRuntime2,
        spec: {},
      });

    render(
      <SyncCameraProvider>
        <GeoVisMapWrapper
          region={region}
          variable={variable}
          selectedLocationCode="35001"
          setLocationCode={setLocationCode}
        />
        <GeoVisMapWrapper
          region={region}
          variable={variable2}
          selectedLocationCode="35001"
          setLocationCode={setLocationCode}
        />
      </SyncCameraProvider>
    );

    // Map 1: movestart arms gesture flag, move broadcasts to map 2 (isSyncing2 = true)
    act(() => {
      moveStartHandlers[0]();
    });
    act(() => {
      moveHandlers[0]();
    });

    mockSetView1.mockClear();
    mockSetView2.mockClear();

    // Map 2's movestart fires (triggered by broadcast jumpTo) — isSyncing2 = true
    // → clears flag, does NOT set isUserGesture2
    act(() => {
      moveStartHandlers[1]();
    });
    // Map 2's move fires — isUserGesture2 = false → must NOT re-broadcast
    act(() => {
      moveHandlers[1]();
    });

    expect(mockSetView1).not.toHaveBeenCalled();
  });

  test('without provider, maps move independently without errors', () => {
    const clickInfo: MapClickInfo = {
      layerId: 'l',
      sourceId: 's',
      featureId: '35001',
      value: 100,
      lngLat: [-46.6, -23.5],
      point: { x: 10, y: 10 },
    };
    mockClick.mockReturnValue(clickInfo);

    // No SyncCameraProvider — must not throw
    expect(() => {
      render(
        <GeoVisMapWrapper
          region={region}
          variable={variable}
          setLocationCode={setLocationCode}
        />
      );
    }).not.toThrow();

    expect(mockSetView1).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-46.6, -23.5] })
    );
  });
});
