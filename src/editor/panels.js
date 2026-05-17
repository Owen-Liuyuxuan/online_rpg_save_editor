/** @typedef {Record<string, unknown>} Dict */

/**
 * @typedef {{
 * panel: HTMLElement,
 * saveObj: Dict,
 * filename: string,
 * dbStore: import("../store/DatabaseStore.js").DatabaseStore,
 * markDirty: () => void,
 * notify: import("../ui/Notification.js").NotificationBus
 * }} PanelCtx */

import {
  coerceNumber,
  ensureIdQty,
  ensureParty,
  ensureActors,
  ensureSwitches,
  ensureVariables,
  ensureSelfSwitches,
  ensureMap,
  ensurePlayer,
  ensureSystem,
} from "./savePaths.js";


export function blankCard(titleText) {
  const wrap = document.createElement("section");
  wrap.className = "card";
  const heading = document.createElement("h2");
  heading.textContent = titleText;
  wrap.appendChild(heading);
  return wrap;
}

function ledgerTable(ctx, initial, onChange, caption, resolver) {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "1rem";

  const title = document.createElement("h3");
  title.style.margin = "0 0 0.65rem";
  title.textContent = caption;
  wrap.appendChild(title);

  const toolbar = document.createElement("div");
  toolbar.className = "search-row";

  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = `${caption} • filter`;

  const addId = document.createElement("input");
  addId.type = "number";
  addId.min = "1";
  addId.placeholder = "id";

  const addQty = document.createElement("input");
  addQty.type = "number";
  addQty.min = "0";
  addQty.value = "1";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn secondary";
  addBtn.textContent = "Add / update";

  toolbar.append(search, addId, addQty, addBtn);
  wrap.appendChild(toolbar);

  const holder = document.createElement("div");
  holder.className = "table-wrap";
  wrap.appendChild(holder);

  let state = structuredClone(initial ?? {}) ?? {};

  const render = () => {
    holder.innerHTML = "";
    const table = document.createElement("table");
    table.className = "data-table";
    table.innerHTML = "<thead><tr><th>ID</th><th>Name</th><th>Qty</th><th></th></tr></thead>";
    const body = document.createElement("tbody");

    const filter = search.value.trim().toLowerCase();
    const rows = Object.keys(state)
      .map((key) => String(key))
      .filter((id) => {
        if (!filter) return true;
        if (id.toLowerCase().includes(filter)) return true;
        try {
          return resolver(id).toLowerCase().includes(filter);
        } catch {
          return false;
        }
      })
      .sort((a, b) => Number(a) - Number(b));

    rows.forEach((id) => {
      const tr = document.createElement("tr");
      const qty = coerceNumber(state[id], 0);

      const idCell = document.createElement("td");
      idCell.textContent = id;

      const nameCell = document.createElement("td");
      nameCell.textContent = resolver(id);

      const qtyCell = document.createElement("td");
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "0";
      qtyInput.valueAsNumber = qty;
      qtyInput.addEventListener("change", () => {
        const next = coerceNumber(qtyInput.valueAsNumber, 0);
        if (next <= 0) delete state[id];
        else state[id] = next;
        onChange(structuredClone(state));
        ctx.markDirty();
      });

      const actionCell = document.createElement("td");
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn secondary";
      del.textContent = "Remove";
      del.addEventListener("click", () => {
        delete state[id];
        onChange(structuredClone(state));
        ctx.markDirty();
        render();
      });

      qtyCell.appendChild(qtyInput);
      tr.appendChild(idCell);
      tr.appendChild(nameCell);
      tr.appendChild(qtyCell);
      tr.appendChild(actionCell);
      actionCell.appendChild(del);
      body.appendChild(tr);
    });

    table.appendChild(body);
    holder.appendChild(table);
  };

  search.addEventListener("input", render);

  addBtn.addEventListener("click", () => {
    const idNum = coerceNumber(addId.valueAsNumber, 0);
    const id =
      idNum > 0
        ? String(Math.floor(idNum))
        : String(addId.value || "").trim();
    if (!id) return;
    const qty = coerceNumber(addQty.valueAsNumber, 1);
    if (qty <= 0) delete state[id];
    else state[id] = qty;
    addId.value = "";
    onChange(structuredClone(state));
    ctx.markDirty();
    render();
  });

  render();

  return wrap;
}


/** @param {PanelCtx} ctx */
export function renderPartyEditor(ctx) {
  ctx.panel.innerHTML = "";
  const card = blankCard("Party & inventory");
  ctx.panel.appendChild(card);

  const root = ctx.saveObj;
  const party = ensureParty(root);

  const goldBox = document.createElement("div");
  goldBox.className = "field";
  goldBox.innerHTML = "<label for='gold-edit'>Gold</label><input id='gold-edit' type='number' min='0' step='1' />";

  /** @type {HTMLInputElement} */
  const goldInput = goldBox.querySelector("input");
  goldInput.valueAsNumber = coerceNumber(party._gold, 0);
  goldInput.addEventListener("change", () => {
    party._gold = goldInput.valueAsNumber;
    ctx.markDirty();
  });

  card.appendChild(goldBox);

  card.appendChild(
    ledgerTable(
      ctx,
      ensureIdQty(party._items ?? {}),
      (next) => {
        party._items = next;
      },
      "Items",
      (id) =>
        typeof ctx.dbStore.items !== "undefined"
          ? ctx.dbStore.nameForDb("items", Number(id))
          : `Item ${id}`
    )
  );

  card.appendChild(
    ledgerTable(
      ctx,
      ensureIdQty(party._weapons ?? {}),
      (next) => {
        party._weapons = next;
      },
      "Weapons",
      (id) =>
        typeof ctx.dbStore.weapons !== "undefined"
          ? ctx.dbStore.nameForDb("weapons", Number(id))
          : `Weapon ${id}`
    )
  );

  card.appendChild(
    ledgerTable(
      ctx,
      ensureIdQty(party._armors ?? {}),
      (next) => {
        party._armors = next;
      },
      "Armors",
      (id) =>
        typeof ctx.dbStore.armors !== "undefined"
          ? ctx.dbStore.nameForDb("armors", Number(id))
          : `Armor ${id}`
    )
  );
}

/** @returns {number} */
function deriveSpan(arr) {
  if (!Array.isArray(arr)) return 200;
  return Math.min(Math.max(arr.length - 1, 64), 400);
}
/** @param {PanelCtx} ctx */
export function renderSwitchEditor(ctx) {
  ctx.panel.innerHTML = "";
  const card = blankCard("Switches");
  const swObj = ensureSwitches(ctx.saveObj);

  /** @type {unknown[]} */
  const data = Array.isArray(swObj._data) ? swObj._data : (swObj._data = []);

  const info = document.createElement("p");
  info.className = "status-bar";
  info.textContent =
    "Switches persist as `_data[ID]` booleans (`null`/false/true). Searching uses System.json captions when uploaded.";
  card.appendChild(info);

  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Filter by id or caption";
  search.className = "toolbar";
  card.appendChild(search);

  let span = deriveSpan(data);
  if (ctx.dbStore.switches instanceof Map && ctx.dbStore.switches.size) {
    span = Math.max(span, [...ctx.dbStore.switches.keys()].reduce((m, k) => Math.max(m, k), 1));
  }

  const holder = document.createElement("div");
  holder.className = "table-wrap";

  /** @ignore */
  const renderRows = () => {
    holder.innerHTML = "";
    const table = document.createElement("table");
    table.className = "data-table";
    table.innerHTML = "<thead><tr><th>ID</th><th>Name</th><th>State</th></tr></thead>";
    const body = document.createElement("tbody");

    const filter = search.value.trim().toLowerCase();

    for (let id = 1; id <= span; id += 1) {
      const label = ctx.dbStore.switchName(id);
      if (filter) {
        const hay = `${id} ${label}`.toLowerCase();
        if (!hay.includes(filter)) continue;
      }

      const tr = document.createElement("tr");
      const idCell = document.createElement("td");
      idCell.textContent = String(id);
      const nameCell = document.createElement("td");
      nameCell.textContent = label || `Switch ${id}`;

      const stateCell = document.createElement("td");
      const select = document.createElement("select");
      select.innerHTML = `<option value='inherit'>Default</option><option value='false'>OFF</option><option value='true'>ON</option>`;

      const current = data[id];
      if (current === true) select.value = "true";
      else if (current === false) select.value = "false";
      else select.value = "inherit";

      select.addEventListener("change", () => {
        while (data.length <= id) data.push(null);
        if (select.value === "inherit") data[id] = null;
        else data[id] = select.value === "true";
        ctx.markDirty();
      });

      stateCell.appendChild(select);
      tr.appendChild(idCell);
      tr.appendChild(nameCell);
      tr.appendChild(stateCell);
      body.appendChild(tr);
    }

    table.appendChild(body);
    holder.appendChild(table);
  };

  const growRow = document.createElement("div");
  growRow.className = "toolbar";
  const growInput = document.createElement("input");
  growInput.type = "number";
  growInput.min = "1";
  growInput.placeholder = "extend up to id";
  const growBtn = document.createElement("button");
  growBtn.type = "button";
  growBtn.className = "btn secondary";
  growBtn.textContent = "Extend table";
  growBtn.addEventListener("click", () => {
    const target = coerceNumber(growInput.valueAsNumber, 0);
    if (target <= span) return;
    span = Math.floor(target);
    renderRows();
  });
  growRow.appendChild(growInput);
  growRow.appendChild(growBtn);
  card.appendChild(growRow);

  search.addEventListener("input", renderRows);

  card.appendChild(holder);
  renderRows();

  ctx.panel.appendChild(card);
}


/** @param {PanelCtx} ctx */
export function renderVariableEditor(ctx) {
  ctx.panel.innerHTML = "";
  const card = blankCard("Variables");
  const vars = ensureVariables(ctx.saveObj);

  /** @type {unknown[]} */
  const data = Array.isArray(vars._data) ? vars._data : (vars._data = []);

  const helper = document.createElement("p");
  helper.className = "status-bar";
  helper.textContent =
    "Values map to `_data[ID]`. Leave blank to inherit `null`. Non-numeric text is stored verbatim.";
  card.appendChild(helper);

  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Filter by id / caption / value";
  card.appendChild(search);

  let span = deriveSpan(data);
  if (ctx.dbStore.variables instanceof Map && ctx.dbStore.variables.size) {
    span = Math.max(span, [...ctx.dbStore.variables.keys()].reduce((m, k) => Math.max(m, k), 1));
  }

  const holder = document.createElement("div");
  holder.className = "table-wrap";

  const coerceValue = (txt) => {
    const trimmed = txt.trim();
    if (!trimmed) return null;
    if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
    if (/^-?\d+\.\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  };

  const renderRows = () => {
    holder.innerHTML = "";
    const table = document.createElement("table");
    table.className = "data-table";
    table.innerHTML =
      "<thead><tr><th>ID</th><th>Name</th><th>Value</th></tr></thead>";
    const body = document.createElement("tbody");
    const filter = search.value.trim().toLowerCase();

    for (let id = 1; id <= span; id += 1) {
      const caption = ctx.dbStore.variableName(id);
      const stored = data[id];
      const textual =
        stored === null || stored === undefined ? "" : String(stored);
      if (filter) {
        const hay = `${id} ${caption} ${textual}`.toLowerCase();
        if (!hay.includes(filter)) continue;
      }

      const tr = document.createElement("tr");
      const idCell = document.createElement("td");
      idCell.textContent = String(id);
      const nameCell = document.createElement("td");
      nameCell.textContent = caption || `Variable ${id}`;

      const valueCell = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.value = textual;
      input.spellcheck = false;
      input.addEventListener("change", () => {
        while (data.length <= id) data.push(null);
        data[id] = coerceValue(input.value);
        ctx.markDirty();
      });

      valueCell.appendChild(input);
      tr.appendChild(idCell);
      tr.appendChild(nameCell);
      tr.appendChild(valueCell);
      body.appendChild(tr);
    }

    table.appendChild(body);
    holder.appendChild(table);
  };

  const growRow = document.createElement("div");
  growRow.className = "toolbar";
  const growInput = document.createElement("input");
  growInput.type = "number";
  growInput.min = "1";
  const growBtn = document.createElement("button");
  growBtn.type = "button";
  growBtn.className = "btn secondary";
  growBtn.textContent = "Extend table";
  growBtn.addEventListener("click", () => {
    const target = coerceNumber(growInput.valueAsNumber, 0);
    if (target <= span) return;
    span = Math.floor(target);
    renderRows();
  });
  growRow.appendChild(growInput);
  growRow.appendChild(growBtn);
  card.appendChild(growRow);

  search.addEventListener("input", renderRows);

  card.appendChild(holder);
  renderRows();
  ctx.panel.appendChild(card);
}


/** @param {PanelCtx} ctx */
export function renderMapEditor(ctx) {
  ctx.panel.innerHTML = "";
  const card = blankCard("Map & player");
  const mapObj = ensureMap(ctx.saveObj);
  const playerObj = ensurePlayer(ctx.saveObj);

  const wrap = document.createElement("div");

  const addNumber = (caption, target, key) => {
    const row = document.createElement("label");
    row.className = "field";
    row.innerHTML = `<span>${caption}</span>`;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.valueAsNumber = coerceNumber(target[key], 0);
    input.addEventListener("change", () => {
      target[key] = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 0;
      ctx.markDirty();
    });
    row.appendChild(input);
    wrap.appendChild(row);
  };

  const addText = (caption, target, key) => {
    const row = document.createElement("label");
    row.className = "field";
    row.innerHTML = `<span>${caption}</span>`;
    const input = document.createElement("input");
    input.type = "text";
    input.value =
      typeof target[key] === "string" ? /** @type {string} */ (target[key]) : String(target[key] ?? "");
    input.addEventListener("change", () => {
      target[key] = input.value;
      ctx.markDirty();
    });
    row.appendChild(input);
    wrap.appendChild(row);
  };

  addNumber("Map database ID (_mapId)", mapObj, "_mapId");
  addText("Displayed map name (_displayName)", mapObj, "_displayName");
  addNumber("Player X (_realX / _x simplified as _x)", playerObj, "_x");
  addNumber("Player Y (_y)", playerObj, "_y");
  addNumber("Facing (2 down,4 left,6 right,8 up)", playerObj, "_direction");

  card.appendChild(wrap);
  ctx.panel.appendChild(card);
}


/** @param {PanelCtx} ctx */
export function renderSystemEditor(ctx) {
  ctx.panel.innerHTML = "";
  const card = blankCard("System flags");
  const sys = ensureSystem(ctx.saveObj);

  const fields = [
    ["Save enabled", "_saveEnabled", "bool"],
    ["Menu enabled", "_menuEnabled", "bool"],
    ["Encounter enabled", "_encounterEnabled", "bool"],
    ["Battle count", "_battleCount", "number"],
    ["Win count", "_winCount", "number"],
    ["Escape count", "_escapeCount", "number"],
    ["Playtime string", "_playtime", "text"],
  ];

  fields.forEach(([label, key, kind]) => {
    const row = document.createElement("label");
    row.className = "field";
    row.innerHTML = `<span>${label}</span>`;
    if (kind === "bool") {
      const select = document.createElement("select");
      select.innerHTML = `<option value=''>Default</option><option value='true'>ON</option><option value='false'>OFF</option>`;
      const val = sys[key];
      if (val === true) select.value = "true";
      else if (val === false) select.value = "false";
      select.addEventListener("change", () => {
        if (select.value === "") delete sys[key];
        else sys[key] = select.value === "true";
        ctx.markDirty();
      });
      row.appendChild(select);
    } else if (kind === "number") {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.valueAsNumber = coerceNumber(sys[key], 0);
      input.addEventListener("change", () => {
        sys[key] = input.valueAsNumber;
        ctx.markDirty();
      });
      row.appendChild(input);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.value = String(sys[key] ?? "");
      input.addEventListener("change", () => {
        sys[key] = input.value;
        ctx.markDirty();
      });
      row.appendChild(input);
    }

    card.appendChild(row);
  });

  ctx.panel.appendChild(card);
}

/** @param {PanelCtx} ctx */
export function renderSelfSwitchEditor(ctx) {
  ctx.panel.innerHTML = "";
  const card = blankCard("Self switches");

  const helper = document.createElement("p");
  helper.className = "status-bar";
  helper.textContent =
    "Keys look like `mapId,eventId,letter` (`1,12,A`). Editing is advanced—double-check in-game.";
  card.appendChild(helper);

  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Filter keys / values";
  card.appendChild(search);

  const holder = document.createElement("div");
  holder.className = "table-wrap";

  const selfBlock = ensureSelfSwitches(ctx.saveObj);

  if (
    !selfBlock._data ||
    typeof selfBlock._data !== "object" ||
    Array.isArray(selfBlock._data)
  ) {
    selfBlock._data = {};
  }

  /** @type { Dict }*/
  const dict = /** @type { Dict } */ (selfBlock._data);

  const redraw = () => {
    holder.innerHTML = "";
    const table = document.createElement("table");
    table.className = "data-table";
    table.innerHTML = "<thead><tr><th>Key</th><th>Value</th><th /></tr></thead>";
    const tbody = document.createElement("tbody");
    const filter = search.value.trim().toLowerCase();

    Object.keys(dict)
      .sort()
      .forEach((key) => {
        const val = dict[key];
        const label = `${key} => ${val}`;
        if (filter && !label.toLowerCase().includes(filter)) return;

        const tr = document.createElement("tr");
        const keyCell = document.createElement("td");
        keyCell.textContent = key;
        const valueCell = document.createElement("td");
        const input = document.createElement("select");
        input.innerHTML =
          "<option value='inherit'>Default</option><option value='true'>TRUE</option><option value='false'>FALSE</option>";
        input.value =
          val === true ? "true" : val === false ? "false" : "inherit";
        input.addEventListener("change", () => {
          if (input.value === "inherit") delete dict[key];
          else dict[key] = input.value === "true";
          selfBlock._data = dict;
          ctx.markDirty();
        });

        valueCell.appendChild(input);

        const action = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn secondary";
        delBtn.textContent = "Drop";
        delBtn.addEventListener("click", () => {
          delete dict[key];
          selfBlock._data = dict;
          ctx.markDirty();
          redraw();
        });

        tr.appendChild(keyCell);
        tr.appendChild(valueCell);
        tr.appendChild(action);
        action.appendChild(delBtn);
        tbody.appendChild(tr);
      });

    table.appendChild(tbody);
    holder.appendChild(table);
  };

  const addRow = document.createElement("div");
  addRow.className = "toolbar";
  const keyInput = document.createElement("input");
  keyInput.placeholder = "mapId,eventId,A";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn secondary";
  addBtn.textContent = "Insert key";
  addBtn.addEventListener("click", () => {
    const key = keyInput.value.trim();
    if (!key) return;
    dict[key] = true;
    selfBlock._data = dict;
    ctx.markDirty();
    redraw();
    keyInput.value = "";
  });
  addRow.appendChild(keyInput);
  addRow.appendChild(addBtn);
  card.appendChild(addRow);

  search.addEventListener("input", redraw);
  card.appendChild(holder);
  redraw();

  ctx.panel.appendChild(card);
}



/** @param {PanelCtx} ctx */
export function renderActorEditor(ctx) {
  ctx.panel.innerHTML = "";
  const card = blankCard("Actors");
  const actors = ensureActors(ctx.saveObj);
  /** @type {unknown[]} */
  const data = Array.isArray(actors._data) ? actors._data : (actors._data = []);

  const ids = [];
  for (let i = 1; i < data.length; i += 1) {
    if (data[i]) ids.push(i);
  }

  if (!ids.length) {
    const empty = document.createElement("p");
    empty.textContent = "No actor instances serialized in `_data`.";
    card.appendChild(empty);
    ctx.panel.appendChild(card);
    return;
  }

  const picker = document.createElement("label");
  picker.className = "field";
  picker.innerHTML = "<span>Actor slot</span>";
  const select = document.createElement("select");
  ids.forEach((id) => {
    const option = document.createElement("option");
    option.value = String(id);
    const row = data[id];
    const label =
      typeof row === "object" && row && "_actorId" in /** @type {object} */ (row)
        ? `Actor db #${String(/** @type {Dict} */ (row)._actorId)}`
        : `Slot ${id}`;
    option.textContent = label;
    select.appendChild(option);
  });
  picker.appendChild(select);
  card.appendChild(picker);

  const form = document.createElement("div");
  form.style.marginTop = "1rem";
  card.appendChild(form);

  const bindNumber = (labelText, key) => {
    const row = document.createElement("label");
    row.className = "field";
    row.innerHTML = `<span>${labelText}</span>`;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    row.appendChild(input);

    const refresh = () => {
      const id = Number(select.value);
      const actor = data[id];
      if (!actor || typeof actor !== "object") return;
      const dict = /** @type {Dict} */ (actor);
      input.valueAsNumber = coerceNumber(dict[key], 0);
    };

    input.addEventListener("change", () => {
      const id = Number(select.value);
      const actor = data[id];
      if (!actor || typeof actor !== "object") return;
      const dict = /** @type {Dict} */ (actor);
      dict[key] = input.valueAsNumber;
      ctx.markDirty();
    });

    select.addEventListener("change", refresh);
    form.appendChild(row);
    refresh();
  };

  bindNumber("Level (_level)", "_level");
  bindNumber("HP (_hp)", "_hp");
  bindNumber("MP (_mp)", "_mp");
  bindNumber("TP (_tp)", "_tp");

  ctx.panel.appendChild(card);
}

/** @param {PanelCtx} ctx */
export function renderRawJsonEditor(ctx) {
  ctx.panel.innerHTML = "";
  const card = blankCard("Raw JSON");
  const warn = document.createElement("p");
  warn.className = "status-bar";
  warn.textContent =
    "Danger zone: broken JSON can corrupt the save. Always keep a backup copy outside the editor.";
  card.appendChild(warn);

  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  const ta = document.createElement("textarea");
  ta.className = "code";
  ta.spellcheck = false;

  const beautify = document.createElement("button");
  beautify.type = "button";
  beautify.className = "btn secondary";
  beautify.textContent = "Beautify";

  const minify = document.createElement("button");
  minify.type = "button";
  minify.className = "btn secondary";
  minify.textContent = "Minify";

  const validateBtn = document.createElement("button");
  validateBtn.type = "button";
  validateBtn.className = "btn secondary";
  validateBtn.textContent = "Validate";

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.className = "btn primary";
  applyBtn.textContent = "Apply to save";

  toolbar.append(beautify, minify, validateBtn, applyBtn);
  card.appendChild(toolbar);
  card.appendChild(ta);

  const syncFromObject = () => {
    ta.value = JSON.stringify(ctx.saveObj, null, 2);
  };

  syncFromObject();

  beautify.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(ta.value);
      ta.value = JSON.stringify(parsed, null, 2);
      ctx.notify.show("info", "Beautified JSON.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.notify.show("error", `Beautify failed: ${msg}`);
    }
  });

  minify.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(ta.value);
      ta.value = JSON.stringify(parsed);
      ctx.notify.show("info", "Minified JSON.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.notify.show("error", `Minify failed: ${msg}`);
    }
  });

  validateBtn.addEventListener("click", () => {
    try {
      JSON.parse(ta.value);
      ctx.notify.show("info", "JSON syntax OK.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.notify.show("error", `Invalid JSON: ${msg}`);
    }
  });

  applyBtn.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(ta.value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Root must be a JSON object.");
      }
      Object.keys(ctx.saveObj).forEach((key) => delete ctx.saveObj[key]);
      Object.assign(ctx.saveObj, parsed);
      ctx.markDirty();
      ctx.notify.show("info", "Applied JSON into working copy.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.notify.show("error", `Apply failed: ${msg}`);
    }
  });

  ctx.panel.appendChild(card);
}

/** @param {string} tab @param {PanelCtx} ctx */
export function renderEditorTab(tab, ctx) {
  switch (tab) {
    case "party":
      renderPartyEditor(ctx);
      break;
    case "actors":
      renderActorEditor(ctx);
      break;
    case "switches":
      renderSwitchEditor(ctx);
      break;
    case "variables":
      renderVariableEditor(ctx);
      break;
    case "map":
      renderMapEditor(ctx);
      break;
    case "system":
      renderSystemEditor(ctx);
      break;
    case "self":
      renderSelfSwitchEditor(ctx);
      break;
    case "raw":
      renderRawJsonEditor(ctx);
      break;
    default:
      ctx.panel.innerHTML = `<p class='status-bar'>Unknown tab: ${tab}</p>`;
  }
}

