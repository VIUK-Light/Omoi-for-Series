const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

// Display copy owns the line breaks. The renderer adds no inferred boundaries.
export function questionMarkup(text) {
  return escapeHtml(text);
}
