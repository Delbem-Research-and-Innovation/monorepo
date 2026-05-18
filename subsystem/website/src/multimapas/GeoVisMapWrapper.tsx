import type { GeoJSONObject, MapHoverInfo } from '@ttoss/geovis';
import {
  GeoVisCanvas,
  GeoVisHoverTooltip,
  GeoVisProvider,
  useGeoVis,
  useGeoVisClick,
} from '@ttoss/geovis';
import { Box, Flex, Text } from '@ttoss/ui';
import * as React from 'react';

import {
  cameraForDeselection,
  cameraForSelection,
  codeFromFeatureId,
  locationForFeatureId,
} from './GeoVisMapWrapper.helpers';
import type { Region, Variable } from './projects';
import { useSyncCamera } from './SyncCameraContext';
import { toGeoVisSpec } from './toGeoVisSpec';

/**
 * Falls back to useEffect on the server (where useLayoutEffect is a no-op and
 * emits an SSR warning) while preserving synchronous DOM-mutation semantics in
 * the browser. Required for any layout effect that runs during SSG/SSR.
 */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/**
 * Minimal interface for the MapLibre map instance returned by
 * `runtime.getAdapter().getNativeInstance()` (typed as `unknown` in geovis).
 */
type NativeMap = {
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
};

/**
 * Render prop for GeoVisHoverTooltip.
 * Defined at module scope so the function reference is stable across renders
 * (no new identity per render = no spurious tooltip re-mounts).
 *
 * Display value mirrors the production `LocationInfo` logic:
 * - categorical variables: show `caption.name` (the category label)
 * - numerical variables:   show `caption.value` (the Jenks threshold that
 *   identifies the bucket the feature belongs to)
 *
 * `caption` is resolved from `variable.polygonsOptions[featureId].caption`,
 * which is computed at build time by `polygons.ts` and already carried in the
 * page props — no additional computation needed on the client.
 */
const renderHoverTooltip = (region: Region, variable: Variable) => {
  const tooltipRenderer = (info: MapHoverInfo): React.ReactNode => {
    const location = locationForFeatureId(info.featureId, region);
    const name = location?.name ?? `#${String(info.featureId)}`;

    const caption = variable.polygonsOptions[String(info.featureId)]?.caption;
    const displayValue = caption
      ? caption.dataType === 'categorical'
        ? caption.name
        : caption.value
      : null;

    return (
      <div
        style={{
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          minWidth: 120,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
        {displayValue != null && (
          <div style={{ color: '#ffffff' }}>
            {typeof displayValue === 'number'
              ? displayValue.toLocaleString('pt-BR')
              : String(displayValue)}
          </div>
        )}
      </div>
    );
  };
  return tooltipRenderer;
};

export type GeoVisMapWrapperProps = {
  region: Region;
  variable: Variable;
  selectedLocationCode?: string;
  setLocationCode: (locationCode: string) => void;
  /** Pre-fetched GeoJSON data. When provided, passed inline to the spec so
   * MapLibre does not fetch the GeoJSON URL client-side. */
  geoJsonData?: GeoJSONObject;
};

/**
 * Renders the pre-computed Jenks legend (captions) produced by polygons.ts.
 * Each caption holds the exact label string and fill colour calculated at
 * build time, so the legend stays in sync with the choropleth without any
 * client-side reformatting.
 */
const CaptionLegend = ({ captions }: { captions: Variable['captions'] }) => {
  if (captions.length === 0) {
    return null;
  }
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: '6px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {captions.map((caption) => {
        return (
          <li
            key={caption.name}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 2,
                background: caption.fillColor,
                flexShrink: 0,
                border: '1px solid rgba(0,0,0,0.15)',
              }}
            />
            <span style={{ fontSize: 11 }}>{caption.name}</span>
          </li>
        );
      })}
    </ul>
  );
};

export const MapLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <Text
      as="div"
      sx={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        bg: 'display.background.primary.default',
        borderRadius: 'md',
        padding: '4px 10px',
        // fontSize: '1rem',
        fontFamily: 'body',
        fontWeight: 'semibold',
        color: 'display.text.primary.default',
        zIndex: 1,
        pointerEvents: 'none',
        opacity: 0.9,
      }}
    >
      {children}
    </Text>
  );
};

/**
 * Inner component rendered inside GeoVisProvider so it can consume geovis
 * hooks (useGeoVisHover, useGeoVisClick, useGeoVis). The outer
 * GeoVisMapWrapper computes the spec and wraps this component in the provider.
 */
const GeoVisMapInner = ({
  region,
  variable,
  selectedLocationCode,
  setLocationCode,
}: GeoVisMapWrapperProps) => {
  const clickInfo = useGeoVisClick();
  const { setView, runtime } = useGeoVis();
  const syncCamera = useSyncCamera();

  const isSyncingRef = React.useRef(false);
  const syncedSetViewRef = React.useRef<typeof setView | null>(null);
  const isUserGestureRef = React.useRef(false);

  /**
   * Refs that always hold the latest prop/hook values without adding those
   * values as effect dependencies. Assigning unconditionally on every render
   * is safe (no loop risk) and ensures closures inside effects always call
   * the current function rather than a stale captured copy.
   *
   * - setLocationCodeRef: prevents the click effect from re-running (and
   *   re-broadcasting) every time the parent re-creates setLocationCode after
   *   state updates triggered by the previous click.
   * - setViewRef: prevents the pan/zoom effect from removing and re-adding
   *   MapLibre event handlers whenever setView changes identity, eliminating
   *   the handler-registration gap that could drop a movestart event and
   *   leave isSyncingRef permanently stuck as true.
   */
  const setLocationCodeRef = React.useRef(setLocationCode);
  const setViewRef = React.useRef(setView);
  useIsomorphicLayoutEffect(() => {
    setLocationCodeRef.current = setLocationCode;
    setViewRef.current = setView;
  });

  /**
   * Register a wrapped setView so incoming broadcasts:
   *   1. Set isSyncingRef before applying the camera — the resulting movestart
   *      clears this flag instead of arming isUserGestureRef, preventing the
   *      move handler from re-broadcasting (echo loop).
   *   2. Clear isUserGestureRef — if this map was mid-gesture when the
   *      broadcast arrived, the move handler must stop re-broadcasting
   *      immediately so it does not interrupt the incoming flyTo with a
   *      conflicting jumpTo.
   */
  React.useEffect(() => {
    if (!syncCamera) {
      return;
    }
    const syncedSetView: typeof setView = (options) => {
      isUserGestureRef.current = false;
      isSyncingRef.current = true;
      setView(options);
    };
    syncedSetViewRef.current = syncedSetView;
    return syncCamera.register(syncedSetView);
  }, [syncCamera, setView]);

  /**
   * Propagate click events to the parent via setLocationCode.
   * codeFromFeatureId coerces numeric featureIds to string (geovis can emit
   * either type depending on the GeoJSON source feature ids).
   *
   * Camera movement: when the clicked location has a precomputed centroid
   * (`location.center`), centering is intentionally deferred to the selection
   * effect. That effect fires on the next render for ALL maps (source and
   * siblings) via the shared `selectedLocationCode` prop, producing
   * a single synchronised flyTo without needing a broadcast here.
   *
   * Fallback: when no centroid is available (network failure at build time,
   * no GeoJSON configured), the click effect falls back to centering on the
   * exact click point and broadcasting to siblings. The selection effect is
   * a no-op in this case (cameraForSelection returns null).
   *
   * isUserGestureRef is cleared first: if the user was mid-pan when they
   * clicked, the move handler must not continue re-broadcasting animate:false
   * to siblings while their flyTo animations are in flight — that would
   * interrupt the animations with an immediate jumpTo.
   *
   * setLocationCode is called via ref (not listed in deps) so that a new
   * setLocationCode identity from the parent — created after the state update
   * triggered by this very call — does not cause the effect to re-run with
   * the same clickInfo and double-execute the click logic.
   */
  React.useEffect(() => {
    if (clickInfo) {
      isUserGestureRef.current = false;
      const code = codeFromFeatureId(clickInfo.featureId);
      setLocationCodeRef.current(code);

      // Only use the click point when no centroid is available.
      // When location.center exists, the selection effect handles all maps.
      const location = locationForFeatureId(code, region);
      if (!location?.center) {
        isSyncingRef.current = true;
        setView({ center: clickInfo.lngLat, animate: true });
        syncCamera?.broadcast(
          { center: clickInfo.lngLat, animate: true },
          syncedSetViewRef.current ?? setView
        );
      }
    }
  }, [clickInfo, setView, syncCamera, region]);

  /**
   * Reset the camera to region defaults when the selection is cleared.
   * cameraForDeselection swaps lat/lng → [lng, lat] as required by geovis.
   * Broadcast the reset to all sibling maps.
   *
   * isUserGestureRef is cleared for the same reason as in the click effect:
   * an ongoing gesture must not re-broadcast jumpTo frames on top of the
   * reset flyTo.
   */
  React.useEffect(() => {
    if (!selectedLocationCode) {
      isUserGestureRef.current = false;
      const cameraOptions = cameraForDeselection(region);
      isSyncingRef.current = true;
      setView(cameraOptions);
      syncCamera?.broadcast(cameraOptions, syncedSetViewRef.current ?? setView);
    }
  }, [selectedLocationCode, region, setView, syncCamera]);

  /**
   * Center the map when a location is programmatically selected (e.g. via the
   * location select dropdown or external state). Only fires when the location
   * has a `center` field; otherwise the camera is left unchanged.
   *
   * No broadcast: every sibling map receives the same `selectedLocationCode`
   * prop and will independently apply this effect, so broadcasting would
   * cause redundant setView calls on already-moving maps.
   */
  React.useEffect(() => {
    if (!selectedLocationCode) {
      return;
    }
    const location = locationForFeatureId(selectedLocationCode, region);
    if (!location) {
      return;
    }
    const cameraOptions = cameraForSelection(location);
    if (!cameraOptions) {
      return;
    }
    isUserGestureRef.current = false;
    isSyncingRef.current = true;
    setView(cameraOptions);
  }, [selectedLocationCode, region, setView]);

  const hoverRenderer = React.useMemo(() => {
    return renderHoverTooltip(region, variable);
  }, [region, variable]);

  /**
   * Real-time pan/zoom sync via native MapLibre events.
   *
   * `movestart` — distinguishes user gestures from broadcast-triggered moves:
   *   if isSyncingRef is set (incoming broadcast), clears the flag and exits;
   *   otherwise marks isUserGestureRef so the `move` handler knows to broadcast.
   *
   * `move` — fires every animation frame during drag or flyTo;
   *   broadcasts current camera to siblings only when the user is the source
   *   (isUserGestureRef = true). Siblings receive animate:false so they track
   *   in real-time without their own flyTo delay.
   *
   * `moveend` — clears isUserGestureRef when the gesture or animation ends.
   *   Also clears isSyncingRef as a safety net: if movestart was missed (race
   *   between effect registration and MapLibre initialisation), the stuck flag
   *   is guaranteed to be cleared by the time the map stops moving.
   *
   * Echo prevention: broadcast → syncedSetView → isSyncingRef=true →
   *   sibling movestart clears flag → sibling move sees isUserGestureRef=false
   *   → no re-broadcast.
   *
   * setView is accessed via setViewRef (not listed in deps) so that the
   * handlers are registered exactly once per runtime instance. Registering on
   * every setView identity change would create a gap between off() and on()
   * where a movestart could be silently dropped, permanently leaving
   * isSyncingRef=true and blocking all subsequent pan/zoom broadcasts.
   */
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
  }, [runtime, syncCamera]);

  return (
    <Flex
      sx={{
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        paddingBottom: '8px',
        backgroundColor: 'white',
        // minWidth is enforced at the grid cell level (minmax(min(440px,100%), 1fr))
        // in the parent Grid. Setting it here caused the grid's 1fr columns to
        // resolve to 440px each, overflowing the container.
        minWidth: 0,
        minHeight: 260,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          bg: 'display.background.muted.default',
          isolation: 'isolate',
        }}
      >
        <GeoVisCanvas />
        <MapLabel>{variable.name}</MapLabel>
        <GeoVisHoverTooltip render={hoverRenderer} />
      </Box>

      <CaptionLegend captions={variable.captions} />
    </Flex>
  );
};

/**
 * GeoVisMapWrapper — drop-in replacement for the Google Maps `Map` component
 * in multimapas.tsx.
 *
 * Accepts the same props as `Map` (region, variable, selectedLocationCode,
 * setLocationCode). Converts them to a VisualizationSpec via toGeoVisSpec,
 * provides a GeoVisProvider, and delegates hover/click/camera logic to
 * GeoVisMapInner via the geovis hooks.
 */
export const GeoVisMapWrapper = ({
  region,
  variable,
  selectedLocationCode,
  setLocationCode,
  geoJsonData,
}: GeoVisMapWrapperProps) => {
  const spec = React.useMemo(() => {
    return toGeoVisSpec(region, variable, geoJsonData);
  }, [region, variable, geoJsonData]);

  return (
    <GeoVisProvider spec={spec}>
      <GeoVisMapInner
        region={region}
        variable={variable}
        selectedLocationCode={selectedLocationCode}
        setLocationCode={setLocationCode}
      />
    </GeoVisProvider>
  );
};
