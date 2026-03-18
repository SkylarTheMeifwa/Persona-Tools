import { DEVICES_SET_KEY, deviceHashKey, redisCommand } from "./_redis.js";

function sanitizeReminder(reminder) {
  if (!reminder || typeof reminder !== "object") return null;

  const id = String(reminder.id || "").trim();
  const dueAt = String(reminder.dueAt || "").trim();

  if (!id || !dueAt || Number.isNaN(new Date(dueAt).getTime())) {
    return null;
  }

  return {
    id,
    dueAt,
    title: String(reminder.title || "Persona Tools Reminder"),
    body: String(reminder.body || "You have an upcoming due date."),
    url: String(reminder.url || "/index.html"),
    badgeCount: Number.isFinite(reminder.badgeCount) ? Math.max(0, Number(reminder.badgeCount)) : 1,
    startOffsetMinutes: Math.max(0, Number(reminder.startOffsetMinutes) || 0),
    repeatIntervalMinutes: Math.max(0, Number(reminder.repeatIntervalMinutes) || 0),
    repeatCount: Math.max(0, Math.floor(Number(reminder.repeatCount) || 0)),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const deviceId = String(req.body?.deviceId || "").trim();
    const source = String(req.body?.source || "").trim().toLowerCase();
    const reminders = Array.isArray(req.body?.reminders) ? req.body.reminders : [];

    if (!deviceId) {
      return res.status(400).json({ error: "Missing deviceId" });
    }

    if (!source) {
      return res.status(400).json({ error: "Missing source" });
    }

    const sanitized = reminders.map(sanitizeReminder).filter(Boolean);
    const key = deviceHashKey(deviceId);
    const rawScopes = await redisCommand(["HGET", key, "reminderScopes"]);

    let scopes = {};
    if (typeof rawScopes === "string" && rawScopes) {
      try {
        const parsed = JSON.parse(rawScopes);
        if (parsed && typeof parsed === "object") {
          scopes = parsed;
        }
      } catch (_) {
        scopes = {};
      }
    }

    scopes[source] = sanitized;

    const allReminders = Object.values(scopes).flat();
    const now = new Date().toISOString();

    await redisCommand(["SADD", DEVICES_SET_KEY, deviceId]);
    await redisCommand([
      "HSET",
      key,
      "reminderScopes",
      JSON.stringify(scopes),
      "reminders",
      JSON.stringify(allReminders),
      "updatedAt",
      now,
    ]);

    res.status(200).json({ success: true, count: allReminders.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}