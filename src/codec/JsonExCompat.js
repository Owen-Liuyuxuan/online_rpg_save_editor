/**
 * Helpers for RPG Maker MZ JsonEx-style metadata (@class keys, etc.).
 * Strategy: mutate known slices in-place; preserve unknown subtree references.
 */

const META_PREFIX = "@";

/** @returns {unknown} Deep clone plain JSON-compatible values via JSON bridge. */
export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Produce a trimmed view for UX (drops keys starting with @) — informational only.
 * @param {unknown} value
 * @returns {unknown}
 */
export function stripMetadataDeep(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripMetadataDeep(v));
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (value))) {
    if (k.startsWith(META_PREFIX)) continue;
    out[k] = stripMetadataDeep(v);
  }
  return out;
}

/**
 * Shallow-assign keys from `patch` onto `target` except metadata keys unless present in patch.
 * Does not recurse.
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} patch
 */
export function shallowAssignPreserveMeta(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    target[k] = /** @type {unknown} */ (v);
  }
}

/**
 * Parse JSON safely and throw with message.
 * @param {string} text
 */
export function parseStrict(text) {
  return JSON.parse(text);
}
