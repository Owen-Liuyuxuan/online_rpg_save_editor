/**
 * Encode/decode RPG Maker MZ local save payloads (LZString Base64 wrapping JSON-like text).
 * Expects vendor/lz-string.min.js to expose global `LZString` before modules load.
 */

function lz() {
  const z = typeof globalThis !== "undefined" && globalThis.LZString;
  if (!z || typeof z.decompressFromBase64 !== "function") {
    throw new Error(
      "LZString is not loaded. Include vendor/lz-string.min.js before the app module bundle."
    );
  }
  return z;
}

/** @typedef {{ valid: boolean, errors: string[], warnings: string[] }} ValidationResult */

/**
 * Decode compressed save text → parsed object + raw JSON text for round-trip fidelity checks.
 * @param {string} compressed
 * @returns {{ object: Record<string, unknown>, jsonText: string }}
 */
export function decode(compressed) {
  const trimmed = String(compressed ?? "").trim();
  if (!trimmed) {
    throw new Error("Save file content is empty.");
  }
  const jsonText = lz().decompressFromBase64(trimmed);
  if (jsonText == null || jsonText === "") {
    throw new Error(
      "LZString decompress failed — not a standard RPG Maker MZ save, wrong encoding, or encrypted plugin."
    );
  }
  let object;
  try {
    object = JSON.parse(jsonText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Decompressed payload is not valid JSON: ${msg}`);
  }
  if (!object || typeof object !== "object" || Array.isArray(object)) {
    throw new Error("Decoded payload must be a JSON object at the root.");
  }
  return { object: /** @type {Record<string, unknown>} */ (object), jsonText };
}

/**
 * @param {Record<string, unknown>} saveObject
 * @returns {string}
 */
export function encode(saveObject) {
  const jsonText = JSON.stringify(saveObject);
  return lz().compressToBase64(jsonText);
}

/**
 * Lightweight structural checks common to slot saves vs global/config.
 * @param {unknown} saveObject
 * @param {'slot'|'global'|'config'|'unknown'} kind
 * @returns {ValidationResult}
 */
export function validate(saveObject, kind = "slot") {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (!saveObject || typeof saveObject !== "object") {
    return { valid: false, errors: ["Root payload is not an object."], warnings: [] };
  }
  const obj = /** @type {Record<string, unknown>} */ (saveObject);

  if (kind === "slot") {
    const hints = ["party", "switches", "variables", "actors", "map", "player", "system"];
    const hits = hints.filter((k) => obj[k] !== undefined);
    if (hits.length === 0) {
      warnings.push(
        "Missing common slot keys (party/switches/variables/actors/map/player/system). Possibly global/config or plugin-altered saves."
      );
    } else if (hits.length < 3) {
      warnings.push(`Only found expected keys subset: ${hits.join(", ")}.`);
    }
  }

  const valid = errors.length === 0;
  return { valid, errors, warnings };
}
