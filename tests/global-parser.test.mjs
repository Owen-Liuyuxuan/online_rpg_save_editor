import assert from "node:assert/strict";
import test from "node:test";

import { encode } from "../src/codec/SaveCodec.js";
import { extractGlobalHints, parseGlobalCompressed } from "../src/ingest/GlobalParser.js";

test("extractGlobalHints reads _saveinfos", () => {
  const decoded = {
    _saveinfos: [
      {
        title: "Slot A",
        mapName: "Town",
        playtime: "1:00:00",
        filename: "file1.rmmzsave",
      },
    ],
  };
  const hints = extractGlobalHints(decoded);
  assert.equal(hints.length, 1);
  assert.equal(hints[0].filename, "file1.rmmzsave");
  assert.equal(hints[0].title, "Slot A");
  assert.equal(hints[0].map, "Town");
});

test("parseGlobalCompressed returns object and previews", () => {
  const root = {
    _saveinfos: [
      { title: "T", mapDisplayName: "M", playtime: "0:00", filename: "file1.rmmzsave" },
    ],
  };
  const compressed = encode(root);
  const { object, previews } = parseGlobalCompressed(compressed);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].map, "M");
  assert.deepEqual(object._saveinfos, root._saveinfos);
});
