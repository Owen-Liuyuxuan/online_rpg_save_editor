import assert from "node:assert/strict";
import test from "node:test";

import { encode } from "../src/codec/SaveCodec.js";
import { SaveStore } from "../src/store/SaveStore.js";

test("SaveStore tracks dirty and reset restores original", () => {
  const initial = { party: { _gold: 10 } };
  const raw = encode(initial);
  const store = new SaveStore();
  store.load("file1.rmmzsave", raw, initial);
  assert.equal(store.isDirty("file1.rmmzsave"), false);

  const modified = { party: { _gold: 999 } };
  store.set("file1.rmmzsave", modified);
  assert.equal(store.isDirty("file1.rmmzsave"), true);

  store.reset("file1.rmmzsave");
  const entry = store.get("file1.rmmzsave");
  assert(entry);
  assert.deepEqual(entry.object.party, { _gold: 10 });
  assert.equal(store.isDirty("file1.rmmzsave"), false);
});

test("listSummary orders global, config, then numbered slots", () => {
  const store = new SaveStore();
  store.load(
    "file3.rmmzsave",
    encode({ a: 3 }),
    /** @type {Record<string, unknown>} */ ({ a: 3 })
  );
  store.load(
    "global.rmmzsave",
    encode({ g: 1 }),
    /** @type {Record<string, unknown>} */ ({ g: 1 })
  );
  store.load(
    "config.rmmzsave",
    encode({ c: 1 }),
    /** @type {Record<string, unknown>} */ ({ c: 1 })
  );
  store.load(
    "file1.rmmzsave",
    encode({ a: 1 }),
    /** @type {Record<string, unknown>} */ ({ a: 1 })
  );
  const names = store.listSummary().map((s) => s.filename);
  assert.deepEqual(names, [
    "global.rmmzsave",
    "config.rmmzsave",
    "file1.rmmzsave",
    "file3.rmmzsave",
  ]);
});
