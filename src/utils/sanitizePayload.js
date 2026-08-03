/**
 * Whether `""` should be dropped from the payload for this path.
 *
 * An empty string genuinely breaks ObjectId refs and enums, which is why this
 * stripping exists. But applying it to *every* field meant a cleared text box
 * was simply omitted from the $set, so the previous value stayed in the
 * database — clearing an intro, a tagline or an address was impossible.
 *
 * With the schema in hand we can be precise: drop "" only where it would
 * actually fail to cast. Without a schema we keep the old, blunt behaviour.
 */
function shouldDropEmpty(schema, path) {
  if (!schema) return true;
  const entry = schema.path(path);
  if (!entry) return true;
  const kind = entry.instance;
  if (kind === "ObjectID" || kind === "ObjectId") return true;
  if (kind === "Number" || kind === "Date" || kind === "Boolean") return true;
  if (Array.isArray(entry.enumValues) && entry.enumValues.length > 0) return true;
  if (entry.options?.enum) return true;
  return false;
}

function cleanObject(obj, schema, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const next = cleanValue(value, schema, path);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

function cleanValue(value, schema, path) {
  if (value === "") return shouldDropEmpty(schema, path) ? undefined : "";
  if (value == null) return value;

  if (Array.isArray(value)) {
    const entry = schema?.path(path);
    const subSchema = entry?.schema || null;
    if (subSchema) {
      // Array of subdocuments — recurse with the subdocument's own schema.
      return value.map((item) =>
        item && typeof item === "object" ? cleanObject(item, subSchema) : item,
      );
    }
    // Array of primitives: blanks are noise, not data.
    return value.filter((item) => item !== "" && item !== undefined && item !== null);
  }

  if (typeof value === "object" && !(value instanceof Date)) {
    return cleanObject(value, schema, path);
  }
  return value;
}

/**
 * Normalize admin write payloads before Mongoose create/set/save.
 * Fixes common CMS issues: status "", empty ObjectIds, incomplete nested rows.
 *
 * Pass the Model so blank text fields can be cleared — see shouldDropEmpty.
 */
export function sanitizeAdminPayload(body, Model = null) {
  if (!body || typeof body !== "object") return body;

  const schema = Model?.schema ?? null;
  const payload = cleanObject({ ...body }, schema);

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
