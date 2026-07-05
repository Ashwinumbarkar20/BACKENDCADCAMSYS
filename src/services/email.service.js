import nodemailer from "nodemailer";

/**
 * Lightweight email service for transactional notifications (lead alerts,
 * confirmations). Designed to be safe in environments without SMTP credentials —
 * `sendMail` becomes a no-op that logs to stdout instead of throwing, so form
 * submissions still succeed if email is misconfigured.
 */

let transporter = null;
let warned = false;

function buildTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = (process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")) === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = buildTransporter();
  if (!transporter && !warned) {
    // eslint-disable-next-line no-console
    console.log(
      "[email] SMTP_HOST not set — email notifications are disabled. Leads still save to the DB.",
    );
    warned = true;
  }
  return transporter;
}

const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? `"Cadcamsys" <no-reply@cadcamsys.com>`;

const ADMIN_TO = (
  process.env.CONTACT_TO_EMAIL ||
  process.env.EMAIL_ADMIN_TO ||
  process.env.ADMIN_EMAIL ||
  "sales@cadcamsys.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function maskEmail(email) {
  const [user, domain] = String(email).split("@");
  if (!domain) return "(invalid)";
  const shown = user.length <= 2 ? user[0] : `${user.slice(0, 2)}***`;
  return `${shown}@${domain}`;
}

/** Safe summary for /health — confirms SMTP + owner inbox without secrets. */
export function getEmailDiagnostics() {
  const smtpConfigured = Boolean(process.env.SMTP_HOST?.trim());
  const hasAuth = Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASSWORD?.trim());
  return {
    smtpConfigured,
    smtpHost: smtpConfigured ? process.env.SMTP_HOST.trim() : null,
    smtpAuth: hasAuth,
    adminRecipients: ADMIN_TO.map(maskEmail),
    adminRecipientCount: ADMIN_TO.length,
    fromAddress: DEFAULT_FROM,
    leadEmailReady: smtpConfigured && hasAuth && ADMIN_TO.length > 0,
  };
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fieldsTable(fields) {
  const rows = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;font-weight:600;background:#f7f7f7;">${escapeHtml(
          k,
        )}</td><td style="padding:4px 8px;">${escapeHtml(
          typeof v === "object" ? JSON.stringify(v) : v,
        )}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;border:1px solid #e5e5e5;font-family:Arial,sans-serif;font-size:14px;">${rows}</table>`;
}

/**
 * Generic send. Returns { sent: boolean, skipped?: string, error?: string }.
 * Never throws — emails are best-effort and must not block form submissions.
 */
export async function sendMail({ to, subject, html, text, replyTo }) {
  const t = getTransporter();
  if (!t) return { sent: false, skipped: "no-smtp-configured" };
  if (!to || (Array.isArray(to) && to.length === 0)) {
    return { sent: false, skipped: "no-recipient" };
  }
  try {
    const info = await t.sendMail({
      from: DEFAULT_FROM,
      to,
      subject,
      html,
      text,
      replyTo,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email] send failed:", err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Notify the admin team that a new lead arrived. `kind` is shown in the
 * subject so the recipient can route in their inbox.
 */
export async function notifyAdminLead({ kind, fields, replyTo }) {
  if (ADMIN_TO.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[email] Lead saved but no admin inbox — set CONTACT_TO_EMAIL or ADMIN_EMAIL in env (${kind}).`,
    );
    return { sent: false, skipped: "no-admin-recipient" };
  }
  const subject = `[Cadcamsys] New ${kind}`;
  const text = `New ${kind}\n\n${Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join("\n")}`;
  const html = `<h2 style="font-family:Arial,sans-serif;">New ${escapeHtml(kind)}</h2>${fieldsTable(fields)}<p style="font-family:Arial,sans-serif;font-size:12px;color:#666;">Submitted via cadcamsys.com</p>`;
  const result = await sendMail({ to: ADMIN_TO, subject, html, text, replyTo });
  if (result.sent) {
    // eslint-disable-next-line no-console
    console.log(`[email] Owner notified (${kind}) → ${ADMIN_TO.join(", ")}`);
  } else if (result.skipped === "no-smtp-configured") {
    // eslint-disable-next-line no-console
    console.warn(`[email] Lead saved but SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASSWORD (${kind}).`);
  } else if (result.error) {
    // eslint-disable-next-line no-console
    console.error(`[email] Owner notify failed (${kind}): ${result.error}`);
  }
  return result;
}

/**
 * Confirmation email back to the person who submitted the form. Optional —
 * called only when the submission carries a verified-looking email.
 */
export async function sendLeadConfirmation({ to, kind, name }) {
  if (!to) return { sent: false, skipped: "no-recipient" };
  const subject = `We received your ${kind}`;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hello,";
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222;"><p>${greeting}</p><p>Thanks for getting in touch with Cadcamsys. We received your ${escapeHtml(
    kind,
  )} and a member of our team will be in touch shortly.</p><p>— The Cadcamsys team</p></div>`;
  return sendMail({ to, subject, html });
}
