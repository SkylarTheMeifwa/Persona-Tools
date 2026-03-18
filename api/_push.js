import webpush from "web-push";

const DEFAULT_LATE_WINDOW_MS = 2 * 60 * 1000;

let configured = false;

function toNonNegativeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

export function ensurePushConfig() {
  const subject = process.env.WEB_PUSH_SUBJECT;
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error("Missing WEB_PUSH_SUBJECT / WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY");
  }

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return { subject, publicKey, privateKey };
}

export function getOccurrenceTimes(reminder, lateWindowMs = DEFAULT_LATE_WINDOW_MS) {
  const dueAt = new Date(reminder?.dueAt).getTime();
  if (!Number.isFinite(dueAt)) return [];

  const leadMinutes = Math.max(0, Number(reminder.startOffsetMinutes) || 0);
  const repeatIntervalMinutes = Math.max(0, Number(reminder.repeatIntervalMinutes) || 0);
  const repeatCount = toNonNegativeInt(reminder.repeatCount, 0);

  const firstTrigger = dueAt - leadMinutes * 60 * 1000;
  if (!Number.isFinite(firstTrigger)) return [];

  const times = [firstTrigger];
  if (repeatIntervalMinutes <= 0 || repeatCount <= 0) {
    return times;
  }

  for (let i = 1; i <= repeatCount; i += 1) {
    const nextTime = firstTrigger + i * repeatIntervalMinutes * 60 * 1000;
    if (nextTime <= dueAt + lateWindowMs) {
      times.push(nextTime);
    }
  }

  return times;
}

export async function sendPush(subscription, payload) {
  ensurePushConfig();
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

export function getPublicVapidKey() {
  const { publicKey } = ensurePushConfig();
  return publicKey;
}

export { DEFAULT_LATE_WINDOW_MS };