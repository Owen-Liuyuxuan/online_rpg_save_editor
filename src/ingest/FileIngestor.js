import { validate as codecValidate } from "../codec/SaveCodec.js";
import {
  loadActors,
  loadArmors,
  loadClasses,
  loadItems,
  loadMapInfos,
  loadSkills,
  loadStates,
  loadSystem,
  loadWeapons,
} from "./DatabaseParser.js";
import { parseGlobalCompressed } from "./GlobalParser.js";
import { parseSaveText } from "./SaveFileParser.js";

/** @typedef {'save-global'|'save-config'|'save-slot'|'database'|'ignored'} IngKind */

/**
 * @typedef {{
 * kind: IngKind,
 * warnings: string[],
 * errors: string[],
 * previews?: import('./GlobalParser.js').GlobalSlotPreview[]
 * }} ParsedResult */

/** @typedef {Record<string, unknown>} JsonDict */

/** @param {File} file @returns {IngKind} */
export function detectFileType(file) {
  const lc = file.name.toLowerCase();
  if (/\.json$/i.test(lc)) return "database";
  if (/^global\.rmmz(save|data)$/i.test(lc)) return "save-global";
  if (/^config\.rmmz(save|data)$/i.test(lc)) return "save-config";
  if (/\.rmmzsave$/i.test(lc) || /\.rmmzdata$/i.test(lc)) return "save-slot";
  return "ignored";
}

/** @typedef {import('../store/SaveStore.js').SaveStore} SaveStore */

/** @typedef {import('../store/DatabaseStore.js').DatabaseStore} DbStore */

/**
 * @param {SaveStore} saveStore
 * @param {DbStore} dbStore
 * @param {File} file
 */
export async function ingestFile(saveStore, dbStore, file) {
  const kind = detectFileType(file);
  const text = await file.text();

  /** @type {ParsedResult} */
  const envelope = {
    kind,
    warnings: [],
    errors: [],
    previews: undefined,
  };

  if (kind === "ignored") {
    envelope.errors.push(`Unsupported upload: ${file.name}`);
    return envelope;
  }

  if (kind === "database") {
    hydrateDatabaseBlob(dbStore, file.name.toLowerCase(), text, envelope);
    return envelope;
  }

  if (kind === "save-global") {
    try {
      const { object, previews } = parseGlobalCompressed(text);
      saveStore.load(file.name, text, /** @type {Record<string, unknown>} */ (object));
      const v = codecValidate(object, "global");
      envelope.errors.push(...v.errors.map((m) => `${file.name}: ${m}`));
      envelope.warnings.push(...v.warnings);
      envelope.previews = previews;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      envelope.errors.push(`${file.name}: ${msg}`);
    }
    return envelope;
  }

  if (kind === "save-config") {
    try {
      const { object } = parseSaveText(text);
      saveStore.load(file.name, text, /** @type {Record<string, unknown>} */ (object));
      const v = codecValidate(object, "config");
      envelope.errors.push(...v.errors.map((m) => `${file.name}: ${m}`));
      envelope.warnings.push(...v.warnings);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      envelope.errors.push(`${file.name}: ${msg}`);
    }
    return envelope;
  }

  try {
    const { object } = parseSaveText(text);
    saveStore.load(file.name, text, /** @type {Record<string, unknown>} */ (object));
    const v = codecValidate(object, "slot");
    envelope.errors.push(...v.errors.map((m) => `${file.name}: ${m}`));
    envelope.warnings.push(...v.warnings);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    envelope.errors.push(`${file.name}: ${msg}`);
  }
  return envelope;
}

/** @param {unknown} raw @param {string} fnameForError */
export function parseJsonFromText(raw, fnameForError) {
  try {
    return JSON.parse(String(raw ?? ""));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${fnameForError}: invalid JSON (${msg})`);
  }
}

/** @param {DbStore} dbStore @param {string} loweredFilename @param {string} text @param {ParsedResult} envelope */
function hydrateDatabaseBlob(dbStore, loweredFilename, text, envelope) {
  let jsonUnknown;
  try {
    jsonUnknown = parseJsonFromText(text, loweredFilename);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    envelope.warnings.push(msg);
    return;
  }

  /** @type {JsonDict} */
  const dict =
    typeof jsonUnknown === "object" && jsonUnknown !== null
      ? /** @type {JsonDict} */ (jsonUnknown)
      : {};

  /** @type {Array<[RegExp, (store: DbStore, json: JsonDict) => void]>} */
  const table = [
    [/^actors\.json$/i, loadActors],
    [/^items\.json$/i, loadItems],
    [/^weapons\.json$/i, loadWeapons],
    [/^armors\.json$/i, loadArmors],
    [/^skills\.json$/i, loadSkills],
    [/^classes\.json$/i, loadClasses],
    [/^states\.json$/i, loadStates],
    [/^mapinfos\.json$/i, loadMapInfos],
    [/^system\.json$/i, loadSystem],
  ];

  const base = basenameLower(loweredFilename);
  /** @returns {boolean} */
  let applied = false;

  for (const [regex, loader] of table) {
    if (regex.test(base)) {
      loader(dbStore, dict);
      applied = true;
      break;
    }
  }

  if (!applied) {
    envelope.warnings.push(`${base}: unrecognized database blob (skipped).`);
  }
}

/** @param {string} pathOrName */
export function basenameLower(pathOrName) {
  const parts = pathOrName.split(/[/\\]/);
  return parts[parts.length - 1]?.toLowerCase?.() ?? pathOrName.toLowerCase();
}

