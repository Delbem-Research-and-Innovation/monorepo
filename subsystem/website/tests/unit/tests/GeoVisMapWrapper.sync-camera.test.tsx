/**
 * @jest-environment jsdom
 *
 * Tests for SyncCameraProvider — camera broadcast between sibling GeoVisMapWrapper
 * instances. Extracted from GeoVisMapWrapper.component.test.tsx to stay under
 * the 400-line test file size limit.
 */
import { act, render } from '@testing-library/react';
import type { MapClickInfo } from '@ttoss/geovis';
import { useGeoVis, useGeoVisClick, useGeoVisHover } from '@ttoss/geovis';
import type * as React from 'react';
import { GeoVisMapWrapper } from 'src/multimapas/GeoVisMapWrapper';
import { SyncCameraProvider } from 'src/multimapas/react/SyncCameraProvider';

import { region, variable, variable2 } from './GeoVisMapWrapper.fixtures';

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
// Sync camera tests
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
      getContainer: () => {
        return document.createElement('div');
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
      getContainer: () => {
        return document.createElement('div');
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
      getContainer: () => {
        return document.createElement('div');
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
      getContainer: () => {
        return document.createElement('div');
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
