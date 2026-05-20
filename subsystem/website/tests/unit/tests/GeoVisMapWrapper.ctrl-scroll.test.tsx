/**
 * @jest-environment jsdom
 *
 * Tests for the `useCtrlScrollZoom` behaviour in GeoVisMapWrapper.
 *
 * 1. Wheel without Ctrl stops propagation to the parent; wheel with Ctrl lets
 *    the event through so MapLibre handles zoom normally.
 * 2. The hint overlay ("Use Ctrl + scroll para ampliar") appears when the user
 *    scrolls without Ctrl, is scoped to the scrolled map only, and
 *    auto-dismisses after 2000 ms.
 * 3. Composite: a click-select centres the map; a subsequent Ctrl+scroll zoom
 *    is not blocked by useCtrlScrollZoom.
 */
import { act, render, screen } from '@testing-library/react';
import type { MapClickInfo } from '@ttoss/geovis';
import { useGeoVis, useGeoVisClick, useGeoVisHover } from '@ttoss/geovis';
import type * as React from 'react';
import { GeoVisMapWrapper } from 'src/multimapas/GeoVisMapWrapper';
import { SyncCameraProvider } from 'src/multimapas/react/SyncCameraProvider';

import {
  makeNativeMapMock,
  region,
  variable,
  variable2,
} from './GeoVisMapWrapper.fixtures';

// ---------------------------------------------------------------------------
// Module mock — same pattern used across all GeoVisMapWrapper test files.
// ---------------------------------------------------------------------------

jest.mock('@ttoss/geovis', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');

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
    GeoVisHoverTooltip: ({
      render: r,
    }: {
      render: (info: unknown) => React.ReactNode;
    }) => {
      const info = mockUseGeoVisHover();
      return info ? (r(info) as React.ReactElement) : null;
    },
    GeoVisLegend: () => {
      return R.createElement('div', { 'data-testid': 'geovis-legend' });
    },
    useGeoVisHover: mockUseGeoVisHover,
    useGeoVisClick: mockUseGeoVisClick,
    useGeoVis: mockUseGeoVis,
  };
});

const mockHover = useGeoVisHover as jest.Mock;
const mockClick = useGeoVisClick as jest.Mock;
const mockGeoVis = useGeoVis as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dispatches a WheelEvent on `target` and wraps in act(). */
const dispatchWheel = (target: HTMLElement, ctrlKey: boolean) => {
  act(() => {
    target.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ctrlKey }));
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCtrlScrollZoom', () => {
  let mockSetView: jest.Mock;

  beforeEach(() => {
    mockSetView = jest.fn();
    mockHover.mockReturnValue(null);
    mockClick.mockReturnValue(null);
    mockGeoVis.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // (1) Propagation ----------------------------------------------------------

  test('wheel without Ctrl stops propagation; wheel with Ctrl propagates', () => {
    const { runtime, container } = makeNativeMapMock();
    mockGeoVis.mockReturnValue({ setView: mockSetView, runtime, spec: {} });

    // Attach container to a parent so propagation can be observed.
    const parent = document.createElement('div');
    parent.appendChild(container);

    render(
      <GeoVisMapWrapper
        region={region}
        variable={variable}
        setLocationCode={jest.fn()}
      />
    );

    const parentHandler = jest.fn();
    parent.addEventListener('wheel', parentHandler);

    // Without Ctrl: useCtrlScrollZoom calls stopPropagation → parent is silent.
    dispatchWheel(container, false);
    expect(parentHandler).not.toHaveBeenCalled();

    // With Ctrl: event propagates normally → parent listener fires.
    dispatchWheel(container, true);
    expect(parentHandler).toHaveBeenCalledTimes(1);
  });

  // (2a) Hint timing ---------------------------------------------------------

  test('hint appears on scroll without Ctrl and auto-dismisses after 2000 ms', () => {
    jest.useFakeTimers();
    const { runtime, container } = makeNativeMapMock();
    mockGeoVis.mockReturnValue({ setView: mockSetView, runtime, spec: {} });

    render(
      <GeoVisMapWrapper
        region={region}
        variable={variable}
        setLocationCode={jest.fn()}
      />
    );

    const hintOverlay = screen
      .getByText('Use Ctrl + scroll para ampliar')
      .closest('[aria-hidden="true"]') as HTMLElement;

    // Initially no inline opacity override (CSS class provides opacity:0).
    expect(hintOverlay.style.opacity).toBe('');

    dispatchWheel(container, false);
    expect(hintOverlay.style.opacity).toBe('1');

    // Still visible just before the dismiss timeout.
    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(hintOverlay.style.opacity).toBe('1');

    // Hidden exactly at the dismiss timeout.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(hintOverlay.style.opacity).toBe('0');
  });

  // (2b) Hint scope ----------------------------------------------------------

  test('hint appears only for the scrolled map, not for its sibling', () => {
    jest.useFakeTimers();
    const { runtime: rt1, container: c1 } = makeNativeMapMock();
    const { runtime: rt2 } = makeNativeMapMock();
    mockGeoVis
      .mockReturnValueOnce({ setView: jest.fn(), runtime: rt1, spec: {} })
      .mockReturnValue({ setView: jest.fn(), runtime: rt2, spec: {} });

    render(
      <SyncCameraProvider>
        <GeoVisMapWrapper
          region={region}
          variable={variable}
          setLocationCode={jest.fn()}
        />
        <GeoVisMapWrapper
          region={region}
          variable={variable2}
          setLocationCode={jest.fn()}
        />
      </SyncCameraProvider>
    );

    const hints = screen
      .getAllByText('Use Ctrl + scroll para ampliar')
      .map((el) => {
        return el.closest('[aria-hidden="true"]') as HTMLElement;
      });

    // Scroll only on the first map's container.
    dispatchWheel(c1, false);

    expect(hints[0].style.opacity).toBe('1');
    // Sibling hint must remain untouched.
    expect(hints[1].style.opacity).toBe('');
  });

  // (3) Composite: click-select → Ctrl+scroll --------------------------------

  test('3 (composite): after click-select centres map, Ctrl+scroll zoom is unblocked', () => {
    const clickInfo: MapClickInfo = {
      layerId: 'l',
      sourceId: 's',
      featureId: '35001',
      value: 100,
      lngLat: [-46.7, -23.6],
      point: { x: 10, y: 10 },
    };
    mockClick.mockReturnValue(clickInfo);

    const { runtime, container } = makeNativeMapMock();
    mockGeoVis.mockReturnValue({ setView: mockSetView, runtime, spec: {} });

    const parent = document.createElement('div');
    parent.appendChild(container);

    render(
      <GeoVisMapWrapper
        region={region}
        variable={variable}
        setLocationCode={jest.fn()}
      />
    );

    // Click effect must have centred the map on the clicked lngLat.
    expect(mockSetView).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-46.7, -23.6], animate: true })
    );

    const parentHandler = jest.fn();
    parent.addEventListener('wheel', parentHandler);

    // Ctrl+scroll after selection: must not be blocked.
    dispatchWheel(container, true);
    expect(parentHandler).toHaveBeenCalledTimes(1);

    // Hint must not have appeared (Ctrl was held).
    const hintOverlay = screen
      .getByText('Use Ctrl + scroll para ampliar')
      .closest('[aria-hidden="true"]') as HTMLElement;
    expect(hintOverlay.style.opacity).not.toBe('1');
  });
});
