/**
 * @jest-environment jsdom
 *
 * Tests for individual and composite interactions of GeoVisMapWrapper.
 * Extracted from GeoVisMapWrapper.component.test.tsx to stay under
 * the 400-line test file size limit.
 *
 * Individual (1): pan/zoom handler registration and broadcast.
 * Individual (2): click-to-center animation.
 * Composite (2+1): click animation swallowed; subsequent pan broadcasts.
 * Composite (2+4): click centers source map; pan then broadcasts to sibling.
 */
import { act, render } from '@testing-library/react';
import type { MapClickInfo } from '@ttoss/geovis';
import { useGeoVis, useGeoVisClick, useGeoVisHover } from '@ttoss/geovis';
import type * as React from 'react';
import { GeoVisMapWrapper } from 'src/multimapas/GeoVisMapWrapper';
import { SyncCameraProvider } from 'src/multimapas/SyncCameraProvider';

import {
  makeNativeMapMock,
  region,
  variable,
  variable2,
} from './GeoVisMapWrapper.fixtures';

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
// Individual interactions (1, 2 — isolated, single map unless noted)
//
// Hover (3) is covered in GeoVisMapWrapper.component.test.tsx.
// Pan/zoom broadcast (4) is covered in GeoVisMapWrapper.sync-camera.test.tsx.
// ---------------------------------------------------------------------------

describe('Individual interactions', () => {
  let setLocationCode: jest.Mock;
  let mockSetView: jest.Mock;

  beforeEach(() => {
    setLocationCode = jest.fn();
    mockSetView = jest.fn();
    mockHover.mockReturnValue(null);
    mockClick.mockReturnValue(null);
    mockGeoVis.mockReturnValue({ setView: mockSetView, spec: {} });
  });

  // (1) Pan and zoom -------------------------------------------------------

  test('pan/zoom: registers movestart, move and moveend handlers on mount', () => {
    // Arrange — runtime needed so the pan/zoom effect can attach handlers
    const { nativeMap, runtime } = makeNativeMapMock();
    mockGeoVis.mockReturnValue({ setView: mockSetView, runtime, spec: {} });

    render(
      <SyncCameraProvider>
        <GeoVisMapWrapper
          region={region}
          variable={variable}
          setLocationCode={setLocationCode}
        />
      </SyncCameraProvider>
    );

    // Assert — all three MapLibre events are registered
    const registeredEvents = (nativeMap.on as jest.Mock).mock.calls.map(
      ([event]: [string]) => {
        return event;
      }
    );
    expect(registeredEvents).toContain('movestart');
    expect(registeredEvents).toContain('move');
    expect(registeredEvents).toContain('moveend');
  });

  test('pan/zoom: user move broadcasts camera; isSyncingRef prevents echo on next movestart', () => {
    // Arrange
    const MAP_CENTER = { lng: -46.7, lat: -23.6 };
    const {
      runtime,
      moveStartHandlers: msh,
      moveHandlers: mh,
    } = makeNativeMapMock(MAP_CENTER, 12);
    const mockSetView2 = jest.fn();
    mockGeoVis
      .mockReturnValueOnce({ setView: mockSetView, runtime, spec: {} })
      .mockReturnValue({ setView: mockSetView2, spec: {} });

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

    mockSetView2.mockClear();

    // User drags map 1
    act(() => {
      msh[0]();
    }); // arms isUserGestureRef
    act(() => {
      mh[0]();
    }); // broadcasts to map 2

    expect(mockSetView2).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [MAP_CENTER.lng, MAP_CENTER.lat],
        zoom: 12,
        animate: false,
      })
    );
  });

  // (2) Click to center ----------------------------------------------------

  test('click: calls setLocationCode AND setView with the clicked lngLat (animate:true)', () => {
    const clickInfo: MapClickInfo = {
      layerId: 'l',
      sourceId: 's',
      featureId: '35001',
      value: 100,
      lngLat: [-46.7, -23.6],
      point: { x: 10, y: 10 },
    };
    mockClick.mockReturnValue(clickInfo);

    render(
      <GeoVisMapWrapper
        region={region}
        variable={variable}
        setLocationCode={setLocationCode}
      />
    );

    // Both side effects of the click must fire
    expect(setLocationCode).toHaveBeenCalledWith('35001');
    expect(mockSetView).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-46.7, -23.6], animate: true })
    );
  });
});

// ---------------------------------------------------------------------------
// Composite interactions
// ---------------------------------------------------------------------------

describe('Composite interactions', () => {
  let setLocationCode: jest.Mock;
  let mockSetView1: jest.Mock;
  let mockSetView2: jest.Mock;

  beforeEach(() => {
    setLocationCode = jest.fn();
    mockSetView1 = jest.fn();
    mockSetView2 = jest.fn();
    mockHover.mockReturnValue(null);
    mockClick.mockReturnValue(null);
    mockGeoVis.mockReset();
  });

  /**
   * Composite 2+1: click to center (2) followed by user pan/zoom (1) on the
   * same source map.
   *
   * After a click, the component sets isSyncingRef=true before calling
   * setView so that the movestart from the resulting flyTo animation is
   * swallowed (does not arm isUserGestureRef). Only after moveend resets the
   * refs does a fresh user-initiated movestart correctly broadcast the pan.
   */
  test('2+1: click animation is swallowed by movestart; subsequent user pan broadcasts', () => {
    const MAP1_CENTER = { lng: -46.7, lat: -23.6 };
    const {
      runtime: rt1,
      moveStartHandlers: msh1,
      moveHandlers: mh1,
      moveEndHandlers: meh1,
    } = makeNativeMapMock(MAP1_CENTER, 12);
    const { runtime: rt2 } = makeNativeMapMock();

    const clickInfo: MapClickInfo = {
      layerId: 'l',
      sourceId: 's',
      featureId: '35001',
      value: 100,
      lngLat: [MAP1_CENTER.lng, MAP1_CENTER.lat],
      point: { x: 10, y: 10 },
    };
    mockClick
      .mockReturnValueOnce(clickInfo) // map 1 sees the click
      .mockReturnValue(null); // map 2 does not
    mockGeoVis
      .mockReturnValueOnce({ setView: mockSetView1, runtime: rt1, spec: {} })
      .mockReturnValue({ setView: mockSetView2, runtime: rt2, spec: {} });

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

    mockSetView2.mockClear();

    // Phase 1 — click flyTo starts: isSyncingRef=true from click effect
    // movestart consumes isSyncingRef without arming isUserGestureRef
    act(() => {
      msh1[0]();
    });
    act(() => {
      mh1[0]();
    }); // isUserGestureRef=false → no broadcast
    expect(mockSetView2).not.toHaveBeenCalled();

    act(() => {
      meh1[0]();
    }); // flyTo ends → both refs cleared

    // Phase 2 — user pan: fresh movestart arms isUserGestureRef, move broadcasts
    act(() => {
      msh1[0]();
    });
    act(() => {
      mh1[0]();
    });
    expect(mockSetView2).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [MAP1_CENTER.lng, MAP1_CENTER.lat],
        zoom: 12,
        animate: false,
      })
    );
  });

  /**
   * Composite 2+4: click to center (2) followed by pan/zoom broadcast (4)
   * across two sibling maps.
   *
   * The click sets the camera on the source map. After the animation settles
   * (moveend), a user pan on the source map broadcasts the camera position to
   * the sibling with animate:false so it tracks in real-time.
   */
  test('2+4: click centers source map; subsequent user pan broadcasts to sibling', () => {
    const MAP1_CENTER = { lng: -46.7, lat: -23.6 };
    const {
      runtime: rt1,
      moveStartHandlers: msh1,
      moveHandlers: mh1,
      moveEndHandlers: meh1,
    } = makeNativeMapMock(MAP1_CENTER, 12);
    const { runtime: rt2 } = makeNativeMapMock();

    const clickInfo: MapClickInfo = {
      layerId: 'l',
      sourceId: 's',
      featureId: '35001',
      value: 100,
      lngLat: [MAP1_CENTER.lng, MAP1_CENTER.lat],
      point: { x: 10, y: 10 },
    };
    mockClick.mockReturnValueOnce(clickInfo).mockReturnValue(null);
    mockGeoVis
      .mockReturnValueOnce({ setView: mockSetView1, runtime: rt1, spec: {} })
      .mockReturnValue({ setView: mockSetView2, runtime: rt2, spec: {} });

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

    // (2) Click: source map setView called with clicked center
    expect(mockSetView1).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [MAP1_CENTER.lng, MAP1_CENTER.lat],
        animate: true,
      })
    );

    mockSetView2.mockClear();

    // Click animation swallowed by first movestart; moveend resets refs
    act(() => {
      msh1[0]();
    });
    act(() => {
      meh1[0]();
    });

    // (4) User pan: broadcasts to sibling with animate:false
    act(() => {
      msh1[0]();
    });
    act(() => {
      mh1[0]();
    });
    expect(mockSetView2).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [MAP1_CENTER.lng, MAP1_CENTER.lat],
        zoom: 12,
        animate: false,
      })
    );
  });
});
