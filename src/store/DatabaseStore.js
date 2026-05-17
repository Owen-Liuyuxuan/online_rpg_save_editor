/**
 * Holds optional MZ project `data/*.json` payloads for resolving names in editors.
 */

export class DatabaseStore {
  constructor() {
    /** @type {{ label: Map<number,string>; raw?: unknown } | undefined}*/
    this.actors = undefined;
    this.items = undefined;
    this.weapons = undefined;
    this.armors = undefined;
    this.skills = undefined;
    this.classes = undefined;
    /** From System.json switched array */
    this.switches = undefined;
    /** From System.json variables array */
    this.variables = undefined;
    /** @type {{ label: Map<number,string>; raw?: unknown } | undefined} */
    this.states = undefined;
    this.mapInfos = undefined;
    this.systemLoaded = false;
  }

  /**
   * @param {'actors'|'items'|'weapons'|'armors'|'skills'|'classes'|'states'|'mapInfos'} type
   * @param {number} id
   * @returns {string}
   */
  nameForDb(type, id) {
    if (!Number.isFinite(id) || id <= 0) return `—`;
    /** @type {Map<number,string> | undefined} */
    let map = undefined;
    if (type === "actors") map = this.actors?.label;
    if (type === "items") map = this.items?.label;
    if (type === "weapons") map = this.weapons?.label;
    if (type === "armors") map = this.armors?.label;
    if (type === "skills") map = this.skills?.label;
    if (type === "classes") map = this.classes?.label;
    if (type === "states") map = this.states?.label;
    const label = map?.get(Math.floor(id));
    return label && label.trim() !== "" ? label : `ID ${id}`;
  }

  /** @returns {string} map display name */
  mapName(mapId) {
    if (!Number.isFinite(mapId) || mapId <= 0) return `ID ${mapId}`;
    const m = this.mapInfos?.label?.get(Math.floor(mapId));
    return m && m.trim() !== "" ? m : `Map ${mapId}`;
  }

  /** @returns {string} */
  switchName(id) {
    if (!Number.isFinite(id) || id <= 0) return "";
    const n = this.switches?.get(Math.floor(id));
    return (n ?? "").trim() === "" ? "" : /** @type {string} */ (n);
  }

  /** @returns {string} */
  variableName(id) {
    if (!Number.isFinite(id) || id <= 0) return "";
    const n = this.variables?.get(Math.floor(id));
    return (n ?? "").trim() === "" ? "" : /** @type {string} */ (n);
  }

  reset() {
    this.actors = undefined;
    this.items = undefined;
    this.weapons = undefined;
    this.armors = undefined;
    this.skills = undefined;
    this.classes = undefined;
    this.switches = undefined;
    this.variables = undefined;
    this.states = undefined;
    this.mapInfos = undefined;
    this.systemLoaded = false;
  }
}
