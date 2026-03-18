import { createHmac, timingSafeEqual } from "node:crypto";

import { sendPush } from "./_push.js";
import { DEVICES_SET_KEY, deviceHashKey, redisCommand, sentReminderKey } from "./_redis.js";

const SENT_TTL_SECONDS = 60 * 60 * 24 * 7;

function getFieldFromHGetAll(result, fieldName) {
  if (!Array.isArray(result)) return null;

  for (let i = 0; i < result.length; i += 2) {
    if (result[i] === fieldName) {
      return result[i + 1] || null;
    }
  }

  return null;
}

function parseSubscription(raw) {
  if (!raw || typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.endpoint === "string" &&
      parsed.keys &&
      typeof parsed.keys.p256dh === "string" &&
      typeof parsed.keys.auth === "string"
    ) {
      return parsed;
    }
  } catch (_) {
    return null;
  }

  return null;
}

async function markSentOnce(deliveryId) {
  const key = sentReminderKey(deliveryId);
  const result = await redisCommand(["SET", key, "1", "EX", String(SENT_TTL_SECONDS), "NX"]);
  return result === "OK";
}

async function removeDevice(deviceId) {
  await redisCommand(["SREM", DEVICES_SET_KEY, deviceId]);
  await redisCommand(["DEL", deviceHashKey(deviceId)]);
}

function createDispatchToken(deliveryId, occurrence) {
  const secret = String(process.env.PUSH_SCHEDULER_SECRET || "").trim();
  if (!secret) {
    throw new Error("Missing PUSH_SCHEDULER_SECRET");
  }

  return createHmac("sha256", secret)
    .update(`${deliveryId}:${occurrence}`)
    .digest("hex");
}

function tokenEquals(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const deviceId = String(req.body?.deviceId || "").trim();
    const deliveryId = String(req.body?.deliveryId || "").trim();
    const occurrence = Number(req.body?.occurrence);
    const dispatchToken = String(req.body?.dispatchToken || "").trim();
    const reminder = req.body?.reminder;

    if (!deviceId || !deliveryId || !Number.isFinite(occurrence)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!reminder || typeof reminder !== "object") {
      return res.status(400).json({ error: "Invalid reminder payload" });
    }

    const expectedToken = createDispatchToken(deliveryId, occurrence);
    if (!tokenEquals(dispatchToken, expectedToken)) {
      return res.status(401).json({ error: "Invalid dispatch token" });
    }

    const shouldSend = await markSentOnce(deliveryId);
    if (!shouldSend) {
      return res.status(200).json({ success: true, deduped: true });
    }

    const rawDevice = await redisCommand(["HGETALL", deviceHashKey(deviceId)]);
    const subscription = parseSubscription(getFieldFromHGetAll(rawDevice, "subscription"));
    if (!subscription) {
      return res.status(200).json({ success: true, skipped: "missing-subscription" });
    }

    try {
      await sendPush(subscription, {
        title: reminder.title || "Persona Tools Reminder",
        body: reminder.body || "You have an upcoming due date.",
        url: reminder.url || "/index.html",
        badgeCount: Number.isFinite(reminder.badgeCount)
          ? Math.max(0, Number(reminder.badgeCount))
          : 1,
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      if (error && (error.statusCode === 404 || error.statusCode === 410)) {
        await removeDevice(deviceId);
        return res.status(200).json({ success: true, removedDevice: true });
      }

      throw error;
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
