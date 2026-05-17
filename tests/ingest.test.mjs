import assert from "node:assert/strict";
import test from "node:test";

import { encode } from "../src/codec/SaveCodec.js";
import {
  basenameLower,
  detectFileType,
  ingestFile,
  parseJsonFromText,
} from "../src/ingest/FileIngestor.js";
import { DatabaseStore } from "../src/store/DatabaseStore.js";
import { SaveStore } from "../src/store/SaveStore.js";

function fakeFile(name, text) {
  return new File([text], name, { type: "application/octet-stream" });
}

test("detectFileType classifies uploads", () => {
  assert.equal(detectFileType(fakeFile("file1.rmmzsave", "")), "save-slot");
  assert.equal(detectFileType(fakeFile("global.rmmzsave", "")), "save-global");
  assert.equal(detectFileType(fakeFile("GLOBAL.RMMZSAVE", "")), "save-global");
  assert.equal(detectFileType(fakeFile("config.rmmzdata", "")), "save-config");
  assert.equal(detectFileType(fakeFile("Actors.json", "{}")), "database");
  assert.equal(detectFileType(fakeFile("readme.txt", "")), "ignored");
});

test("basenameLower handles POSIX and Windows paths", () => {
  assert.equal(basenameLower("data/Actors.json"), "actors.json");
  assert.equal(basenameLower("data\\Actors.json"), "actors.json");
});

test("parseJsonFromText throws on invalid JSON", () => {
  assert.throws(() => parseJsonFromText("not json", "x.json"), /invalid JSON/i);
});

test("ingestFile loads slot save into SaveStore", async () => {
  const saveStore = new SaveStore();
  const dbStore = new DatabaseStore();
  const obj = { party: { _gold: 1 }, actors: { _data: [] }, switches: { _data: [] } };
  const raw = encode(obj);
  const res = await ingestFile(saveStore, dbStore, fakeFile("file2.rmmzsave", raw));
  assert.equal(res.kind, "save-slot");
  assert.equal(res.errors.length, 0);
  const entry = saveStore.get("file2.rmmzsave");
  assert(entry);
  assert.deepEqual(entry.object.party, { _gold: 1 });
});

test("ingestFile hydrates database JSON", async () => {
  const saveStore = new SaveStore();
  const dbStore = new DatabaseStore();
  const json = JSON.stringify([null, { name: "A" }, { name: "B" }]);
  const res = await ingestFile(
    saveStore,
    dbStore,
    fakeFile("items.json", json)
  );
  assert.equal(res.kind, "database");
  assert.equal(dbStore.nameForDb("items", 2), "B");
});
