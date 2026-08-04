import { zohoConfig, MEETING_DEFAULTS } from "../config/zoho.js";
import { getZohoAccessToken } from "./zohoAuthService.js";
import { zohoLog } from "../utils/zohoLog.js";

/**
 * Zoho Meeting session create / update / delete (FRD §7, §15, §16).
 *
 * Zoho's Meeting API is scoped to an organisation id (zsoid) that isn't in the
 * OAuth response, so it's looked up once and cached. Pin ZOHO_MEETING_ZSOID to
 * skip that call entirely.
 */
const log = zohoLog("meeting");

let cachedZsoid = zohoConfig.zsoid || null;

const apiBase = () => zohoConfig.apiUrl.replace(/\/$/, "");

async function zohoFetch(path, { method = "GET", body } = {}) {
  const token = await getZohoAccessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page — keep the raw text for the message */
  }

  if (!res.ok) {
    const message = json?.message || json?.error?.message || text?.slice(0, 200) || `HTTP ${res.status}`;
    const err = new Error(`Zoho Meeting API ${method} ${path} failed: ${message}`);
    err.code = "ZOHO_API_FAILED";
    err.status = res.status;
    throw err;
  }
  return json;
}

async function getZsoid() {
  if (cachedZsoid) return cachedZsoid;
  const json = await zohoFetch("/api/v2/user.json");
  const zsoid =
    json?.userDetails?.zsoid ?? json?.zsoid ?? json?.userDetails?.zuid ?? null;
  if (!zsoid) {
    const err = new Error("Could not resolve the Zoho organisation id (zsoid)");
    err.code = "ZOHO_NO_ZSOID";
    throw err;
  }
  cachedZsoid = String(zsoid);
  log.info("resolved zsoid", { zsoid: cachedZsoid });
  return cachedZsoid;
}

/**
 * Zoho wants "MMM dd, yyyy hh:mm a" in the session's own timezone, e.g.
 * "Aug 12, 2026 03:30 PM". Built from the plain Y-M-D + HH:mm the form
 * collects, so no UTC round-trip can shift the day.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toZohoStartTime(ymd, hhmm) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const [h, min] = String(hhmm).split(":").map(Number);
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${MONTHS[m - 1]} ${String(d).padStart(2, "0")}, ${y} ${String(h12).padStart(2, "0")}:${String(
    min,
  ).padStart(2, "0")} ${ampm}`;
}

/** Pull the fields we persist out of whatever shape Zoho returns. */
function normalizeSession(json) {
  const s = json?.session ?? json?.sessions?.[0] ?? json ?? {};
  return {
    meetingId: String(s.meetingKey ?? s.sessionId ?? s.meetingId ?? ""),
    meetingKey: String(s.meetingKey ?? ""),
    joinUrl: s.joinLink ?? s.join_url ?? s.joinUrl ?? "",
    hostUrl: s.startLink ?? s.presenterJoinLink ?? s.hostUrl ?? "",
    meetingPassword: s.password ?? s.meetingPassword ?? "",
    startTime: s.startTime ?? "",
    endTime: s.endTime ?? "",
    status: s.status ?? "scheduled",
    raw: s,
  };
}

function agendaHtml() {
  return `<ul>${MEETING_DEFAULTS.agenda.map((a) => `<li>${a}</li>`).join("")}</ul>`;
}

function sessionPayload({ ymd, time, customerEmail, customerName, topic, durationMinutes }) {
  return {
    session: {
      topic: topic || MEETING_DEFAULTS.topic,
      agenda: agendaHtml(),
      presenter: zohoConfig.presenterEmail || undefined,
      startTime: toZohoStartTime(ymd, time),
      duration: Number(durationMinutes) > 0 ? Number(durationMinutes) : MEETING_DEFAULTS.durationMinutes,
      timezone: MEETING_DEFAULTS.timezone,
      participants: customerEmail
        ? [{ email: customerEmail, name: customerName || customerEmail }]
        : undefined,
    },
  };
}

export async function createZohoMeeting({ ymd, time, customerEmail, customerName, topic, durationMinutes }) {
  const zsoid = await getZsoid();
  const json = await zohoFetch(`/api/v2/${zsoid}/sessions.json`, {
    method: "POST",
    body: sessionPayload({ ymd, time, customerEmail, customerName, topic, durationMinutes }),
  });
  const session = normalizeSession(json);
  log.info("meeting created", { meetingKey: session.meetingKey, start: `${ymd} ${time}` });
  return session;
}

export async function updateZohoMeeting(
  meetingKey,
  { ymd, time, customerEmail, customerName, topic, durationMinutes },
) {
  const zsoid = await getZsoid();
  const json = await zohoFetch(`/api/v2/${zsoid}/sessions/${meetingKey}.json`, {
    method: "PUT",
    body: sessionPayload({ ymd, time, customerEmail, customerName, topic, durationMinutes }),
  });
  const session = normalizeSession(json);
  log.info("meeting updated", { meetingKey, start: `${ymd} ${time}` });
  return { ...session, meetingKey: session.meetingKey || String(meetingKey) };
}

export async function deleteZohoMeeting(meetingKey) {
  const zsoid = await getZsoid();
  await zohoFetch(`/api/v2/${zsoid}/sessions/${meetingKey}.json`, { method: "DELETE" });
  log.info("meeting deleted", { meetingKey });
  return true;
}
