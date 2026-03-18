import { DEFAULT_LATE_WINDOW_MS, getOccurrenceTimes, sendPush } from "./_push.js";
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

async function removeDevice(deviceId) {
  await redisCommand(["SREM", DEVICES_SET_KEY, deviceId]);
  await redisCommand(["DEL", deviceHashKey(deviceId)]);
}

export default async function handler(_req, res) {
  try {
    const now = Date.now();
    const deviceIds = await redisCommand(["SMEMBERS", DEVICES_SET_KEY]);
    const ids = Array.isArray(deviceIds) ? deviceIds : [];

    let processedDevices = 0;
    let sentCount = 0;

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
          if (now < occurrence) continue;
          if (now - occurrence > DEFAULT_LATE_WINDOW_MS) continue;

          const deliveryId = `${deviceId}:${reminder.id}:${index}`;
          const shouldSend = await markSentOnce(deliveryId);
          if (!shouldSend) continue;

          try {
            await sendPush(subscription, {
              title: reminder.title || "Persona Tools Reminder",
              body: reminder.body || "You have an upcoming due date.",
              url: reminder.url || "/index.html",
              badgeCount: Number.isFinite(reminder.badgeCount)
                ? Math.max(0, Number(reminder.badgeCount))
                : 1,
            });
            sentCount += 1;
          } catch (error) {
            if (error && (error.statusCode === 404 || error.statusCode === 410)) {
              await removeDevice(deviceId);
              break;
            }

            // Keep processing the remaining reminders for non-expired subscriptions.
          }
        }
      }

      processedDevices += 1;
    }

    res.status(200).json({ success: true, processedDevices, sentCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}