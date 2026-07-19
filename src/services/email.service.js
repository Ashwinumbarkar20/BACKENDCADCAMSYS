import nodemailer from "nodemailer";

/**
 * Lightweight email service for transactional notifications (lead alerts,
 * confirmations). Designed to be safe in environments without SMTP credentials —
 * `sendMail` becomes a no-op that logs to stdout instead of throwing, so form
 * submissions still succeed if email is misconfigured.
 */

let transporter = null;
let warned = false;

// Resolved SMTP config. cadcamsys.com email is hosted on Zoho (MX -> zoho.in),
// so defaults target Zoho India (smtp.zoho.in:465). Credentials accept either
// the standard SMTP_* names OR the simpler EMAIL_USER / EMAIL_APP_PASSWORD names.
// Recommended env for this deploy:
//   EMAIL_USER         = abhilash.nasre@cadcamsys.com   (the sending Zoho mailbox)
//   EMAIL_APP_PASSWORD = <Zoho app-specific password for that mailbox>
//   CONTACT_TO_EMAIL   = sales@cadcamsys.com            (where leads are delivered)
// For a different provider/data-centre, set SMTP_HOST (e.g. smtp.zoho.com) + SMTP_PORT.
const SMTP_HOST = (process.env.SMTP_HOST || "smtp.zoho.in").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_SECURE = (process.env.SMTP_SECURE ?? (SMTP_PORT === 465 ? "true" : "false")) === "true";
// Sending mailbox: explicit SMTP_USER/EMAIL_USER, else the first recipient.
const SMTP_USER = (
  process.env.SMTP_USER ||
  process.env.EMAIL_USER ||
  process.env.CONTACT_TO_EMAIL ||
  process.env.EMAIL_ADMIN_TO ||
  process.env.ADMIN_EMAIL ||
  ""
)
  .split(",")[0]
  .trim();
// Google App Passwords are displayed in 4 space-separated groups
// ("abcd efgh ijkl mnop") but must be sent without spaces — strip all whitespace
// so the value works whether or not the spaces were copied.
const SMTP_PASS = (process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

function buildTransporter() {
  // Need a mailbox + password to authenticate; otherwise stay disabled (no-op).
  if (!SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = buildTransporter();
  if (!transporter && !warned) {
    // eslint-disable-next-line no-console
    console.log(
      "[email] SMTP credentials not set (need EMAIL_APP_PASSWORD + a sending mailbox). " +
        "Email notifications are disabled; leads still save to the DB.",
    );
    warned = true;
  }
  return transporter;
}

// Hostinger (and most providers) require the From address to be the authenticated
// mailbox, otherwise the message is rejected or marked as spam — so From defaults
// to the sending mailbox, not a no-reply@ address.
const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? (SMTP_USER ? `"CADCAMSYS" <${SMTP_USER}>` : `"Cadcamsys" <no-reply@cadcamsys.com>`);

const ADMIN_TO = (
  process.env.CONTACT_TO_EMAIL ||
  process.env.EMAIL_ADMIN_TO ||
  process.env.ADMIN_EMAIL ||
  // Default inbox for contact-form messages, appointment bookings, and PDF
  // download leads. Override in production via CONTACT_TO_EMAIL (comma-separated
  // for multiple recipients).
  "abhilash.nasre@cadcamsys.com"
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
  const hasAuth = Boolean(SMTP_USER && SMTP_PASS);
  return {
    smtpConfigured: Boolean(SMTP_HOST),
    smtpHost: SMTP_HOST,
    smtpPort: SMTP_PORT,
    smtpUser: SMTP_USER ? maskEmail(SMTP_USER) : null,
    smtpAuth: hasAuth,
    adminRecipients: ADMIN_TO.map(maskEmail),
    adminRecipientCount: ADMIN_TO.length,
    fromAddress: DEFAULT_FROM,
    leadEmailReady: hasAuth && ADMIN_TO.length > 0,
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
