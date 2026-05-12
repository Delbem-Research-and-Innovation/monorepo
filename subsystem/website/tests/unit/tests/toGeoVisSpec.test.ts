/**
 * Tests for toGeoVisSpec: validates that Region + Variable properties are
 * correctly translated into a VisualizationSpec contract expected by GeoVis.
 *
 * Test strategy (4 cases):
 *  1. Numerical 5-bucket (happy path): full spec structure: view center/zoom,
 *     GeoJSON source, polygon layer wiring, mapData joinKey + data rows, and
 *     quantitative threshold colorBy with thresholds and colors.
 *  2. Categorical variable: colorBy maps to { type: 'categorical', mapping }.
 *  3. Single-bucket numerical: thresholds array is empty (no breaks needed).
 *  4. ID slugification and uniqueness: spec IDs are slug-safe and differ
 *     across distinct (region, variable) pairs.
 */

import type { Caption, PolygonsOptions } from 'src/multimapas/polygons';
import type { MapConfig, Region, Variable } from 'src/multimapas/projects';
import { toGeoVisSpec } from 'src/multimapas/toGeoVisSpec';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mapConfig: MapConfig = {
  geoJsonKey: 'cd_distrito_municipal',
  geoJsonUrl: 'https://example.com/geo.geojson',
  zoom: 10,
  center: { lat: -23.5, lng: -46.6 },
};

const makeRegion = (name: string, variable: Variable): Region => {
  return {
    name,
    mapConfig,
    variables: [variable],
    locations: Object.keys(variable.polygonsOptions).map((code) => {
      return {
        code,
        name: `Local ${code}`,
      };
    }),
  };
};

// ---------------------------------------------------------------------------
// Case 1 — Numerical variable with 5 Jenks buckets (happy path)
// ---------------------------------------------------------------------------

const numericalCaptions: Caption[] = [
  { value: 436, name: '436', fillColor: '#8C8C8C', dataType: 'numerical' },
  {
    value: 874,
    name: 'de 437 até 874',
    fillColor: '#00B89F',
    dataType: 'numerical',
  },
  {
    value: 1312,
    name: 'de 875 até 1312',
    fillColor: '#0093B2',
    dataType: 'numerical',
  },
  {
    value: 2188,
    name: 'de 1313 até 2188',
    fillColor: '#0067C5',
    dataType: 'numerical',
  },
  {
    value: 4674,
    name: 'de 2189 até 4674',
    fillColor: '#00497A',
    dataType: 'numerical',
  },
];

const numericalPolygonsOptions: PolygonsOptions = {
  '35001': {
    fillColor: '#8C8C8C',
    value: 200,
    caption: numericalCaptions[0],
  },
  '35002': {
    fillColor: '#00B89F',
    value: 600,
    caption: numericalCaptions[1],
  },
  '35003': {
    fillColor: '#0093B2',
    value: 1000,
    caption: numericalCaptions[2],
  },
};

const numericalVariable: Variable = {
  name: 'Envelhecimento',
  data: { '35001': 200, '35002': 600, '35003': 1000 },
  captions: numericalCaptions,
  polygonsOptions: numericalPolygonsOptions,
};

describe('toGeoVisSpec — Numerical variable (5 buckets)', () => {
  const region = makeRegion('Distrito Municipal 2025', numericalVariable);
  const spec = toGeoVisSpec(region, numericalVariable);
  const specMapData = spec.mapData ?? [];
  const specLegends = spec.legends ?? [];

  test('spec.view maps center as [lng, lat] and preserves zoom', () => {
    // GeoVis LngLat = [lng, lat] — order differs from mapConfig { lat, lng }
    expect(spec.view).toEqual({
      center: [-46.6, -23.5],
      zoom: 10,
    });
  });

  test('spec.sources has one GeoJSON source pointing to geoJsonUrl', () => {
    expect(spec.sources).toHaveLength(1);
    const source = spec.sources[0] as { type: string; data: string };
    expect(source.type).toBe('geojson');
    expect(source.data).toBe(mapConfig.geoJsonUrl);
  });

  test('spec.layers[0] is wired to the correct source, mapData and legend', () => {
    const layer = spec.layers[0];
    expect(layer.geometry).toBe('polygon');
    expect(layer.sourceId).toBe(spec.sources[0].id);
    expect(layer.mapDataId).toBe(specMapData[0].mapDataId);
    expect(layer.activeLegendId).toBe(specLegends[0].id);
  });

  test('spec.mapData[0].joinKey equals geoJsonKey from mapConfig', () => {
    expect(specMapData[0].joinKey).toBe('cd_distrito_municipal');
  });

  test('spec.mapData[0].data contains one row per polygonsOptions entry', () => {
    const data = specMapData[0].data;
    expect(data).toHaveLength(3);
    expect(data).toContainEqual({ geometryId: '35001', value: 200 });
    expect(data).toContainEqual({ geometryId: '35002', value: 600 });
    expect(data).toContainEqual({ geometryId: '35003', value: 1000 });
  });

  test('spec.legends[0].colorBy is quantitative threshold', () => {
    const colorBy = specLegends[0].colorBy as {
      type: string;
      scale: string;
      thresholds: number[];
      colors: string[];
    };
    expect(colorBy.type).toBe('quantitative');
    expect(colorBy.scale).toBe('threshold');
  });

  test('thresholds are captions[1..].value — N-1 breaks for N buckets', () => {
    const colorBy = specLegends[0].colorBy as { thresholds: number[] };
    // captions.slice(1) = [874, 1312, 2188, 4674]
    expect(colorBy.thresholds).toEqual([874, 1312, 2188, 4674]);
  });

  test('colors are all captions fillColors — palette[0] is the below-min fallback', () => {
    const colorBy = specLegends[0].colorBy as { colors: string[] };
    expect(colorBy.colors).toEqual([
      '#8C8C8C',
      '#00B89F',
      '#0093B2',
      '#0067C5',
      '#00497A',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Case 2 — Categorical variable
// ---------------------------------------------------------------------------

const categoricalCaptions: Caption[] = [
  { value: 1, name: 'Baixo', fillColor: '#aabbcc', dataType: 'categorical' },
  { value: 2, name: 'Médio', fillColor: '#ddeeff', dataType: 'categorical' },
  { value: 3, name: 'Alto', fillColor: '#112233', dataType: 'categorical' },
];

const categoricalPolygonsOptions: PolygonsOptions = {
  '35001': {
    fillColor: '#aabbcc',
    value: 1,
    caption: categoricalCaptions[0],
  },
  '35002': {
    fillColor: '#ddeeff',
    value: 2,
    caption: categoricalCaptions[1],
  },
};

const categoricalVariable: Variable = {
  name: 'Categoria',
  data: { '35001': 1, '35002': 2 },
  captions: categoricalCaptions,
  polygonsOptions: categoricalPolygonsOptions,
};

describe('toGeoVisSpec — Categorical variable', () => {
  const region = makeRegion('Subprefeitura 2025', categoricalVariable);
  const spec = toGeoVisSpec(region, categoricalVariable);
  const specLegendsCat = spec.legends ?? [];

  test('colorBy.type is categorical', () => {
    expect(specLegendsCat[0].colorBy.type).toBe('categorical');
  });

  test('colorBy.mapping keys are stringified caption values', () => {
    const colorBy = specLegendsCat[0].colorBy as {
      mapping: Record<string, string>;
    };
    // caption.value is numeric; mapping key must be String(value)
    expect(colorBy.mapping).toEqual({
      '1': '#aabbcc',
      '2': '#ddeeff',
      '3': '#112233',
    });
  });
});

// ---------------------------------------------------------------------------
// Case 3 — Single-bucket numerical (degenerate: only one Jenks class)
// ---------------------------------------------------------------------------

const singleBucketCaptions: Caption[] = [
  { value: 100, name: '100', fillColor: '#8C8C8C', dataType: 'numerical' },
];

const singleBucketVariable: Variable = {
  name: 'Homogeneo',
  data: { '35001': 100, '35002': 100 },
  captions: singleBucketCaptions,
  polygonsOptions: {
    '35001': {
      fillColor: '#8C8C8C',
      value: 100,
      caption: singleBucketCaptions[0],
    },
    '35002': {
      fillColor: '#8C8C8C',
      value: 100,
      caption: singleBucketCaptions[0],
    },
  },
};

describe('toGeoVisSpec — Single-bucket numerical (degenerate)', () => {
  const region = makeRegion('Região Teste', singleBucketVariable);
  const spec = toGeoVisSpec(region, singleBucketVariable);
  const specLegendsSingle = spec.legends ?? [];

  test('thresholds is an empty array when there is only one caption', () => {
    const colorBy = specLegendsSingle[0].colorBy as { thresholds: number[] };
    // captions.slice(1) = [] → no break points
    expect(colorBy.thresholds).toEqual([]);
  });

  test('colors has exactly one entry matching the single caption fillColor', () => {
    const colorBy = specLegendsSingle[0].colorBy as { colors: string[] };
    expect(colorBy.colors).toEqual(['#8C8C8C']);
  });
});

// ---------------------------------------------------------------------------
// Case 4 — ID slugification and uniqueness
// ---------------------------------------------------------------------------

describe('toGeoVisSpec — Spec ID slugification and uniqueness', () => {
  test('IDs are lowercased, accents stripped, spaces replaced by hyphens', () => {
    const region = makeRegion('Distrito Municipal 2025', numericalVariable);
    const spec = toGeoVisSpec(region, numericalVariable);
    // "Distrito Municipal 2025" + "Envelhecimento" → slugified
    expect(spec.id).toBe('distrito-municipal-2025--envelhecimento');
  });

  test('special characters in region name are stripped from the ID', () => {
    const region = makeRegion('São Paulo (SP)', numericalVariable);
    const spec = toGeoVisSpec(region, numericalVariable);
    expect(spec.id).toBe('sao-paulo-sp--envelhecimento');
  });

  test('two specs with different region names produce different IDs', () => {
    const r1 = makeRegion('Região A', numericalVariable);
    const r2 = makeRegion('Região B', numericalVariable);
    expect(toGeoVisSpec(r1, numericalVariable).id).not.toBe(
      toGeoVisSpec(r2, numericalVariable).id
    );
  });

  test('two specs with different variable names produce different IDs', () => {
    const region = makeRegion('Região X', numericalVariable);
    const v2: Variable = { ...numericalVariable, name: 'Outra Variavel' };
    expect(toGeoVisSpec(region, numericalVariable).id).not.toBe(
      toGeoVisSpec(region, v2).id
    );
  });

  test('all internal IDs (source, layer, mapData, legend) contain the spec ID', () => {
    const region = makeRegion('Zona Norte', numericalVariable);
    const spec = toGeoVisSpec(region, numericalVariable);
    expect(spec.sources[0].id).toContain(spec.id);
    expect(spec.layers[0].id).toContain(spec.id);
    expect((spec.mapData ?? [])[0].mapDataId).toContain(spec.id);
    expect((spec.legends ?? [])[0].id).toContain(spec.id);
  });
});
