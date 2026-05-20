import type { useGeoVis } from '@ttoss/geovis';
import * as React from 'react';

import type { useSyncCamera } from './SyncCameraContext';

/**
 * Minimal interface for the MapLibre map instance returned by
 * `runtime.getAdapter().getNativeInstance()` (typed as `unknown` in geovis).
 */
type NativeMap = {
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  getContainer: () => HTMLElement;
};

type PanZoomRefs = {
  isSyncingRef: React.MutableRefObject<boolean>;
  isUserGestureRef: React.MutableRefObject<boolean>;
  syncedSetViewRef: React.MutableRefObject<
    ReturnType<typeof useGeoVis>['setView'] | null
  >;
  setViewRef: React.MutableRefObject<ReturnType<typeof useGeoVis>['setView']>;
};

/**
 * Registers MapLibre movestart/move/moveend handlers for real-time pan/zoom
 * sync between sibling maps. Extracted from GeoVisMapInner to stay within
 * the max-lines-per-function limit.
 *
 * See the inline comments in the original effect for the full echo-prevention
 * and gesture-detection rationale.
 */
export const usePanZoomSync = (
  runtime: ReturnType<typeof useGeoVis>['runtime'],
  syncCamera: ReturnType<typeof useSyncCamera>,
  refs: PanZoomRefs
) => {
  React.useEffect(() => {
    if (!runtime || !syncCamera) {
      return;
    }
    const nativeMap = runtime
      .getAdapter()
      .getNativeInstance() as NativeMap | null;
    if (!nativeMap) {
      return;
    }
    const { isSyncingRef, isUserGestureRef, syncedSetViewRef, setViewRef } =
      refs;
    const handleMoveStart = () => {
      if (isSyncingRef.current) {
        isSyncingRef.current = false;
        return;
      }
      isUserGestureRef.current = true;
    };
    const handleMove = () => {
      if (!isUserGestureRef.current) {
        return;
      }
      const center: [number, number] = [
        nativeMap.getCenter().lng,
        nativeMap.getCenter().lat,
      ];
      syncCamera.broadcast(
        { center, zoom: nativeMap.getZoom(), animate: false },
        syncedSetViewRef.current ?? setViewRef.current
      );
    };
    const handleMoveEnd = () => {
      isUserGestureRef.current = false;
      isSyncingRef.current = false;
    };
    nativeMap.on('movestart', handleMoveStart);
    nativeMap.on('move', handleMove);
    nativeMap.on('moveend', handleMoveEnd);
    return () => {
      nativeMap.off('movestart', handleMoveStart);
      nativeMap.off('move', handleMove);
      nativeMap.off('moveend', handleMoveEnd);
    };
  }, [runtime, syncCamera, refs]);
};

/**
 * Intercepts wheel events on the MapLibre container before they reach the
 * canvas. When Ctrl is not held, stopPropagation() prevents MapLibre's scroll
 * zoom handler from seeing the event while still allowing the page to scroll
 * (stopPropagation does not call preventDefault).
 *
 * Returns a ref to attach to the hint element. Opacity is driven directly via
 * the DOM ref to avoid React re-renders on every scroll event.
 */
export const useCtrlScrollZoom = (
  runtime: ReturnType<typeof useGeoVis>['runtime']
) => {
  const hintRef = React.useRef<HTMLDivElement | null>(null);
  const dismissTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  React.useEffect(() => {
    if (!runtime) {
      return;
    }
    const nativeMap = runtime
      .getAdapter()
      .getNativeInstance() as NativeMap | null;
    if (!nativeMap) {
      return;
    }
    const container = nativeMap.getContainer();
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        e.stopPropagation();
        if (hintRef.current) {
          hintRef.current.style.opacity = '1';
          if (dismissTimerRef.current !== null) {
            clearTimeout(dismissTimerRef.current);
          }
          dismissTimerRef.current = setTimeout(() => {
            if (hintRef.current) {
              hintRef.current.style.opacity = '0';
            }
          }, 2000);
        }
      }
    };
    container.addEventListener('wheel', handleWheel, { capture: true });
    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true });
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [runtime]);
  return hintRef;
};
