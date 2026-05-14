import type { ColorBy, GeoJSONObject, VisualizationSpec } from '@ttoss/geovis';

import type { Region, Variable } from './projects';

/**
 * Converts a `Region` + `Variable` pair from the Multimapas data model into
 * a `VisualizationSpec` for GeoVis.
 *
 * Color mapping (numerical):
 * - `thresholds = captions.slice(1).map(c => c.value)` — N-1 break points for
 *   N buckets, matching the MapLibre `step` semantics used internally.
 * - `colors = captions.map(c => c.fillColor)` — N colors; palette[0] is the
 *   fallback for values below the first threshold (below-minimum values).
 *
 * @param region - Region containing map configuration and location list.
 * @param variable - Variable with choropleth data and pre-computed captions.
 * @returns A `VisualizationSpec` ready to pass to `<GeoVisProvider spec={}>`.
 */
/** Converts an arbitrary string to a lowercase slug safe for use as an ID. */
const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const buildColorBy = (captions: Variable['captions']): ColorBy => {
  const isNumerical = captions[0]?.dataType === 'numerical';
  return isNumerical
    ? {
        type: 'quantitative',
        property: 'value',
        scale: 'threshold',
        // N-1 thresholds for N captions: boundary is the value of captions[i]
        // for i=1..N-1 (the lower bound of each successive bucket).
        thresholds: captions.slice(1).map((c) => {
          return c.value;
        }),
        colors: captions.map((c) => {
          return c.fillColor;
        }),
      }
    : {
        type: 'categorical',
        property: 'value',
        // For categorical variables, value stored in mapData is the raw
        // category key (e.g. "1", "2"). mapping keys must match those values.
        mapping: Object.fromEntries(
          captions.map((c) => {
            return [String(c.value), c.fillColor];
          })
        ),
      };
};

export const toGeoVisSpec = (
  region: Region,
  variable: Variable,
  geoJsonData?: GeoJSONObject
): VisualizationSpec => {
  const { mapConfig } = region;

  const specId = `${toSlug(region.name)}--${toSlug(variable.name)}`;
  const sourceId = `${specId}__geo`;
  const layerId = `${specId}__choropleth`;
  const mapDataId = `${specId}__values`;
  const legendId = `${specId}__legend`;

  const hasCaption = variable.captions.length > 0;
  const colorBy = buildColorBy(variable.captions);

  const spec: VisualizationSpec = {
    id: specId,
    engine: 'maplibre',
    view: {
      ...(mapConfig.center != null && {
        center: [mapConfig.center.lng, mapConfig.center.lat] as [
          number,
          number,
        ],
      }),
      ...(mapConfig.zoom != null && { zoom: mapConfig.zoom }),
    },
    basemap: { visible: false },
    sources: [
      {
        id: sourceId,
        type: 'geojson',
        data: geoJsonData ?? mapConfig.geoJsonUrl,
      },
    ],
    layers: [
      {
        id: layerId,
        sourceId,
        geometry: 'polygon',
        mapDataId,
        ...(hasCaption && { activeLegendId: legendId }),
        paint: {
          lineColor: '#000000',
          fillOpacity: 1,
        },
      },
    ],
    mapData: [
      {
        mapDataId,
        mapId: sourceId,
        joinKey: mapConfig.geoJsonKey,
        data: Object.entries(variable.polygonsOptions).map(([code, opts]) => {
          return {
            geometryId: code,
            value: opts.value,
          };
        }),
      },
    ],
    ...(hasCaption && {
      legends: [
        {
          id: legendId,
          colorBy,
        },
      ],
    }),
  };

  return spec;
};
