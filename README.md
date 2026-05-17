# RPG Maker MZ Save Editor

Static, client-only editor for decompressing MZ slot saves (`*.rmmzsave` / `*.rmmzdata`), tweaking common fields, then re‑compressing with the same LZString Base64 codec the engine expects.

## Quick start

1. Serve this folder locally (any static server) **or** open via GitHub Pages after publishing.
2. Drop one or more save files onto the dashed upload pane.
3. *(Optional)* upload `Actors.json`, `Items.json`, `System.json`, `MapInfos.json`, etc. so tables show friendly captions.
4. Use the sidebar tabs (`Party`, `Switches`, `Variables`, …) or the **Raw JSON** escape hatch for plugin data.

> Always duplicate your saves elsewhere before editing encrypted or heavily modded titles.

### Vendored bits

Runtime bundles ship from this repo (no CDN calls):

| File                    | Purpose                         | Version pinned in `package.json` |
| ----------------------- | ------------------------------- | -------------------------------- |
| `vendor/lz-string.min.js` | Matches RPG Maker’s compression helpers | `lz-string` devDependency (`^1.5.0`) |
| `vendor/jszip.min.js`     | “Zip dirty saves” exporter      | `jszip` devDependency (`^3.10.1`) |

`npm install` only exists so automated tests reuse the npm builds; Pages deploy skips `node_modules`.

## Tests / tooling

```bash
npm test
```

The suite covers codec round-trip, database JSON parsing helpers, and the lightweight save mutators.

## Limitations / caveats

- Browser-only saves (localStorage) are not magically exported—copy them out with devtools or play on desktop NW.js builds (`save/` folder shows real `.rmmzsave` files).
- Plugin-specific encryption or bespoke serialization falls back to Raw JSON edits; malformed JSON corrupts payloads.
- MZ still expects JsonEx-compatible metadata blobs; structured editors mutate only well-known `_foo` buckets and leave unspecified keys untouched.

## Architecture map

Codec + ingest helpers live under `src/codec` and `src/ingest`. Editors are aggregated in [`src/editor/panels.js`](src/editor/panels.js) with shared guards in [`src/editor/savePaths.js`](src/editor/savePaths.js). UI bootstrap is [`src/main.js`](src/main.js).

## Deploy

[`/.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) uses `peaceiris/actions-gh-pages` to mirror the repo root while excluding tooling cruft (`node_modules`, `.github`, `tests`, etc.).
