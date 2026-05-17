export function confirmDanger(message, title = "Continue?") {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
