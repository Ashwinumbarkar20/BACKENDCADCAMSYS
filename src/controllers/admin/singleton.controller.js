import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/apiResponse.js";
import { sanitizeAdminPayload } from "../../utils/sanitizePayload.js";

/** Optional `populate` (e.g. `["logo","favicon"]` on Settings) for GET/PUT responses. */
export function createSingletonControllers(Model, options = {}) {
  const getOne = asyncHandler(async (_req, res) => {
    let q = Model.findOne({ singletonKey: "global" });
    const { populate } = options;
    if (populate) {
      const list = Array.isArray(populate) ? populate : [populate];
      for (const p of list) {
        q = q.populate(p);
      }
    }
    let doc = await q;
    if (!doc) doc = await Model.create({ singletonKey: "global" });
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

