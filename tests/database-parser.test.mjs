import assert from "node:assert/strict";
import test from "node:test";

import { loadActors, loadMapInfos, loadSystem } from "../src/ingest/DatabaseParser.js";
import { DatabaseStore } from "../src/store/DatabaseStore.js";

test("loadActors builds id → name map (index-based)", () => {
  const store = new DatabaseStore();
  /** @type {Record<string, unknown>} */
  const json = [
    null,
    { name: "—" },
    { name: "  Hero  " },
  ];
  loadActors(store, json);
  assert.equal(store.nameForDb("actors", 2), "Hero");
  assert.match(store.nameForDb("actors", 99), /^ID /);
});

test("loadSystem fills switch and variable captions", () => {
  const store = new DatabaseStore();
  /** @type {Record<string, unknown>} */
  const json = {
    switches: ["", "", "QuestDone", ""],
    variables: ["", "", "Score"],
  };
  loadSystem(store, json);
  assert.equal(store.switchName(2), "QuestDone");
  assert.equal(store.variableName(2), "Score");
  assert.equal(store.systemLoaded, true);
});

test("mapName uses MapInfos labels", () => {
  const store = new DatabaseStore();
  loadMapInfos(store, [
    null,
    { id: 1, name: "Town" },
    { id: 5, name: "Dungeon" },
  ]);
  assert.equal(store.mapName(5), "Dungeon");
});
