import type { MapHoverInfo } from '@ttoss/geovis';
import {
  GeoVisCanvas,
  GeoVisHoverTooltip,
  GeoVisLegend,
  GeoVisProvider,
  useGeoVis,
  useGeoVisClick,
} from '@ttoss/geovis';
import * as React from 'react';

import {
  cameraForDeselection,
  codeFromFeatureId,
  locationForFeatureId,
} from './GeoVisMapWrapper.helpers';
import type { Region, Variable } from './projects';
import { toGeoVisSpec } from './toGeoVisSpec';

/**
 * Render prop for GeoVisHoverTooltip.
 * Defined at module scope so the function reference is stable across renders
 * (no new identity per render = no spurious tooltip re-mounts).
 */
const renderHoverTooltip = (region: Region) => {
  const tooltipRenderer = (info: MapHoverInfo): React.ReactNode => {
    const location = locationForFeatureId(info.featureId, region);
    const name = location?.name ?? `#${String(info.featureId)}`;
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
        {info.value != null && (
          <div style={{ color: '#ffffff' }}>{String(info.value)}</div>
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
};

export const MapLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(255,255,255,0.88)',
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 600,
        color: '#374151',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
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
  legendId,
}: GeoVisMapWrapperProps & { legendId: string | undefined }) => {
  const clickInfo = useGeoVisClick();
  const { setView } = useGeoVis();

  /**
   * Propagate click events to the parent via setLocationCode.
   * codeFromFeatureId coerces numeric featureIds to string (geovis can emit
   * either type depending on the GeoJSON source feature ids).
   */
  React.useEffect(() => {
    if (clickInfo) {
      setLocationCode(codeFromFeatureId(clickInfo.featureId));
      setView({ center: clickInfo.lngLat });
    }
  }, [clickInfo, setLocationCode, setView]);

  /**
   * Reset the camera to region defaults when the selection is cleared.
   * cameraForDeselection swaps lat/lng → [lng, lat] as required by geovis.
   */
  React.useEffect(() => {
    if (!selectedLocationCode) {
      setView(cameraForDeselection(region));
    }
  }, [selectedLocationCode, region, setView]);

  const hoverRenderer = React.useMemo(() => {
    return renderHoverTooltip(region);
  }, [region]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        paddingBottom: '8px',
      }}
    >
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <GeoVisCanvas
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <MapLabel>{variable.name}</MapLabel>
        <GeoVisHoverTooltip render={hoverRenderer} />
      </div>

      {legendId && <GeoVisLegend legendId={legendId} />}
    </div>
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
}: GeoVisMapWrapperProps) => {
  const spec = React.useMemo(() => {
    return toGeoVisSpec(region, variable);
  }, [region, variable]);

  const legendId = spec.legends?.[0]?.id;

  return (
    <GeoVisProvider spec={spec}>
      <GeoVisMapInner
        region={region}
        variable={variable}
        selectedLocationCode={selectedLocationCode}
        setLocationCode={setLocationCode}
        legendId={legendId}
      />
    </GeoVisProvider>
  );
};
