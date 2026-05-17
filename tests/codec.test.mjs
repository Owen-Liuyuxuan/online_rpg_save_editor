import assert from "node:assert/strict";
import test from "node:test";
import LZString from "lz-string";

import { decode, encode, validate } from "../src/codec/SaveCodec.js";

test("decode + encode round-trip preserves object shape", () => {
  const original = {
    party: { _gold: 123 },
    switches: { _data: [null, true, false] },
    actors: { _data: [] },
  };
  const compressed = encode(original);
  const { object, jsonText } = decode(compressed);
  assert.deepEqual(object, original);
  assert.equal(jsonText, JSON.stringify(original));
});

test("decode rejects empty input", () => {
  assert.throws(() => decode(""), /empty/i);
  assert.throws(() => decode("   "), /empty/i);
});

test("decode rejects invalid LZ payload", () => {
  assert.throws(() => decode("not-valid-lz-payload-!!!"), /decompress failed|not valid JSON/i);
});

test("decode rejects JSON syntax error after decompress", () => {
  const badJson = "{ this is not json";
  const broken = LZString.compressToBase64(badJson);
  assert.throws(() => decode(broken), /not valid JSON/i);
});

test("decode rejects non-object root", () => {
  const compressed = LZString.compressToBase64("[1,2,3]");
  assert.throws(() => decode(compressed), /object at the root/i);
});

test("validate slot warns when expected keys missing", () => {
  const v = validate({}, "slot");
  assert.equal(v.valid, true);
  assert.match(v.warnings.join(" "), /Missing common slot keys/i);
});

test("validate slot passes with several hint keys", () => {
  const rich = {
    party: {},
    switches: {},
    variables: {},
    actors: {},
    map: {},
    player: {},
    system: {},
  };
  const v = validate(rich, "slot");
  assert.equal(v.valid, true);
  assert.equal(v.errors.length, 0);
  assert.equal(
    v.warnings.filter((w) => /Missing common slot keys/i.test(w)).length,
    0
  );
});

test("validate rejects non-object root", () => {
  const v = validate(null, "slot");
  assert.equal(v.valid, false);
});
