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

const ADMIN_TO = (process.env.CONTACT_TO_EMAIL || process.env.EMAIL_ADMIN_TO || process.env.ADMIN_EMAIL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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
  if (ADMIN_TO.length === 0) return { sent: false, skipped: "no-admin-recipient" };
  const subject = `[Cadcamsys] New ${kind}`;
  const html = `<h2 style="font-family:Arial,sans-serif;">New ${escapeHtml(kind)}</h2>${fieldsTable(fields)}<p style="font-family:Arial,sans-serif;font-size:12px;color:#666;">Submitted via cadcamsys.com</p>`;
  return sendMail({ to: ADMIN_TO, subject, html, replyTo });
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
