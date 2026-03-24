import webpush from "web-push";

const DEFAULT_LATE_WINDOW_MS = 2 * 60 * 1000;

let configured = false;

function getPushEnv() {
  const subject = String(
    process.env.WEB_PUSH_SUBJECT || process.env.VAPID_SUBJECT || ""
  ).trim();
  const publicKey = String(
    process.env.WEB_PUSH_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ""
  ).trim();
  const privateKey = String(
    process.env.WEB_PUSH_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY || ""
  ).trim();

  return { subject, publicKey, privateKey };
}

function toNonNegativeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

export function ensurePushConfig() {
  const { subject, publicKey, privateKey } = getPushEnv();

  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "Missing push config. Set WEB_PUSH_SUBJECT, WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY or VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY"
    );
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
  const { publicKey } = getPushEnv();
  if (!publicKey) {
    throw new Error(
      "Missing push public key. Set WEB_PUSH_PUBLIC_KEY or VAPID_PUBLIC_KEY"
    );
  }
  return publicKey;
}

export { DEFAULT_LATE_WINDOW_MS };