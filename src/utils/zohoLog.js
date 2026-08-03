/**
 * Scoped logger for the Zoho booking pipeline (FRD §20).
 *
 * Every line is prefixed so booking traffic can be grepped out of the app log:
 *   [zoho:meeting] created id=… booking=…
 *
 * Never logs tokens, secrets or full request bodies.
 */
function stamp() {
  return new Date().toISOString();
}

function fmt(scope, level, message, meta) {
  const extra =
    meta && Object.keys(meta).length
      ? " " +
        Object.entries(meta)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join(" ")
      : "";
  return `${stamp()} [zoho:${scope}] ${level}: ${message}${extra}`;
}

export function zohoLog(scope) {
  return {
    info: (message, meta) => {
      // eslint-disable-next-line no-console
      console.log(fmt(scope, "info", message, meta));
    },
    warn: (message, meta) => {
      // eslint-disable-next-line no-console
      console.warn(fmt(scope, "warn", message, meta));
    },
    error: (message, meta) => {
      // eslint-disable-next-line no-console
      console.error(fmt(scope, "error", message, meta));
    },
  };
}
