/**
 * Shared helpers for public list endpoints: pagination, filtering, sorting, search.
 *
 * Usage:
 *   const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
 *     filters: { category: "objectId", tag: "string" },
 *     searchPaths: ["title", "excerpt"],
 *     defaultSort: "-publishedAt",
 *   });
 *   const [items, total] = await Promise.all([
 *     Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
 *     Model.countDocuments(filter),
 *   ]);
 *   return ok(res, items, { page, limit, total, pages: Math.ceil(total/limit) });
 */

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const PUBLISHED = { status: "published" };

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {import('express').Request} req
 * @param {{
 *   filters?: Record<string, 'objectId' | 'objectIds' | 'string' | 'boolean'>,
 *   searchPaths?: string[],
 *   defaultSort?: string,
 *   maxLimit?: number,
 *   includeUnpublished?: boolean,
 * }} options
 */
export function parsePublicListQuery(req, options = {}) {
  const {
    filters = {},
    searchPaths = [],
    defaultSort = "-publishedAt",
    maxLimit = 50,
    includeUnpublished = false,
  } = options;

  const page = Math.max(1, Number.parseInt(req.query.page ?? "1", 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(req.query.limit ?? "12", 10) || 12),
  );
  const skip = (page - 1) * limit;

  const filter = includeUnpublished ? {} : { ...PUBLISHED };

  for (const [param, kind] of Object.entries(filters)) {
    const raw = req.query[param];
    if (raw === undefined || raw === "" || raw === null) continue;

    if (kind === "objectId") {
      const v = String(raw).trim();
      if (OBJECT_ID.test(v)) filter[param] = v;
    } else if (kind === "objectIds") {
      const arr = String(raw)
        .split(",")
        .map((v) => v.trim())
        .filter((v) => OBJECT_ID.test(v));
      if (arr.length) filter[param] = { $in: arr };
    } else if (kind === "boolean") {
      filter[param] = String(raw) === "true";
    } else {
      filter[param] = String(raw).trim();
    }
  }

  // Free-text search over the configured paths (case-insensitive regex). Mongo
  // text index would be faster for huge collections, but regex is good enough
  // for the foreseeable scale and supports partial matches.
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q && searchPaths.length) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = searchPaths.map((p) => ({ [p]: rx }));
  }

  // Sort: ?sort=field or ?sort=-field. Whitelist of safe paths must be passed
  // by the caller — we don't validate here, only allow letters/numbers/_- and
  // a leading dash.
  let sort = defaultSort;
  if (typeof req.query.sort === "string" && /^-?[a-zA-Z0-9_.]+$/.test(req.query.sort)) {
    sort = req.query.sort;
  }

  return { filter, page, limit, skip, sort };
}

export function listMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
