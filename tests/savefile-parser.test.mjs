import assert from "node:assert/strict";
import test from "node:test";

import { summarizeDecodedSave } from "../src/ingest/SaveFileParser.js";

test("summarizeDecodedSave extracts map, playtime, party count", () => {
  const obj = {
    map: { _displayName: " Forest  " },
    system: { _playtime: " 12:34 " },
    party: {
      _members: {
        _data: [null, 1, 2, ""],
      },
    },
  };
  const s = summarizeDecodedSave(obj);
  assert.equal(s.mapName, "Forest");
  assert.equal(s.playtime, "12:34");
  assert.equal(s.partyCount, 2);
});
