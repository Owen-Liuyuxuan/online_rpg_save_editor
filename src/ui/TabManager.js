/** @typedef {string} TabId */

/**
 * Lightweight tab controller keyed by sidebar buttons.
 */
export class TabManager {
  /**
   * @param {HTMLElement} sidebar
   */
  constructor(sidebar) {
    this.sidebar = sidebar;
    /** @type {Map<TabId, HTMLElement>} */
    this.panels = new Map();
    /** @returns {HTMLElement} */
    this.activePanelEl = sidebar;
    this.activeTab = "";

    sidebar.addEventListener("click", (e) => {
      const btn =
        /** @type {HTMLElement | null} */ (e.target?.closest("[data-tab]"));
      if (!btn?.dataset.tab) return;
      this.activate(btn.dataset.tab);
    });
  }

  /**
   * @param {TabId} id
   * @param {HTMLElement} panelEl
   */
  registerPanel(id, panelEl) {
    panelEl.hidden = true;
    this.panels.set(id, panelEl);
    if (!this.activeTab) this.activate(id);
  }

  /** @returns {HTMLElement | undefined} panel */
  getPanel(tab) {
    return this.panels.get(tab);
  }

  activate(tabId) {
    this.activeTab = tabId;
    for (const [id, el] of this.panels.entries()) {
      el.hidden = id !== tabId;
      const btn = /** @type {HTMLButtonElement | null} */ (
        this.sidebar.querySelector(`[data-tab="${id}"]`)
      );
      if (btn instanceof HTMLButtonElement) {
        btn.classList.toggle("active", id === tabId);
      }
    }
    const activated = /** @type {HTMLButtonElement | null} */ (
      this.sidebar.querySelector(`button[data-tab="${tabId}"]`)
    );
    activated?.dispatchEvent(new CustomEvent("tabchange", { detail: { tabId } }));
    const panelDispatch = /** @type {HTMLElement | undefined} */ (this.panels.get(tabId));
    panelDispatch?.dispatchEvent(new CustomEvent("tabactivate", { detail: { tabId } }));
    return panelDispatch ?? null;
  }
}
