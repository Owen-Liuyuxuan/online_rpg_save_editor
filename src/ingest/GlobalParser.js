import { parseSaveText } from "./SaveFileParser.js";

/** @typedef {{ filename: string; title?: string; playtime?: string; map?: string }} GlobalSlotPreview */

/**
 * Best-effort extraction of thumbnails for global/meta entries.
 * @param {unknown} decoded
 */
export function extractGlobalHints(decoded) {
  /** @type {GlobalSlotPreview[]} */
  const previews = [];
  const root = decoded && typeof decoded === "object" ? /** @type {Record<string, unknown>} */ (decoded) : {};

  /** @type {unknown} */
  const maybeList = /** @type {{ _saveinfos?: unknown; saveInfos?: unknown; savefiles?: unknown }} */ (root)
    ._saveinfos ??
    /** @type {{ saveInfos?: unknown }} */ (root).saveInfos ??
    /** @type {{ savefiles?: unknown }} */ (root).savefiles;

  if (!Array.isArray(maybeList)) return previews;

  maybeList.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const typed = /** @type {Record<string, unknown>} */ (entry);
    const title =
      typeof typed.title === "string"
        ? typed.title
        : typeof typed.characterName === "string"
          ? typed.characterName
          : "";
    const mapName =
      typeof typed.mapName === "string"
        ? typed.mapName
        : typeof typed.mapDisplayName === "string"
          ? typed.mapDisplayName
          : "";
    const playtime =
      typeof typed.playtime === "string"
        ? typed.playtime
        : typeof typed._playtime === "string"
          ? typed._playtime
          : "";
    previews.push({
      filename:
        typed.filename && typeof typed.filename === "string"
          ? typed.filename
          : `file${Math.max(idx, 1)}.rmmzsave`,
      title,
      map: mapName || undefined,
      playtime,
    });
  });

  return previews;
}

/** @param {string} compressed */
export function parseGlobalCompressed(compressed) {
  const { object } = parseSaveText(compressed);
  return { object: /** @type {Record<string, unknown>} */ (object), previews: extractGlobalHints(object) };
}
