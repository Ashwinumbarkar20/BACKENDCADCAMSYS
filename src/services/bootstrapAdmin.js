import { User } from "../models/User.js";

export async function ensureOwnerUser({ email, password }) {
  if (!email || !password) return;

  const existing = await User.findOne({ email }).select("_id").lean();
  if (existing) return;

  const passwordHash = await User.hashPassword(password);
  await User.create({ email, passwordHash, name: "Owner", isOwner: true });
}

// Self-healing migration for the role/permission upgrade.
// If there are users in the database but none have `isOwner: true`, this is the
// first boot under the new schema — those users were all owners under the old
// single-role system, so mark them so. Also strips the legacy string `role:
// "owner"` field so Mongoose stops trying to cast a string into an ObjectId.
//
// Idempotent: once any user has isOwner:true, this is a no-op.
export async function upgradeLegacyOwners() {
  // Use the native driver to bypass Mongoose's schema casting (the legacy
  // `role: "owner"` string would otherwise either throw or be coerced away).
  const coll = User.collection;

  const ownerCount = await coll.countDocuments({ isOwner: true });
  if (ownerCount > 0) return;

  const anyUser = await coll.countDocuments({});
  if (anyUser === 0) return; // fresh install — ensureOwnerUser will seed

  const flagged = await coll.updateMany(
    { isOwner: { $exists: false } },
    { $set: { isOwner: true } },
  );
  const cleaned = await coll.updateMany(
    { role: { $type: "string" } },
    { $unset: { role: "" } },
  );

  // eslint-disable-next-line no-console
  console.log(
    `[upgrade] Marked ${flagged.modifiedCount} legacy user(s) as owner; cleared stale role string from ${cleaned.modifiedCount}.`,
  );
}

