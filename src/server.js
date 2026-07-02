import fs from "node:fs";
import path from "node:path";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { ensureOwnerUser, upgradeLegacyOwners } from "./services/bootstrapAdmin.js";

function ensureUploadsDir() {
  const uploadPath = path.isAbsolute(env.UPLOAD_DIR)
    ? env.UPLOAD_DIR
    : path.resolve(process.cwd(), env.UPLOAD_DIR);
  fs.mkdirSync(uploadPath, { recursive: true });
  // eslint-disable-next-line no-console
  console.log(`Uploads directory: ${uploadPath}`);
  return uploadPath;
}

async function main() {
  ensureUploadsDir();
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
