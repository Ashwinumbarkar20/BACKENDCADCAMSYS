/**
 * One-time migration: upgrade the User collection for the new role/permission
 * system.
 *
 * Background: User.role used to be an enum locked to ["owner"]. The new model
 * uses:
 *   - User.isOwner: Boolean — owners bypass permission checks
 *   - User.role:    ObjectId ref Role — assignable permission bundle
 *
 * Every pre-existing user is treated as an owner (since that was the only
 * role available). The old `role` field is dropped.
 *
 * Safe to run multiple times — already-migrated users are a no-op.
 *
 * Run from the backend directory:
 *   node src/migrations/2026-05-17-user-roles.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { User } from "../models/User.js";

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected");

  const coll = User.collection;

  // 1. Set isOwner:true on every existing user. (They were all owners before.)
  const ownerResult = await coll.updateMany(
    { isOwner: { $exists: false } },
    { $set: { isOwner: true, role: null } },
  );
  console.log(`  users.isOwner: ${ownerResult.modifiedCount} user(s) marked as owner`);

  // 2. Drop the legacy string `role` field if it's still hanging around as a string.
  // (Some docs may have role:"owner" alongside the new schema during a partial migration.)
  const dropResult = await coll.updateMany(
    { role: "owner" },
    { $unset: { role: "" } },
  );
  console.log(`  users.role (legacy string): ${dropResult.modifiedCount} cleared`);

  // 3. After step 2 the schema default re-applies role:null on next save; that's fine.

  await mongoose.disconnect();
  console.log("✓ Done. Disconnected.");
}

main().catch(async (err) => {
  console.error("\n✗ Migration failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
