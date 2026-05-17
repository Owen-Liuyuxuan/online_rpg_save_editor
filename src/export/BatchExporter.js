import { triggerBlobDownload } from "./SaveExporter.js";

/**
 * @param {unknown} ctor
 */
function assertCtor(ctor) {
  if (!ctor || typeof ctor !== "function") {
    throw new Error(
      'JSZip is not loaded. Include vendor/jszip.min.js before using "Download all as zip".'
    );
  }
}

/**
 * Build a zip of every dirty save entry (no DOM).
 * @param {unknown} ctor
 * @param {import("../store/SaveStore.js").SaveStore} saveStore
 * @param {(obj: Record<string, unknown>) => string} compressor
 * @returns {Promise<{ blob: Blob; filenames: string[] }>}
 */
export async function buildDirtyZipBlob(ctor, saveStore, compressor) {
  assertCtor(ctor);
  /** @type {new ()=> any} */
  const JSZipCtor = ctor;
  const zip = new JSZipCtor();
  /** @type {string[]} */
  const filenames = [];
  for (const [name] of saveStore.getDirtyPairs()) {
    const entry = saveStore.get(name);
    if (!entry) continue;
    zip.file(name, compressor(entry.object), { binary: false });
    filenames.push(name);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filenames };
}

/**
 * Zip every dirty MZ save currently tracked.
 * @param {unknown} ctor
 * @param {import("../store/SaveStore.js").SaveStore} saveStore
 * @param {(obj: Record<string, unknown>) => string} compressor
 */
export async function zipDirtySaves(ctor, saveStore, compressor) {
  const { blob } = await buildDirtyZipBlob(ctor, saveStore, compressor);
  triggerBlobDownload("modified_saves.zip", blob);
}
