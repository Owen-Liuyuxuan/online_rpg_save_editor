/** App UI/session state detached from MZ save payloads. */

export class ConfigStore {
  constructor() {
    /** Currently focused save blob filename (`file3.rmmzsave`, …) */
    this.activeFilename = "";
    /** @type {string[]} */
    this.lastIssues = [];
  }

  setActiveFilename(name) {
    this.activeFilename = name;
  }

  /** @returns {string} */
  getActiveFilename() {
    return this.activeFilename || "";
  }
}
