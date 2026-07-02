/** Strip empty strings from payloads — they break ObjectId refs and enums on save. */
function stripEmptyStrings(value) {
  if (value === "") return undefined;
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => stripEmptyStrings(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const next = stripEmptyStrings(v);
      if (next !== undefined) out[k] = next;
    }
    return out;
  }
  return value;
}

/**
 * Normalize admin write payloads before Mongoose create/set/save.
 * Fixes common CMS issues: status "", empty ObjectIds, incomplete nested rows.
 */
export function sanitizeAdminPayload(body) {
  if (!body || typeof body !== "object") return body;

  const payload = stripEmptyStrings({ ...body });

  if ("status" in payload) {
    payload.status = payload.status === "published" ? "published" : "draft";
  }
  if (payload.publishedAt === "") delete payload.publishedAt;

  if (Array.isArray(payload.kpiBenefits)) {
    payload.kpiBenefits = payload.kpiBenefits
      .filter((k) => k && String(k.metric || "").trim())
      .map((k) => ({
        direction: k.direction === "down" ? "down" : "up",
        metric: String(k.metric).trim(),
        value: k.value || "",
        helperText: k.helperText || "",
      }));
  }

  if (Array.isArray(payload.results)) {
    payload.results = payload.results
      .filter((r) => r && String(r.label || "").trim())
      .map((r) => ({
        label: String(r.label).trim(),
        oldValue: r.oldValue || "",
        newValue: r.newValue || "",
      }));
  }

  if (Array.isArray(payload.pdfs)) {
    payload.pdfs = payload.pdfs
      .filter((p) => p && (String(p.title || "").trim() || p.file))
      .map((p) => {
        const row = { title: p.title || "" };
        if (p.file) row.file = p.file;
        return row;
      });
  }

  return payload;
}

export function firstMongooseErrorMessage(errors) {
  if (!errors || typeof errors !== "object") return null;
  for (const value of Object.values(errors)) {
    if (value?.message) return String(value.message);
    const nested = firstMongooseErrorMessage(value);
    if (nested) return nested;
  }
  return null;
}
