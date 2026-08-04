/**
 * One-time migration: stamp existing demo bookings with the duration they were
 * actually made at.
 *
 * Meeting length used to be a hard-coded 60 minutes. It is now set by the owner
 * under Settings → Booking, and each booking stores its own `durationMinutes`
 * so a later change to that setting can't shrink a meeting already in someone's
 * calendar. Bookings created before this field existed have nothing stored, so
 * they get the 60 minutes they were sold.
 *
 * Idempotent: only touches documents where `durationMinutes` is missing.
 *
 * Run from the backend directory:
 *   node src/migrations/2026-08-04-booking-duration.js
 * or:
 *   npm run migrate:booking-duration
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { ConsultationBooking } from "../models/forms/ConsultationBooking.js";

/** What every booking ran for before the setting existed. */
const LEGACY_DURATION_MINUTES = 60;

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  const missing = await ConsultationBooking.collection.countDocuments({
    durationMinutes: { $exists: false },
  });
  console.log(`▸ Bookings without a stored duration: ${missing}`);

  if (missing > 0) {
    const result = await ConsultationBooking.collection.updateMany(
      { durationMinutes: { $exists: false } },
      { $set: { durationMinutes: LEGACY_DURATION_MINUTES } },
    );
    console.log(`  set durationMinutes=${LEGACY_DURATION_MINUTES} on ${result.modifiedCount} booking(s)`);
  } else {
    console.log("  nothing to do");
  }

  await mongoose.disconnect();
  console.log("\n✓ Done. Disconnected.");
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
