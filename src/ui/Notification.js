const TOAST_HOLD_MS = 4500;

export class NotificationBus {
  constructor(root) {
    this.root =
      root ||
      /** @type {HTMLElement} */
      (document.querySelector('[data-slot="toast-region"]') ??
        document.body.appendChild(
          Object.assign(document.createElement("div"), {
            className: "toast-region",
          })
        ));
  }

  /**
   * @param {"info"|"warning"|"error"} level
   * @param {string} message
   */
  show(level, message) {
    const el = document.createElement("div");
    el.className = `toast ${level}`;
    el.textContent = message;
    this.root.appendChild(el);
    const close = () => el.remove();
    const t = window.setTimeout(close, TOAST_HOLD_MS);
    el.addEventListener(
      "click",
      () => {
        window.clearTimeout(t);
        close();
      },
      { once: true }
    );
  }

  notifyMany(lines = []) {
    lines.forEach((line) => {
      if (/error|fail|invalid/i.test(line)) this.show("error", line);
      else if (/warn|caution/i.test(line)) this.show("warning", line);
      else this.show("info", line);
    });
  }
}
