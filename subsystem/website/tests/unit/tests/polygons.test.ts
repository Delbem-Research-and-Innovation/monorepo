/**
 * Unit tests for polygons.ts.
 *
 * Section A: getFrequencyTable (via getPolygonsOptionsForNumericalValues)
 *   Tests the Jenks bypass behaviour (data.length <= classQty),
 *   NaN/null filtering, and the single-value path.
 *
 * Section B: getPolygonsOptionsForNumericalValues
 *   Tests value-to-caption/colour mapping, transparent fallback,
 *   caption naming (ST-1: index 0 vs ST-2: 'de X até Y') and empty map.
 *
 * No mocks needed - jenksBuckets is called for real.
 */

import { getPolygonsOptionsForNumericalValues } from 'src/multimapas/polygons';

/**
 * 3-item fixture that activates the Jenks bypass (data.length <= classQty).
 * All three values are distinct to exercise both caption naming branches:
 * the plain-value label (index 0) and the range label (subsequent indices).
 */
const threeValueData = { a: 1, b: 5, c: 20 };

/**
 * 10-item fixture that exercises the Jenks code path (data.length > classQty).
 * Evenly spaced values ensure all breakpoints land on actual data points,
 * making caption-to-polygon mapping deterministic in assertions.
 */
const tenValueData = {
  a: 10,
  b: 20,
  c: 30,
  d: 40,
  e: 50,
  f: 60,
  g: 70,
  h: 80,
  i: 90,
  j: 100,
};

describe('getPolygonsOptionsForNumericalValues: getFrequencyTable', () => {
  test('HP-1: All breakpoints must be a subset of the original data values, producing numberClasses + 1 breakpoints', async () => {
    const { captions } =
      await getPolygonsOptionsForNumericalValues(tenValueData);

    expect(captions).toHaveLength(5);

    const dataValues = Object.values(tenValueData);
    for (const caption of captions) {
      expect(dataValues).toContain(caption.value);
    }
  });

  test('EC-1: bypasses Jenks when data.length <= classQty, using unique sorted values instead', async () => {
    const { captions } =
      await getPolygonsOptionsForNumericalValues(threeValueData);

    expect(captions).toHaveLength(3);
    const captionValues = captions.map((c) => {
      return c.value;
    });
    expect(captionValues).toContain(1);
    expect(captionValues).toContain(5);
    expect(captionValues).toContain(20);
  });

  test('EC-2: single unique value produces one caption with the first numerical colour', async () => {
    const { captions } = await getPolygonsOptionsForNumericalValues({
      a: 5,
      b: 5,
    });

    expect(captions).toHaveLength(1);
    expect(captions[0].value).toBe(5);
    expect(captions[0].fillColor).toBe('#8C8C8C');
    expect(captions[0].dataType).toBe('numerical');
  });

  test('EC-3: NaN values are excluded before the frequency table is computed', async () => {
    const { captions } = await getPolygonsOptionsForNumericalValues({
      a: NaN,
      b: 10,
      c: 20,
    });

    expect(captions).toHaveLength(2);
    const captionValues = captions.map((c) => {
      return c.value;
    });
    expect(captionValues).not.toContain(NaN);
    expect(captionValues).toContain(10);
    expect(captionValues).toContain(20);
  });

  test('EC-4: duplicate values collapse to one caption via Set deduplication', async () => {
    const { captions } = await getPolygonsOptionsForNumericalValues({
      a: 7,
      b: 7,
      c: 7,
      d: 7,
    });

    expect(captions).toHaveLength(1);
    expect(captions[0].value).toBe(7);
  });
});

describe('getPolygonsOptionsForNumericalValues: polygon mapping', () => {
  test('HP-1: every polygon entry receives the fill colour of its matched caption', async () => {
    const { captions, polygonsOptions } =
      await getPolygonsOptionsForNumericalValues(tenValueData);

    expect(captions).toHaveLength(5);

    // All entries must have a non-empty fillColor and a numeric value
    for (const [key, val] of Object.entries(tenValueData)) {
      const opt = polygonsOptions[key];
      expect(opt.value).toBe(val);
      expect(opt.fillColor).toBeTruthy();
      expect(opt.fillColor).not.toBe('transparent');
    }
  });

  test('HP-2: value equal to the last breakpoint maps to the last caption (boundary inclusive)', async () => {
    const { captions, polygonsOptions } =
      await getPolygonsOptionsForNumericalValues(tenValueData);

    const lastCaption = captions[captions.length - 1];
    // 'j' = 100, which is the max and the last breakpoint
    expect(polygonsOptions['j'].caption.value).toBe(lastCaption.value);
    expect(polygonsOptions['j'].fillColor).toBe(lastCaption.fillColor);
  });

  test('EC-5: NaN-only input falls back to transparent fill colour', async () => {
    const { polygonsOptions } = await getPolygonsOptionsForNumericalValues({
      a: NaN,
    });

    expect(polygonsOptions['a'].fillColor).toBe('transparent');
  });

  test('EC-6: value between two breakpoints resolves to the lower caption (inclusive lower bound)', async () => {
    const { polygonsOptions } =
      await getPolygonsOptionsForNumericalValues(threeValueData);

    expect(polygonsOptions['b'].caption.value).toBe(5);
    expect(polygonsOptions['b'].value).toBe(5);
  });

  test('EC-7: empty input produces empty captions and polygonsOptions', async () => {
    const { captions, polygonsOptions } =
      await getPolygonsOptionsForNumericalValues({});

    expect(captions).toEqual([]);
    expect(polygonsOptions).toEqual({});
  });

  test('ST-1: first caption uses a plain value label because it marks the data minimum, not a range boundary', async () => {
    const { captions } =
      await getPolygonsOptionsForNumericalValues(threeValueData);

    expect(captions[0].name).toBe('1');
  });

  test('ST-2: non-first captions use a range label "de X até Y" when the lower boundary differs from the bucket value', async () => {
    const { captions } =
      await getPolygonsOptionsForNumericalValues(threeValueData);

    expect(captions[1].name).toBe('de 2 até 5');
  });
});
