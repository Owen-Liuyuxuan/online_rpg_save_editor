import { decode as codecDecode } from "../codec/SaveCodec.js";

/** @typedef {{ mapName?: string; playtime?: string; partyCount?: number }} SlotSummary */

/**
 * @param {string} text
 */
export function parseSaveText(text) {
  return codecDecode(text);
}

/**
 * Extract light-weight labels for toolbar chips without needing global.json.
 * @param {Record<string, unknown>} obj
 * @returns {SlotSummary}
 */
export function summarizeDecodedSave(obj) {
  /** @type {SlotSummary} */
  const out = {};

  const mapObj =
    obj && typeof obj.map === "object" && obj.map
      ? /** @type {Record<string, unknown>} */ (obj.map)
      : undefined;
  const display =
    mapObj && typeof mapObj._displayName === "string"
      ? mapObj._displayName.trim()
      : "";
  if (display) out.mapName = display;

  const sys =
    obj && typeof obj.system === "object" && obj.system
      ? /** @type {Record<string, unknown>} */ (obj.system)
      : undefined;
  if (sys && typeof sys._playtime === "string" && sys._playtime.trim())
    out.playtime = sys._playtime.trim();

  const party =
    obj && typeof obj.party === "object" && obj.party
      ? /** @type {Record<string, unknown>} */ (obj.party)
      : undefined;
  const members =
    party && typeof party._members === "object" && party._members
      ? /** @type {Record<string, unknown>} */ (party._members)
      : undefined;
  const pdata = members && Array.isArray(members._data) ? members._data : null;
  if (pdata) {
    const live = pdata.filter((x) => x != null && x !== "").length;
    out.partyCount = live || undefined;
  }

  return out;
}
