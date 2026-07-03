import { asyncHandler } from "../utils/asyncHandler.js";
import { created, ok } from "../utils/apiResponse.js";
import { sanitizeAdminPayload } from "../utils/sanitizePayload.js";

function normalizeBody(body) {
  return sanitizeAdminPayload(body);
}

function applyProductSolutionUnset(doc, body) {
  if (!doc || doc.constructor.modelName !== "Product") return;
  if ("solution" in body && !body.solution) {
    doc.set("solution", undefined);
    delete body.solution;
  }
}

export function createCrudControllers(
  Model,
  { defaultSort = "-updatedAt", populate = [], afterCreate, afterUpdate, beforeDelete } = {},
) {
  const list = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const query = Model.find({});
    for (const p of populate) query.populate(p);

    const [items, total] = await Promise.all([
      query.sort(defaultSort).skip(skip).limit(limit).lean(),
      Model.countDocuments({}),
    ]);

    return ok(res, items, { page, limit, total });
  });

  const createOne = asyncHandler(async (req, res) => {
    const body = normalizeBody(req.body);
    const doc = await Model.create(body);
    if (afterCreate) await afterCreate(doc);
    return created(res, doc);
  });

  const getOne = asyncHandler(async (req, res) => {
    const query = Model.findById(req.params.id);
    for (const p of populate) query.populate(p);
    const doc = await query.lean();
    return ok(res, doc);
  });

  const updateOne = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) return ok(res, null);

    const body = normalizeBody(req.body);
    applyProductSolutionUnset(doc, body);
    doc.set(body);
    await doc.save();
    if (afterUpdate) await afterUpdate(doc);
    for (const p of populate) await doc.populate(p);
    return ok(res, doc);
  });

  const removeOne = asyncHandler(async (req, res) => {
    if (beforeDelete) await beforeDelete(req.params.id);
    await Model.findByIdAndDelete(req.params.id);
    return ok(res, { deleted: true });
  });

  return { list, createOne, getOne, updateOne, removeOne };
}

