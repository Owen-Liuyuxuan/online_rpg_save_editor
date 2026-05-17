import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";

import { decode, encode } from "../src/codec/SaveCodec.js";
import { buildDirtyZipBlob } from "../src/export/BatchExporter.js";
import { exportCompressed } from "../src/export/SaveExporter.js";
import { SaveStore } from "../src/store/SaveStore.js";

test("exportCompressed matches encode", () => {
  const o = { x: 1, nested: { y: 2 } };
  assert.equal(exportCompressed(o), encode(o));
});

test("buildDirtyZipBlob contains compressed filenames", async () => {
  const store = new SaveStore();
  const obj = { party: { _gold: 1 }, actors: { _data: [] }, switches: { _data: [] } };
  const raw = encode(obj);
  store.load("file1.rmmzsave", raw, obj);
  store.set("file1.rmmzsave", { ...obj, party: { _gold: 42 } });

  const { blob, filenames } = await buildDirtyZipBlob(JSZip, store, encode);
  assert.deepEqual(filenames, ["file1.rmmzsave"]);

  const buf = Buffer.from(await blob.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const inner = await zip.file("file1.rmmzsave")?.async("string");
  assert(inner);
  const { object } = decode(inner);
  assert.deepEqual(object.party, { _gold: 42 });
});
