import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { ensureUploadDir, getUploadDir } from "./config/uploads.js";
import { recoverAllUploadSources, getUploadStorageDiagnostics } from "./utils/uploadsBackup.js";
import { ensureOwnerUser, upgradeLegacyOwners } from "./services/bootstrapAdmin.js";

async function main() {
  const uploadPath = ensureUploadDir();
  // eslint-disable-next-line no-console
  console.log(`Uploads directory: ${uploadPath}`);

  const recovery = recoverAllUploadSources();
  // eslint-disable-next-line no-console
  console.log(
    `[uploads] ${recovery.fileCount} file(s) on disk; restored ${recovery.restored.length}, backed up ${recovery.backedUp.length}`,
  );
  if (recovery.restored.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[uploads] restored: ${recovery.restored.slice(0, 5).join(", ")}${recovery.restored.length > 5 ? "…" : ""}`);
  }
  if (recovery.legacySources.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[uploads] legacy sources scanned: ${recovery.legacySources.join(", ")}`);
  }

  const diag = getUploadStorageDiagnostics();
  if (diag.persistentStorage) {
    // eslint-disable-next-line no-console
    console.log(
      `[uploads] Persistent storage enabled → ${diag.uploadDir} (deploy folder ${diag.projectUploadDir} is not used)`,
    );
  } else if (env.NODE_ENV === "production" && !diag.uploadDirAbsolute) {
    // eslint-disable-next-line no-console
    console.warn(
      "[uploads] WARNING: UPLOAD_DIR is relative inside the deploy folder. Media will be lost on redeploy.",
    );
  }
  if (diag.hostingerDetected && !diag.persistentStorage) {
    // eslint-disable-next-line no-console
    console.warn(
      "[uploads] WARNING: Hostinger ~/nodejs detected but persistent storage is off. Set NODE_ENV=production or HOSTINGER=1.",
    );
  }
  if (diag.uploadFileCount === 0 && diag.backupFileCount === 0 && diag.legacyDirs.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("[uploads] WARNING: No files in upload/backup yet; legacy folders exist — check permissions.");
  } else if (env.NODE_ENV === "production" && diag.uploadFileCount === 0 && diag.backupFileCount === 0) {
    // eslint-disable-next-line no-console
    console.warn("[uploads] WARNING: upload and backup folders are empty.");
  }

  await connectDb();

  // Self-heal on first boot after the role/permission upgrade so existing
  // owner accounts don't end up locked out of their own admin.
  await upgradeLegacyOwners();

  await ensureOwnerUser({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.log("Error in main", err);
  console.error(err);
  process.exit(1);
});
