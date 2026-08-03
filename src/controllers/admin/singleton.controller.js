import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/apiResponse.js";
import { sanitizeAdminPayload } from "../../utils/sanitizePayload.js";

/**
 * Optional `populate` (e.g. `["logo","favicon"]` on Settings) for GET/PUT responses.
 *
 * `ensureDefaults` is a flat map of field → starting value, backfilled into any
 * of those fields that is still blank when the document is read. Schema defaults
 * only apply at creation, so a singleton created before a default existed would
 * otherwise stay empty forever — which is how the Privacy Policy editor came up
 * blank while the public page was showing a full policy.
 */
export function createSingletonControllers(Model, options = {}) {
  const getOne = asyncHandler(async (_req, res) => {
    let q = Model.findOne({ singletonKey: "global" });
    const { populate, ensureDefaults } = options;
    if (populate) {
      const list = Array.isArray(populate) ? populate : [populate];
      for (const p of list) {
        q = q.populate(p);
      }
    }
    let doc = await q;
    if (!doc) {
      doc = await Model.create({ singletonKey: "global" });
    } else if (ensureDefaults) {
      // Only ever fills blanks — anything already edited is left alone.
      let changed = false;
      for (const [field, value] of Object.entries(ensureDefaults)) {
        const current = doc[field];
        const isEmpty = Array.isArray(current)
          ? current.length === 0
          : !String(current ?? "").trim();
        if (!isEmpty) continue;
        doc[field] = value;
        changed = true;
      }
      if (changed) await doc.save();
    }
    return ok(res, doc);
  });

  const updateOne = asyncHandler(async (req, res) => {
    const body = sanitizeAdminPayload(req.body);
    let q = Model.findOneAndUpdate(
      { singletonKey: "global" },
      { $set: body, $setOnInsert: { singletonKey: "global" } },
      { new: true, upsert: true, runValidators: true }
    );
    const { populate } = options;
    if (populate) {
      const list = Array.isArray(populate) ? populate : [populate];
      for (const p of list) {
        q = q.populate(p);
      }
    }
    const doc = await q;
    return ok(res, doc);
  });

  return { getOne, updateOne };
}

