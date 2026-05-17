import { decode as codecDecode } from "../codec/SaveCodec.js";

/** Map of loaded save blobs + decoded objects with dirty/original bookkeeping. */
export class SaveStore {
  constructor() {
    /** @type {Map<string, { object: Record<string, unknown>, rawCompressed: string }>} */
    this._entries = new Map();
    /** @type {Set<string>} */
    this._dirty = new Set();
  }

  /**
   * @param {string} filename
   * @param {string} rawCompressed
   * @param {Record<string, unknown>} object
   */
  load(filename, rawCompressed, object) {
    const key = normalizeName(filename);
    this._entries.set(key, {
      rawCompressed: String(rawCompressed),
      object,
    });
    this._dirty.delete(key);
  }

  /** @returns {IterableIterator<string>} */
  listFilenames() {
    return this._entries.keys();
  }

  /** @returns {{ filename: string, kind: SaveKind, dirty: boolean, label: string }[]} */
  listSummary() {
    /** @typedef {'slot'|'global'|'config'|'misc'} SaveKind */

    /** @returns {SaveKind} */
    const classify = (/** @type {string} */ filename) => {
      const lc = filename.toLowerCase();
      if (lc === "global.rmmzsave") return "global";
      if (lc === "config.rmmzsave") return "config";
      if (/\.rmmzsave$/i.test(filename) || /\.rmmzdata$/i.test(filename)) return "slot";
      return "misc";
    };

    /** @returns {number} */
    const sortKey = (/** @type {string} */ name) => {
      const lc = name.toLowerCase();
      if (lc === "global.rmmzsave") return -2;
      if (lc === "config.rmmzsave") return -1;
      const m = /^file(\d+)\.rmmz(save|data)$/i.exec(name);
      return m ? Number(m[1]) : 998;
    };

    return [...this._entries.entries()]
      .map(([filename]) => {
        const label = prettifyFilename(filename);
        const kind = classify(filename);
        return {
          filename,
          label,
          kind,
          dirty: this._dirty.has(filename),
        };
      })
      .sort((a, b) => {
        const sa = sortKey(a.filename);
        const sb = sortKey(b.filename);
        if (sa !== sb) return sa - sb;
        return a.filename.localeCompare(b.filename);
      });
  }

  /**
   * @param {string} filename
   * @returns {{ object: Record<string, unknown>, rawCompressed: string } | undefined}
   */
  get(filename) {
    const key = normalizeName(filename);
    return this._entries.get(key);
  }

  /**
   * @param {string} filename
   * @param {Record<string, unknown>} object
   */
  set(filename, object) {
    const key = normalizeName(filename);
    const cur = this._entries.get(key);
    if (!cur) throw new Error(`Unknown save entry: ${filename}`);
    cur.object = object;
    this._dirty.add(key);
  }

  /**
   * @param {string} filename
   */
  markDirty(filename) {
    const key = normalizeName(filename);
    if (this._entries.has(key)) this._dirty.add(key);
  }

  /**
   * Restore decoded object from the original LZ payload.
   * @param {string} filename
   */
  reset(filename) {
    const key = normalizeName(filename);
    const cur = this._entries.get(key);
    if (!cur) return;
    const { object } = codecDecode(cur.rawCompressed);
    cur.object = object;
    this._dirty.delete(key);
  }

  /**
   * @param {string} filename
   * @returns {boolean}
   */
  isDirty(filename) {
    return this._dirty.has(normalizeName(filename));
  }

  /** @returns {IterableIterator<[string, { object: Record<string, unknown>, rawCompressed: string }]> } */
  entries() {
    return this._entries.entries();
  }

  /** @returns {[string,{ object: Record<string, unknown>, rawCompressed: string }][]} */
  getDirtyPairs() {
    return [...this._entries.entries()].filter(([name]) => this._dirty.has(name));
  }

  /** Drop every loaded save blob (database JSON is kept in DatabaseStore, not here). */
  clearSaves() {
    this._entries.clear();
    this._dirty.clear();
  }

  drop(filename) {
    const key = normalizeName(filename);
    this._entries.delete(key);
    this._dirty.delete(key);
  }
}

function normalizeName(name) {
  return name.trim();
}

/** @param {string} name */
function prettifyFilename(name) {
  const lc = name.toLowerCase();
  if (lc === "global.rmmzsave") return "Global meta";
  if (lc === "config.rmmzsave") return "Player config";
  const m = /^file(\d+)\.rmmz(save|data)$/i.exec(name);
  if (m) return `Slot ${m[1]}`;
  return name;
}
