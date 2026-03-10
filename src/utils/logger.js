/**
 * LOGGER UTILITY
 * Handles in-memory code logs (for UI) and structured logging.
 * (Note: Browser-side code cannot write directly to `logs/` directory natively
 * without a backend, so this will maintain an array state for the UI
 * and provide a download function for session logs).
 */

export function createLogEntry(type, message, ruleId = null, tier = null, row = null, tags = []) {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type,       // "Error" | "Warning" | "Info" | "Applied" | "Fix" | "PTE" | "Calc"
    message,
    ruleId,
    tier,
    row,
    tags
  };
}

export function generateSessionLogText(logEntries) {
  let text = `# Session Log - ${new Date().toLocaleString()}\n\n`;
  text += `| Time | Type | Rule | Tier | Row | Message |\n`;
  text += `|---|---|---|---|---|---|\n`;

  for (const entry of logEntries) {
    text += `| ${new Date(entry.timestamp).toLocaleTimeString()} | ${entry.type} | ${entry.ruleId || '-'} | ${entry.tier || '-'} | ${entry.row || '-'} | ${entry.message} |\n`;
  }
  return text;
}

export function downloadSessionLog(logEntries, featureName = "General") {
  const text = generateSessionLogText(logEntries);
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10).split('-').reverse().join('-');
  const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '.');
  a.href = url;
  a.download = `${dateStr}_${timeStr}_${featureName}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
