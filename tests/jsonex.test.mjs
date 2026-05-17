import assert from "node:assert/strict";
import test from "node:test";

import {
  cloneJson,
  shallowAssignPreserveMeta,
  stripMetadataDeep,
} from "../src/codec/JsonExCompat.js";

test("stripMetadataDeep removes @ keys recursively", () => {
  const input = {
    a: 1,
    "@class": "Game_Party",
    nested: {
      b: 2,
      "@c": 99,
      inner: [{ "@r": 1, ok: true }],
    },
  };
  const out = stripMetadataDeep(input);
  assert.deepEqual(out, {
    a: 1,
    nested: { b: 2, inner: [{ ok: true }] },
  });
});

test("cloneJson round-trip for plain data", () => {
  const v = { x: [1, { y: 2 }] };
  assert.deepEqual(cloneJson(v), v);
  assert.notStrictEqual(cloneJson(v), v);
});

test("shallowAssignPreserveMeta copies keys onto target", () => {
  /** @type {Record<string, unknown>} */
  const tgt = { a: 1, "@class": "K" };
  shallowAssignPreserveMeta(tgt, { b: 2, a: 3 });
  assert.deepEqual(tgt, { a: 3, b: 2, "@class": "K" });
});
