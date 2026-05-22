/**
 * Unit tests for jenksBuckets (Jenks Natural Breaks Classification).
 *
 * jenksBuckets(data, numberClasses) partitions a numeric array into
 * `numberClasses` groups and returns the (numberClasses + 1) breakpoints.
 *
 * Error classes (NumberClassError, DataArrayError) are internal and not
 * exported, so error assertions rely solely on message strings.
 */
import { jenksBuckets } from 'src/multimapas/jenks';

/**
 * Tests for typical valid inputs, verifying expected output structure
 * and properties (length, order, boundary values).
 */
describe('jenksBuckets', () => {
  test('HP-1: [1..10] with 3 classes returns 4 breakpoints in ascending order', () => {
    const result = jenksBuckets([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    expect(result).toHaveLength(4);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i]).toBeLessThanOrEqual(result[i + 1]);
    }
  });

  test('HP-2: [10,20,30,40,50] with 2 classes has first bucket = 10 and last = 50', () => {
    const result = jenksBuckets([10, 20, 30, 40, 50], 2);
    expect(result[0]).toBe(10);
    expect(result[result.length - 1]).toBe(50);
  });

  test('HP-3: [5,5,5,10,20,100] with 3 classes returns without throwing', () => {
    expect(() => {
      return jenksBuckets([5, 5, 5, 10, 20, 100], 3);
    }).not.toThrow();
  });

  test('HP-4: [1,2,3,100,101,102] with 2 classes splits at the natural gap (break between 3 and 100)', () => {
    const result = jenksBuckets([1, 2, 3, 100, 101, 102], 2);
    expect(result).toHaveLength(3);
    expect(result[1]).toBeGreaterThanOrEqual(3);
    expect(result[1]).toBeLessThanOrEqual(100);
  });
});

/**
 * Tests for invalid inputs, ensuring appropriate error messages are thrown
 * for various error conditions related to numberClasses and data array.
 */
describe('jenksBuckets validations', () => {
  test('EV-1: non-integer numberClasses (2.5) throws "Number classes must be an integer"', () => {
    expect(() => {
      return jenksBuckets([1, 2, 3], 2.5);
    }).toThrow('Number classes must be an integer');
  });

  test('EV-2: numberClasses > data.length throws "Number classes must be less than array length"', () => {
    expect(() => {
      return jenksBuckets([1, 2, 3], 5);
    }).toThrow('Number classes must be less than array length');
  });

  test('EV-3: numberClasses = 0 throws "Number classes must be greater than zero"', () => {
    expect(() => {
      return jenksBuckets([1, 2, 3], 0);
    }).toThrow('Number classes must be greater than zero');
  });

  test('EV-4: numberClasses = -1 throws "Number classes must be greater than zero"', () => {
    expect(() => {
      return jenksBuckets([1, 2, 3], -1);
    }).toThrow('Number classes must be greater than zero');
  });

  test('EV-5: empty array throws "Array length must be bigger than one"', () => {
    expect(() => {
      return jenksBuckets([], 1);
    }).toThrow('Array length must be bigger than one');
  });

  test('EV-6: numberClasses === data.length is accepted (boundary: guard uses >, not >=)', () => {
    expect(() => {
      return jenksBuckets([1, 2, 3], 3);
    }).not.toThrow();
  });
});

/**
 * Tests for edge cases that may trigger specific branches in the implementation,
 * such as single-element arrays, duplicate values, and minimal class counts.
 * These cases verify that the function handles them gracefully without throwing
 * and produces expected adjustments (e.g., resetting buckets[0] to 0).
 */
describe('jenksBuckets - specific branches', () => {
  test('EC-1: single-element array [42] with 1 class returns without throwing; buckets[0] reset to 0 (equal boundary)', () => {
    // reset to [0, 42]
    const result = jenksBuckets([42], 1);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(42);
  });

  test('EC-2: [1,10] with 1 class returns length 2 with buckets[0]=1 and buckets[1]=10', () => {
    const result = jenksBuckets([1, 10], 1);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(10);
  });

  test('EC-3: [5,5,5] with 2 classes resets buckets[0] to 0 (duplicate boundary branch)', () => {
    const result = jenksBuckets([5, 5, 5], 2);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(5);
  });
});

/**
 * Tests for properties that should hold for all valid inputs, such as
 * the length of the result array and the non-decreasing order of breakpoints.
 * These properties are fundamental to the function's correctness and should be
 * verified across a range of valid inputs.
 */
describe('jenksBuckets — invariants', () => {
  test('CT-1: result.length === numberClasses + 1 for any valid input', () => {
    expect(jenksBuckets([1, 2, 3, 4, 5], 1)).toHaveLength(2);

    expect(jenksBuckets([1, 2, 3, 4, 5], 3)).toHaveLength(4);

    expect(jenksBuckets([1, 2, 3, 4, 5], 4)).toHaveLength(5);
  });

  test('CT-2: result is in non-decreasing order for any valid input', () => {
    const result = jenksBuckets([3, 1, 4, 1, 5, 9, 2, 6, 5, 3], 4);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i]).toBeLessThanOrEqual(result[i + 1]);
    }
  });
});
