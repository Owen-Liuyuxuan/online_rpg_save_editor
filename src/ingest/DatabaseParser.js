/**
 * Parses optional RPG Maker MZ `data/*.json` exports for friendly editor labels.
 * Supports root arrays with an unused `[0]` sentinel or `{ data: [...] }` wrappers.
 */

/** @typedef {Record<string, unknown>} JsonLike */

/** @typedef {import('../store/DatabaseStore.js').DatabaseStore} DatabaseStore */

/** @param {unknown} value */
/** @returns {unknown[]} */
function coerceArray(value) {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    Array.isArray(/** @type {{ data?: unknown[] }} */ (value).data)
  ) {
    return /** @type {{ data?: unknown[] }} */ (value).data ?? [];
  }
  return [];
}

/**
 * @param {unknown[]} rows
 * @returns {Map<number,string>}
 */
function indexedNameMap(rows) {
  /** @type {Map<number,string>} */
  const map = new Map();
  rows.forEach((row, idx) => {
    if (!row || typeof row !== "object") return;
    const name =
      typeof /** @type {{ name?: unknown }} */ (row).name === "string"
        ? String(/** @type {{ name?: unknown }} */ (row).name).trim()
        : "";
    if (!name || idx <= 0) return;
    map.set(idx, name);
  });
  return map;
}

/**
 * @param {unknown[]} rows
 * @returns {Map<number,string>}
 */
function indexedStrings(rows) {
  /** @type {Map<number,string>} */
  const map = new Map();
  rows.forEach((row, idx) => {
    if (typeof row !== "string") return;
    const text = row.trim();
    if (!text || idx <= 0) return;
    map.set(idx, text);
  });
  return map;
}

/**
 * @param {DatabaseStore} store
 * @param {JsonLike} json
 */
export function loadActors(store, json) {
  store.actors = { label: indexedNameMap(coerceArray(json)) };
}

/** @param {DatabaseStore} store @param {JsonLike} json */
export function loadItems(store, json) {
  store.items = { label: indexedNameMap(coerceArray(json)) };
}

/** @param {DatabaseStore} store @param {JsonLike} json */
export function loadWeapons(store, json) {
  store.weapons = { label: indexedNameMap(coerceArray(json)) };
}

/** @param {DatabaseStore} store @param {JsonLike} json */
export function loadArmors(store, json) {
  store.armors = { label: indexedNameMap(coerceArray(json)) };
}

/** @param {DatabaseStore} store @param {JsonLike} json */
export function loadSkills(store, json) {
  store.skills = { label: indexedNameMap(coerceArray(json)) };
}

/** @param {DatabaseStore} store @param {JsonLike} json */
export function loadClasses(store, json) {
  store.classes = { label: indexedNameMap(coerceArray(json)) };
}

/** @param {DatabaseStore} store @param {JsonLike} json */
export function loadStates(store, json) {
  store.states = { label: indexedNameMap(coerceArray(json)) };
}

/** @param {DatabaseStore} store @param {JsonLike} json */
export function loadMapInfos(store, json) {
  const rows = coerceArray(json);
  /** @type {Map<number,string>} */
  const map = new Map();
  rows.forEach((row, idx) => {
    if (!row || typeof row !== "object") return;
    const nameRaw = /** @type {{ name?: unknown }} */ (row).name;
    const name =
      typeof nameRaw === "string"
        ? nameRaw.trim()
        : "";
    const id =
      typeof /** @type {{ id?: unknown }} */ (row).id === "number"
        ? /** @type {{ id?: number }} */ (row).id
        : idx;
    const key = Number(id);
    if (!name || !(key > 0)) return;
    map.set(key, name);
  });
  store.mapInfos = { label: map };
}

/**
 * System.json exposes string arrays describing switch / variable captions.
 * @param {DatabaseStore} store
 * @param {JsonLike} json
 */
export function loadSystem(store, json) {
  const switches = coerceArray(json.switches ?? json.switchings ?? []);
  const variables = coerceArray(json.variables ?? json.variable ?? []);
  store.switches = indexedStrings(switches);
  store.variables = indexedStrings(variables);
  store.systemLoaded = store.switches.size > 0 || store.variables.size > 0;
}
