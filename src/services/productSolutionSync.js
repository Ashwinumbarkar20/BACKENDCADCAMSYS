import mongoose from "mongoose";

function toObjectId(value) {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
}

/** Product → Solution: keep solution.products in sync when product.solution changes. */
export async function syncProductToSolution(productId, solutionId) {
  const Solution = mongoose.model("Solution");
  const pid = toObjectId(productId);
  if (!pid) return;

  const sid = toObjectId(solutionId);
  if (sid) {
    await Solution.findByIdAndUpdate(sid, { $addToSet: { products: pid } });
    await Solution.updateMany({ products: pid, _id: { $ne: sid } }, { $pull: { products: pid } });
    return;
  }

  await Solution.updateMany({ products: pid }, { $pull: { products: pid } });
}

/** Solution → Product: keep product.solution in sync when solution.products changes. */
export async function syncSolutionToProducts(solutionId, productIds) {
  const Product = mongoose.model("Product");
  const sid = toObjectId(solutionId);
  if (!sid) return;

  const ids = (productIds || []).map(toObjectId).filter(Boolean);

  if (ids.length) {
    await Product.updateMany({ _id: { $in: ids } }, { $set: { solution: sid } });
  }

  await Product.updateMany(
    { solution: sid, ...(ids.length ? { _id: { $nin: ids } } : {}) },
    { $unset: { solution: "" } },
  );
}

/** Full two-way reconcile after either side changes (ensures arrays and refs match). */
export async function syncProductSolutionLink(productId, solutionId) {
  await syncProductToSolution(productId, solutionId);
  if (solutionId) {
    const Solution = mongoose.model("Solution");
    const doc = await Solution.findById(solutionId).select("products").lean();
    if (doc) await syncSolutionToProducts(solutionId, doc.products);
  }
}

export async function syncSolutionProductsLink(solutionId, productIds) {
  await syncSolutionToProducts(solutionId, productIds);
  for (const productId of productIds || []) {
    await syncProductToSolution(productId, solutionId);
  }
}
