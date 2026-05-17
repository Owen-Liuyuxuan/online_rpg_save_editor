import { encode } from "../codec/SaveCodec.js";

/** @returns {Blob} text/plain utf-8 blob */
export function makeTextBlob(contents) {
  return new Blob([contents], { type: "text/plain;charset=utf-8" });
}

/**
 * Trigger browser save for text payload.
 * @param {string} filename
 * @param {string} text
 */
export function triggerDownload(filename, text) {
  const blob = makeTextBlob(text);
  triggerBlobDownload(filename, blob);
}

/**
 * @param {string} filename
 * @param {Blob} blob
 */
export function triggerBlobDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * LZ-compress RPG Maker MZ save tree.
 * @param {Record<string, unknown>} object
 */
export function exportCompressed(object) {
  return encode(object);
}

/** @typedef {import('../store/SaveStore.js').SaveStore} SaveStore */

/**
 * @param {SaveStore} store
 * @param {string} filename
 */
export function exportSingle(store, filename) {
  const entry = store.get(filename);
  if (!entry) throw new Error("No such save blob loaded.");
  const payload = exportCompressed(entry.object);
  triggerDownload(filename, payload);
}

/**
 * Sequential downloads per dirty entry.
 * @param {SaveStore} store
 */
export function exportAllDirty(store) {
  for (const [name] of store.getDirtyPairs()) {
    exportSingle(store, name);
  }
}
