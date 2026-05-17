/** @typedef {(files: FileList | File[]) => Promise<void>} OnFilesCb */

/** @returns {HTMLElement} */
function requireEl(sel) {
  const el = document.querySelector(sel);
  if (!(el instanceof HTMLElement)) throw new Error(`Missing DOM node ${sel}`);
  return el;
}

/**
 * Attach drag-drop + browse listeners to `#drop-zone`.
 * @param {OnFilesCb} onFiles
 */
export function wireDropZone(onFiles) {
  const wrap = requireEl('[data-slot="drop-zone"]');
  const input = wrap.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement))
    throw new Error("Drop zone input missing");

  wrap.addEventListener("dragenter", (e) => {
    e.preventDefault();
    wrap.classList.add("dragover");
  });
  wrap.addEventListener("dragover", (e) => {
    e.preventDefault();
    wrap.classList.add("dragover");
  });
  wrap.addEventListener("dragleave", (e) => {
    e.preventDefault();
    wrap.classList.remove("dragover");
  });
  wrap.addEventListener("drop", async (e) => {
    e.preventDefault();
    wrap.classList.remove("dragover");
    if (!e.dataTransfer?.files?.length) return;
    await onFiles(e.dataTransfer.files);
  });

  input.addEventListener("change", async () => {
    if (!input.files?.length) return;
    await onFiles(input.files);
    input.value = "";
  });

  wrap.addEventListener("click", (e) => {
    if (
      e.target === input ||
      (e.target instanceof Node && input.contains(e.target))
    ) {
      return;
    }
    input.click();
  });

  wrap.addEventListener(
    "keydown",
    (e) => {
      if (!["Enter", " "].includes(e.key)) return;
      e.preventDefault();
      input.click();
    },
    false
  );
}
