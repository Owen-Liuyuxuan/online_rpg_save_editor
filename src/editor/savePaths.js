/** @typedef {Record<string, unknown>} Dict */

/** @param {unknown} save */
/** @returns {Dict | null} */
export function asDict(save) {
  return save && typeof save === "object" && !Array.isArray(save) ? /** @type {Dict} */ (save) : null;
}

/** @param {Dict} save */
export function ensureParty(save) {
  if (!save.party || typeof save.party !== "object") save.party = {};
  const party = /** @type {Dict} */ (save.party);
  if (!party._members || typeof party._members !== "object") {
    party._members = { _data: [] };
  }
  const mem = /** @type {Dict} */ (party._members);
  if (!Array.isArray(mem._data)) mem._data = [];
  return party;
}

/** @param {Dict} save */
export function ensureSwitches(save) {
  if (!save.switches || typeof save.switches !== "object") save.switches = {};
  const sw = /** @type {Dict} */ (save.switches);
  if (!Array.isArray(sw._data)) sw._data = [];
  const arr = /** @type {unknown[]} */ (sw._data);
  while (arr.length <= 1) arr.push(null);
  return sw;
}

/** @param {Dict} save */
export function ensureVariables(save) {
  if (!save.variables || typeof save.variables !== "object") save.variables = {};
  const vv = /** @type {Dict} */ (save.variables);
  if (!Array.isArray(vv._data)) vv._data = [];
  const arr = /** @type {unknown[]} */ (vv._data);
  while (arr.length <= 1) arr.push(null);
  return vv;
}

/** @param {Dict} save */
export function ensureSelfSwitches(save) {
  if (!save.selfSwitches || typeof save.selfSwitches !== "object") save.selfSwitches = {};
  const ss = /** @type {Dict} */ (save.selfSwitches);
  if (!ss._data || typeof ss._data !== "object") ss._data = {};
  return ss;
}

/** @param {Dict} save */
export function ensureActors(save) {
  if (!save.actors || typeof save.actors !== "object") save.actors = {};
  const actors = /** @type {Dict} */ (save.actors);
  if (!Array.isArray(actors._data)) actors._data = [];
  const arr = /** @type {unknown[]} */ (actors._data);
  while (arr.length <= 1) arr.push(null);
  return actors;
}

/** @param {Dict} save */
export function ensureMap(save) {
  if (!save.map || typeof save.map !== "object") save.map = {};
  return /** @type {Dict} */ (save.map);
}

/** @param {Dict} save */
export function ensurePlayer(save) {
  if (!save.player || typeof save.player !== "object") save.player = {};
  return /** @type {Dict} */ (save.player);
}

/** @param {Dict} save */
export function ensureSystem(save) {
  if (!save.system || typeof save.system !== "object") save.system = {};
  return /** @type {Dict} */ (save.system);
}

/** @typedef {{ id: number|string; qty: number }} IdQty */

/** @param {unknown} blob */
/** @returns {Dict} */
export function ensureIdQty(blob) {
  if (!blob || typeof blob !== "object") return {};
  return /** @type {Dict} */ (blob);
}

/** @returns {number} coerce quantity */
export function coerceNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
