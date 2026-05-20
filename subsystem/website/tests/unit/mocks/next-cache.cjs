/**
 * Jest mock for next/cache.
 *
 * unstable_cache requires Next.js's incrementalCache runtime, which is not
 * present in Jest. This mock makes it a transparent passthrough so tests can
 * call the wrapped function directly without server infrastructure.
 */
const unstable_cache = (fn) => fn;

module.exports = { unstable_cache };
