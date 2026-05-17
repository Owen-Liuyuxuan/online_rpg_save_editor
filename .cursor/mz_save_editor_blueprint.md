# RPG Maker MZ Save File Editor — Top-Level System Design

This document serves as the orchestral planning blueprint for a coding agent to implement a fully static, GitHub Pages–deployable RPG Maker MZ save file editor.

---

## 1. Project Philosophy & Constraints

### 1.1 Core Constraints

| Constraint | Detail |
|---|---|
| **Static only** | No backend server. All logic runs in the browser. |
| **GitHub Pages compatible** | Pure HTML/CSS/JS, no server-side rendering |
| **Zero dependency on external APIs** | All processing is client-side |
| **File I/O** | Browser File API for upload; `Blob` + `<a>` download for export |
| **Compression** | LZString (same as RPG Maker MZ runtime) |
| **Serialization** | JSON (RPG Maker MZ `JsonEx` compatible) |

### 1.2 Design Philosophy

```text
Minimal external dependencies
→ Prefer vanilla JS or lightweight libraries
→ Bundle everything for offline capability

Progressive disclosure
→ Show simple editors first
→ Advanced raw JSON editor for power users

Non-destructive editing
→ Always keep original in memory
→ Allow reset to original at any time

Graceful degradation
→ If optional files (data/*.json) are not uploaded,
  show IDs instead of names
→ Never crash on unknown plugin data
```

---

## 2. High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Static Page)                   │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐   ┌───────────────┐  │
│  │  File Ingest │    │  Data Store  │   │  UI Renderer  │  │
│  │  Layer       │───▶│  (In-Memory) │──▶│  Layer        │  │
│  └──────────────┘    └──────────────┘   └───────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐   ┌───────────────┐  │
│  │  Codec       │    │  Edit Engine │   │  Export       │  │
│  │  (LZString)  │    │  (Mutators)  │   │  Layer        │  │
│  └──────────────┘    └──────────────┘   └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **File Ingest Layer** | Accept file uploads, detect file type, route to codec |
| **Codec Layer** | Decode/encode LZString + JSON, validate structure |
| **Data Store** | Hold decoded save objects and optional DB files in memory |
| **Edit Engine** | Provide typed mutators for each data category |
| **UI Renderer** | Render structured editors per data category |
| **Export Layer** | Re-encode and trigger browser download |

---

## 3. File Structure

```text
rmmz-save-editor/
│
├── index.html                    # Entry point
├── README.md
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Pages deploy action
│
├── src/
│   ├── main.js                   # App bootstrap, event wiring
│   │
│   ├── codec/
│   │   ├── lzstring.js           # LZString library (vendored)
│   │   ├── SaveCodec.js          # decode/encode .rmmzsave/.rmmzdata
│   │   └── JsonExCompat.js       # Handle RPG Maker JsonEx metadata (@class etc.)
│   │
│   ├── store/
│   │   ├── SaveStore.js          # Holds decoded save file objects
│   │   ├── DatabaseStore.js      # Holds optional data/*.json content
│   │   └── ConfigStore.js        # Holds app-level UI state
│   │
│   ├── ingest/
│   │   ├── FileIngestor.js       # File upload handler, type detector
│   │   ├── SaveFileParser.js     # Parse .rmmzsave / .rmmzdata
│   │   ├── DatabaseParser.js     # Parse Actors.json, Items.json, etc.
│   │   └── GlobalParser.js       # Parse global.rmmzsave
│   │
│   ├── editor/
│   │   ├── EditorRouter.js       # Routes to correct editor panel per data type
│   │   ├── PartyEditor.js        # Gold, items, weapons, armors
│   │   ├── ActorEditor.js        # Level, HP, MP, exp, skills, equipment
│   │   ├── SwitchEditor.js       # Boolean switch table
│   │   ├── VariableEditor.js     # Variable value table
│   │   ├── SelfSwitchEditor.js   # Per-event self switch table
│   │   ├── SystemEditor.js       # BGM, encounter, menu flags
│   │   ├── MapEditor.js          # Player position, map ID
│   │   └── RawJsonEditor.js      # Full raw JSON editor (advanced)
│   │
│   ├── export/
│   │   ├── SaveExporter.js       # Re-encode and trigger download
│   │   └── BatchExporter.js      # Export all modified saves at once
│   │
│   └── ui/
│       ├── Layout.js             # Main layout manager
│       ├── FileDropZone.js       # Drag-and-drop upload component
│       ├── TabManager.js         # Tab navigation between editor panels
│       ├── Notification.js       # Toast / status messages
│       ├── ModalDialog.js        # Confirm dialogs, raw edit modal
│       ├── TableRenderer.js      # Generic sortable/filterable table
│       └── Tooltip.js            # Hover tooltips for field descriptions
│
├── assets/
│   ├── css/
│   │   ├── main.css              # Global styles
│   │   ├── layout.css            # Grid/flex layout
│   │   ├── editor.css            # Editor panel styles
│   │   ├── table.css             # Table styles
│   │   └── theme.css             # Color theme (RPG-inspired dark theme)
│   │
│   ├── icons/
│   │   └── ...                   # SVG icons for UI
│   │
│   └── fonts/
│       └── ...                   # Optional game-style fonts
│
├── vendor/
│   ├── lzstring.min.js           # LZString (pinned version)
│   └── jsoneditor.min.js         # JSON editor for raw edit panel (optional)
│
└── tests/
    ├── codec.test.js             # Encode/decode round-trip tests
    ├── parser.test.js            # Parser unit tests
    └── editor.test.js            # Mutator unit tests
```

---

## 4. Function Stack Definition

### 4.1 Codec Layer

```text
SaveCodec
├── decode(fileContent: string): object
│     LZString.decompressFromBase64(fileContent)
│     → JSON.parse(decompressed)
│     → validate structure
│     → return parsed object
│
├── encode(saveObject: object): string
│     JSON.stringify(saveObject)
│     → LZString.compressToBase64(jsonText)
│     → return compressed string
│
└── validate(saveObject: object): ValidationResult
      Check for required top-level keys
      → Return { valid: bool, warnings: string[], errors: string[] }
```

```text
JsonExCompat
├── stripMetadata(obj: object): object
│     Remove @class, @c, @r annotations for display
│
└── preserveMetadata(original: object, edited: object): object
      Merge edited values back while keeping @class annotations
```

---

### 4.2 Ingest Layer

```text
FileIngestor
├── onFileUpload(files: FileList): void
│     For each file:
│       detectFileType(file) → 'save' | 'global' | 'config' | 'database' | 'unknown'
│       route to appropriate parser
│
├── detectFileType(file: File): string
│     By extension: .rmmzsave, .rmmzdata → 'save'
│     global.rmmzsave → 'global'
│     config.rmmzsave → 'config'
│     *.json in data/ → 'database'
│
└── handleDrop(event: DragEvent): void
      Extract files from drag event
      → call onFileUpload

SaveFileParser
├── parse(fileContent: string): SaveObject
│     SaveCodec.decode(fileContent)
│     → categorize top-level keys
│     → return structured SaveObject
│
└── getSlotInfo(saveObject): SlotInfo
      Extract playtime, mapName, characters, timestamp

DatabaseParser
├── parseActors(json): ActorMap      { id → { name, class, ... } }
├── parseItems(json): ItemMap        { id → { name, iconIndex, ... } }
├── parseWeapons(json): WeaponMap
├── parseArmors(json): ArmorMap
├── parseSkills(json): SkillMap
├── parseClasses(json): ClassMap
├── parseSwitches(json): SwitchNameMap   { id → name }
├── parseVariables(json): VariableNameMap { id → name }
└── parseMapInfos(json): MapInfoMap      { id → name }
```

---

### 4.3 Store Layer

```text
SaveStore
├── saves: Map<filename, SaveObject>
├── originals: Map<filename, string>    # raw compressed originals
├── dirty: Set<filename>                # modified files
│
├── load(filename, saveObject, rawContent): void
├── get(filename): SaveObject
├── set(filename, saveObject): void     # marks dirty
├── reset(filename): void               # restore from original
├── isDirty(filename): boolean
└── listAll(): SaveEntry[]

DatabaseStore
├── actors: ActorMap
├── items: ItemMap
├── weapons: WeaponMap
├── armors: ArmorMap
├── skills: SkillMap
├── classes: ClassMap
├── switches: SwitchNameMap
├── variables: VariableNameMap
├── mapInfos: MapInfoMap
│
├── load(type, json): void
├── getName(type, id): string           # returns name or "ID:N" fallback
└── isLoaded(type): boolean
```

---

### 4.4 Editor Layer

Each editor module follows a common interface:

```text
interface EditorModule {
  render(container: HTMLElement, saveObject: SaveObject, dbStore: DatabaseStore): void
  getModifiedData(): Partial<SaveObject>
  reset(): void
  isDirty(): boolean
}
```

#### PartyEditor

```text
PartyEditor
├── renderGold(container)          # Number input for _gold
├── renderItems(container)         # Table: ID | Name | Quantity | Edit
├── renderWeapons(container)       # Table: ID | Name | Quantity | Edit
├── renderArmors(container)        # Table: ID | Name | Quantity | Edit
└── renderKeyItems(container)      # Table: ID | Name | Quantity | Edit
```

#### ActorEditor

```text
ActorEditor
├── renderActorList(container)     # Card list of all actors
└── renderActorDetail(container, actorId)
    ├── renderBasicStats()         # Level, HP, MP, TP
    ├── renderExperience()         # Exp per class
    ├── renderEquipment()          # Weapon, Shield, Armor, Helmet, Accessory
    ├── renderSkills()             # Skill list with add/remove
    └── renderStates()             # Active states
```

#### SwitchEditor

```text
SwitchEditor
├── renderSwitchTable(container)
│     Columns: ID | Name (from DB) | Value (toggle ON/OFF) | Search
└── filterByName(query): void
```

#### VariableEditor

```text
VariableEditor
├── renderVariableTable(container)
│     Columns: ID | Name (from DB) | Value (number/string input) | Search
└── filterByName(query): void
```

#### SelfSwitchEditor

```text
SelfSwitchEditor
├── renderSelfSwitchTable(container)
│     Columns: Map ID | Map Name | Event ID | Switch (A/B/C/D) | Value
└── groupByMap(): void
```

#### SystemEditor

```text
SystemEditor
├── renderBattleStats()            # Battle count, win, escape
├── renderMenuFlags()              # Menu/save/encounter enabled
├── renderBGMMemory()              # Current BGM
└── renderWindowTone()             # Window color tone
```

#### MapEditor

```text
MapEditor
├── renderPlayerPosition()         # Map ID, X, Y, Direction
└── renderMapName()                # Display map name from MapInfos
```

#### RawJsonEditor

```text
RawJsonEditor
├── render(container, saveObject)  # Full JSON in code editor
├── validate(): ValidationResult
└── apply(): SaveObject            # Parse and return edited JSON
```

---

### 4.5 Export Layer

```text
SaveExporter
├── exportSingle(filename: string): void
│     SaveStore.get(filename)
│     → SaveCodec.encode(saveObject)
│     → triggerDownload(filename, content)
│
├── exportAll(): void
│     For each dirty save in SaveStore
│     → exportSingle(filename)
│
└── triggerDownload(filename: string, content: string): void
      Create Blob → Object URL → <a> click → revoke URL

BatchExporter
└── exportAsZip(saves: SaveEntry[]): void
      Use JSZip (optional vendor) to bundle multiple saves
      → triggerDownload('saves.zip', blob)
```

---

## 5. UI Layout Design

### 5.1 Overall Page Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: RPG Maker MZ Save Editor                [Theme Toggle] │
├─────────────────────────────────────────────────────────────────┤
│  UPLOAD ZONE                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Drop .rmmzsave / .rmmzdata files here                  │   │
│  │  Or click to browse                                     │   │
│  │  [Optional: Upload data/*.json for name resolution]     │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  SAVE SLOT SELECTOR                                              │
│  [ Slot 1: Forest Village  12:34 ] [ Slot 2: ... ] [ Global ]  │
├─────────────────────────────────────────────────────────────────┤
│  EDITOR AREA                                                     │
│  ┌──────────────────┐  ┌──────────────────────────────────┐    │
│  │  SIDEBAR TABS    │  │  EDITOR PANEL                    │    │
│  │                  │  │                                  │    │
│  │  🎒 Party        │  │  (Content changes per tab)       │    │
│  │  👤 Actors       │  │                                  │    │
│  │  🔀 Switches     │  │                                  │    │
│  │  📊 Variables    │  │                                  │    │
│  │  🗺️ Map/Player   │  │                                  │    │
│  │  ⚙️ System       │  │                                  │    │
│  │  🔒 Self Switch  │  │                                  │    │
│  │  🧩 Raw JSON     │  │                                  │    │
│  └──────────────────┘  └──────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  ACTION BAR                                                      │
│  [Reset This File]  [Download This File]  [Download All]        │
├─────────────────────────────────────────────────────────────────┤
│  STATUS BAR: Last action / warnings / errors                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Upload Zone

| Element | Behavior |
|---|---|
| Drag-and-drop zone | Accept multiple files |
| File type badge | Show detected type per file |
| Green checkmark | File decoded successfully |
| Orange warning | File decoded but warnings |
| Red error | File failed to decode |
| Optional DB upload | Separate button for `data/*.json` |
| Clear all button | Remove all loaded files |

---

### 5.3 Save Slot Selector

| Element | Behavior |
|---|---|
| Slot card | Shows playtime, map name, character sprites (if available) |
| Active slot highlight | Currently selected slot is highlighted |
| Dirty indicator | Orange dot if slot has unsaved edits |
| Global slot | Separate tab for `global.rmmzsave` |
| Config slot | Separate tab for `config.rmmzsave` |

---

### 5.4 Party Editor Panel

```text
┌─────────────────────────────────────────────────────┐
│  PARTY                                              │
│                                                     │
│  Gold: [__________] (number input)                  │
│                                                     │
│  Items                    [+ Add Item]              │
│  ┌────┬──────────────┬──────────┬────────────────┐  │
│  │ ID │ Name         │ Quantity │ Actions        │  │
│  ├────┼──────────────┼──────────┼────────────────┤  │
│  │  1 │ Potion       │ [  5  ] │ [Max] [Remove] │  │
│  │  2 │ Ether        │ [  3  ] │ [Max] [Remove] │  │
│  └────┴──────────────┴──────────┴────────────────┘  │
│                                                     │
│  Weapons  /  Armors  (same table pattern)           │
└─────────────────────────────────────────────────────┘
```

---

### 5.5 Actor Editor Panel

```text
┌─────────────────────────────────────────────────────┐
│  ACTORS                                             │
│                                                     │
│  [Actor 1: Hero] [Actor 2: Mage] [Actor 3: ...]    │
│                                                     │
│  ── Hero ──────────────────────────────────────    │
│  Level:  [25]   Max HP: [500]  Max MP: [120]        │
│  HP:     [500]  MP:     [120]  TP: [0]              │
│  Exp:    [12345]                                    │
│                                                     │
│  Equipment:                                         │
│  Weapon: [ID: 5 - Iron Sword    ▼]                 │
│  Armor:  [ID: 3 - Chain Mail    ▼]                 │
│                                                     │
│  Skills: [Skill 1] [Skill 2] [+ Add] [- Remove]   │
│                                                     │
│  States: [Poisoned ✕] [+ Add State]                │
└─────────────────────────────────────────────────────┘
```

---

### 5.6 Switch Editor Panel

```text
┌─────────────────────────────────────────────────────┐
│  SWITCHES                       [Search: ________] │
│                                                     │
│  ┌────┬──────────────────────────┬───────────────┐  │
│  │ ID │ Name                     │ Value         │  │
│  ├────┼──────────────────────────┼───────────────┤  │
│  │  1 │ Intro Complete           │ [ON ] [OFF]   │  │
│  │  2 │ Boss Defeated            │ [ON ] [OFF]   │  │
│  │  3 │ Door Opened              │ [ON ] [OFF]   │  │
│  └────┴──────────────────────────┴───────────────┘  │
│                                                     │
│  [Set All ON]  [Set All OFF]  [Reset All]           │
└─────────────────────────────────────────────────────┘
```

---

### 5.7 Variable Editor Panel

```text
┌─────────────────────────────────────────────────────┐
│  VARIABLES                      [Search: ________] │
│                                                     │
│  ┌────┬──────────────────────────┬───────────────┐  │
│  │ ID │ Name                     │ Value         │  │
│  ├────┼──────────────────────────┼───────────────┤  │
│  │  1 │ Quest Stage              │ [_5_________] │  │
│  │  2 │ Coins Collected          │ [_23________] │  │
│  │  3 │ Relationship Value       │ [_80________] │  │
│  └────┴──────────────────────────┴───────────────┘  │
│                                                     │
│  [Reset All Variables]                              │
└─────────────────────────────────────────────────────┘
```

---

### 5.8 Raw JSON Editor Panel

```text
┌─────────────────────────────────────────────────────┐
│  RAW JSON EDITOR                                    │
│  ⚠ Warning: Direct JSON editing may corrupt save   │
│                                                     │
│  [Beautify]  [Minify]  [Validate]  [Reset]          │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ {                                             │  │
│  │   "system": { ... },                          │  │
│  │   "switches": { ... },                        │  │
│  │   "variables": { ... },                       │  │
│  │   ...                                         │  │
│  │ }                                             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Apply Changes]                                    │
└─────────────────────────────────────────────────────┘
```

---

## 6. Data Flow Diagram

```text
User uploads file(s)
        │
        ▼
FileIngestor.detectFileType()
        │
   ┌────┴────┐
   │         │
.rmmzsave  data/*.json
   │         │
   ▼         ▼
SaveFileParser  DatabaseParser
   │         │
   ▼         ▼
SaveStore   DatabaseStore
   │         │
   └────┬────┘
        │
        ▼
  EditorRouter.render()
        │
   ┌────┴──────────────────────────────────┐
   │         │          │         │        │
PartyEditor ActorEditor SwitchEditor VariableEditor ...
        │
        ▼
  User edits values
        │
        ▼
  EditEngine.applyMutation()
        │
        ▼
  SaveStore.set(filename, modified)
        │
        ▼
  User clicks Download
        │
        ▼
  SaveCodec.encode(saveObject)
        │
        ▼
  SaveExporter.triggerDownload()
        │
        ▼
  Browser downloads .rmmzsave
```

---

## 7. Technology Stack

| Component | Technology | Reason |
|---|---|---|
| Core language | Vanilla JavaScript (ES2022) | No build step, GitHub Pages compatible |
| Styling | CSS custom properties + Flexbox/Grid | No framework needed |
| LZString | Vendored `lz-string.min.js` | Same as RPG Maker MZ runtime |
| JSON editing | `jsoneditor` or `CodeMirror` (vendored) | Rich raw JSON editing |
| ZIP export | `JSZip` (optional, vendored) | Batch export |
| Icons | SVG inline or Feather Icons (vendored) | No CDN dependency |
| Font | Google Fonts or self-hosted | RPG-style UI font |
| Testing | Vanilla test runner or `qunit` | Lightweight, no Node required |
| Deploy | GitHub Actions → GitHub Pages | Static hosting |

> **No React, Vue, or Angular** — keeps the project dependency-free and deployable as a pure static site without a build pipeline.

---

## 8. GitHub Pages Deployment

### 8.1 Repository Structure

```text
rmmz-save-editor/
├── index.html        ← served as root
├── src/
├── assets/
├── vendor/
└── .github/
    └── workflows/
        └── deploy.yml
```

### 8.2 GitHub Actions Deploy Workflow

````yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
          exclude_assets: '.github,tests,README.md'
````

Since the project is entirely static, no build step is required.

---

## 9. Implementation Phases

### Phase 1 — Core Codec and Ingest

```text
Goal: Decode and re-encode save files correctly

Tasks:
- Vendor lz-string.js
- Implement SaveCodec (decode/encode/validate)
- Implement JsonExCompat (handle @class metadata)
- Implement FileIngestor (upload + type detection)
- Implement SaveFileParser
- Implement SaveStore
- Write codec round-trip tests
```

### Phase 2 — Basic UI Shell

```text
Goal: Functional page with upload and raw JSON view

Tasks:
- index.html layout
- CSS theme (dark RPG-inspired)
- FileDropZone component
- Save slot selector
- TabManager
- RawJsonEditor panel
- Download button (single file)
- Notification/toast system
```

### Phase 3 — Structured Editors

```text
Goal: Human-friendly editors for each data category

Tasks:
- PartyEditor (gold, items, weapons, armors)
- ActorEditor (level, stats, equipment, skills)
- SwitchEditor (toggle table with search)
- VariableEditor (value table with search)
- MapEditor (player position)
- SystemEditor (flags, BGM)
- SelfSwitchEditor
```

### Phase 4 — Database Integration

```text
Goal: Show names instead of IDs when DB files are uploaded

Tasks:
- DatabaseParser (Actors, Items, Weapons, Armors, Skills, Switches, Variables, MapInfos)
- DatabaseStore
- Wire name resolution into all editors
- Show "ID: N" fallback when DB not loaded
```

### Phase 5 — Export and Polish

```text
Goal: Complete export, batch download, UX polish

Tasks:
- SaveExporter (single file download)
- BatchExporter (ZIP of all modified files)
- Dirty state indicators
- Reset per-file and reset all
- Validation warnings in UI
- Responsive layout
- Accessibility improvements
- README and usage documentation
```

### Phase 6 — Testing and Deploy

```text
Goal: Stable release on GitHub Pages

Tasks:
- Codec round-trip tests
- Parser unit tests
- Mutator unit tests
- Manual QA with real save files
- GitHub Actions deploy workflow
- Final README
```

---

## 10. Key Design Decisions

| Decision | Rationale |
|---|---|
| Vanilla JS over framework | No build pipeline needed; pure static deploy |
| Vendored dependencies | No CDN calls; works offline; no version drift |
| Non-destructive editing | Always keep original raw string; allow reset |
| Graceful ID fallback | Works without DB files; names are enhancement |
| Phase-based implementation | Each phase is independently testable |
| Separate codec from UI | Codec can be tested without DOM |
| JsonExCompat layer | RPG Maker MZ uses `@class` annotations in JSON; must be preserved |
| Dirty state tracking | Prevent accidental overwrites; show user what changed |
| Raw JSON editor as escape hatch | Power users and plugin data can be handled |

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Plugin-added save data corrupted on edit | Preserve unknown keys; only mutate known fields |
| `@class` metadata stripped causing load failure | JsonExCompat layer preserves all metadata |
| LZString version mismatch | Vendor exact version used by RPG Maker MZ |
| Large save files blocking UI | Use `FileReader` async API; show loading indicator |
| User edits invalid JSON in raw editor | Validate before applying; show error, block export |
| Browser localStorage saves not uploadable | Document limitation; provide workaround instructions |
| Game-specific custom serialization | Warn user; raw editor available as fallback |

---

This blueprint is ready to be handed to a coding agent for sequential phase implementation. Each module is independently scoped, testable, and wired through well-defined interfaces.
