const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function ensureRedisConfig() {
  if (!redisUrl || !redisToken) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }
}

export async function redisCommand(command) {
  ensureRedisConfig();

  const response = await fetch(`${redisUrl}/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Redis command failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`Redis error: ${payload.error}`);
  }

  return payload.result;
}

export const deviceHashKey = (deviceId) => `p5:device:${deviceId}`;
export const sentReminderKey = (deliveryId) => `p5:sent:${deliveryId}`;
export const DEVICES_SET_KEY = "p5:devices";