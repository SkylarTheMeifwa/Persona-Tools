import { createHmac } from "node:crypto";

import { DEFAULT_LATE_WINDOW_MS, getOccurrenceTimes, sendPush } from "./_push.js";
import {
  DEVICES_SET_KEY,
  deviceHashKey,
  redisCommand,
  scheduledReminderKey,
  sentReminderKey,
} from "./_redis.js";

const SENT_TTL_SECONDS = 60 * 60 * 24 * 7;
const MIN_DELAY_MS = 30 * 1000;
const DEFAULT_SCHEDULE_HORIZON_HOURS = 36;

function getFieldFromHGetAll(result, fieldName) {
  if (!Array.isArray(result)) return null;

  for (let i = 0; i < result.length; i += 2) {
    if (result[i] === fieldName) {
      return result[i + 1] || null;
    }
  }

  return null;
}

function parseReminders(raw) {
  if (!raw || typeof raw !== "string") return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
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

async function markScheduledOnce(deliveryId) {
  const key = scheduledReminderKey(deliveryId);
  const result = await redisCommand(["SET", key, "1", "EX", String(SENT_TTL_SECONDS), "NX"]);
  return result === "OK";
}

async function removeDevice(deviceId) {
  await redisCommand(["SREM", DEVICES_SET_KEY, deviceId]);
  await redisCommand(["DEL", deviceHashKey(deviceId)]);
}

function getBaseUrl() {
  const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || "").trim();
  if (publicBaseUrl) {
    return publicBaseUrl.replace(/\/$/, "");
  }

  const vercelUrl = String(process.env.VERCEL_URL || "").trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "";
}

function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

async function scheduleDispatchJob({ delayMs, payload, dispatchUrl }) {
  const qstashToken = String(process.env.QSTASH_TOKEN || "").trim();
  if (!qstashToken) {
    throw new Error("Missing QSTASH_TOKEN");
  }

  const delaySeconds = Math.max(1, Math.ceil(delayMs / 1000));

  const response = await fetch(
    `https://qstash.upstash.io/v2/publish/${encodeURIComponent(dispatchUrl)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${qstashToken}`,
        "Content-Type": "application/json",
        "Upstash-Method": "POST",
        "Upstash-Delay": `${delaySeconds}s`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`QStash publish failed (${response.status}): ${body}`);
  }
}

async function dispatchImmediately({ deviceId, subscription, reminder, index }) {
  const now = Date.now();
  const occurrences = getOccurrenceTimes(reminder, DEFAULT_LATE_WINDOW_MS);
  const occurrence = occurrences[index];

  if (!Number.isFinite(occurrence)) return false;
  if (now < occurrence) return false;
  if (now - occurrence > DEFAULT_LATE_WINDOW_MS) return false;

  const deliveryId = `${deviceId}:${reminder.id}:${index}`;
  const shouldSend = await markSentOnce(deliveryId);
  if (!shouldSend) return false;

  try {
    await sendPush(subscription, {
      title: reminder.title || "Persona Tools Reminder",
      body: reminder.body || "You have an upcoming due date.",
      url: reminder.url || "/index.html",
      badgeCount: Number.isFinite(reminder.badgeCount)
        ? Math.max(0, Number(reminder.badgeCount))
        : 1,
    });
    return true;
  } catch (error) {
    if (error && (error.statusCode === 404 || error.statusCode === 410)) {
      await removeDevice(deviceId);
    }

    return false;
  }
}

function canScheduleWithQStash() {
  const baseUrl = getBaseUrl();
  const hasAllVars =
    baseUrl &&
    String(process.env.QSTASH_TOKEN || "").trim() &&
    String(process.env.PUSH_SCHEDULER_SECRET || "").trim();

  return Boolean(hasAllVars);
}

export default async function handler(_req, res) {
  try {
    const now = Date.now();
    const horizonHours = Math.max(
      1,
      Math.floor(toFiniteNumber(process.env.PUSH_SCHEDULE_HORIZON_HOURS, DEFAULT_SCHEDULE_HORIZON_HOURS))
    );
    const scheduleHorizonMs = horizonHours * 60 * 60 * 1000;
    const scheduleCutoff = now + scheduleHorizonMs;
    const shouldUseQStash = canScheduleWithQStash();
    const dispatchUrl = shouldUseQStash ? `${getBaseUrl()}/api/push-dispatch` : "";

    const deviceIds = await redisCommand(["SMEMBERS", DEVICES_SET_KEY]);
    const ids = Array.isArray(deviceIds) ? deviceIds : [];

    let processedDevices = 0;
    let sentCount = 0;
    let scheduledCount = 0;

    for (const deviceId of ids) {
      const rawDevice = await redisCommand(["HGETALL", deviceHashKey(deviceId)]);
      const subscription = parseSubscription(getFieldFromHGetAll(rawDevice, "subscription"));
      const reminders = parseReminders(getFieldFromHGetAll(rawDevice, "reminders"));

      if (!subscription || reminders.length === 0) {
        processedDevices += 1;
        continue;
      }

      for (const reminder of reminders) {
        const occurrences = getOccurrenceTimes(reminder, DEFAULT_LATE_WINDOW_MS);

        for (let index = 0; index < occurrences.length; index += 1) {
          const occurrence = occurrences[index];
          const deliveryId = `${deviceId}:${reminder.id}:${index}`;

          if (shouldUseQStash) {
            if (occurrence < now + MIN_DELAY_MS) {
              const sent = await dispatchImmediately({ deviceId, subscription, reminder, index });
              if (sent) sentCount += 1;
              continue;
            }

            if (occurrence > scheduleCutoff) continue;

            const shouldSchedule = await markScheduledOnce(deliveryId);
            if (!shouldSchedule) continue;

            const dispatchToken = createDispatchToken(deliveryId, occurrence);

            await scheduleDispatchJob({
              delayMs: occurrence - now,
              dispatchUrl,
              payload: {
                deviceId,
                reminder,
                occurrence,
                deliveryId,
                dispatchToken,
              },
            });

            scheduledCount += 1;
            continue;
          }

          const sent = await dispatchImmediately({ deviceId, subscription, reminder, index });
          if (sent) sentCount += 1;
        }
      }

      processedDevices += 1;
    }

    res.status(200).json({
      success: true,
      mode: shouldUseQStash ? "scheduled" : "fallback-direct",
      horizonHours,
      processedDevices,
      sentCount,
      scheduledCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}