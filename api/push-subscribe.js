import { DEVICES_SET_KEY, deviceHashKey, redisCommand } from "./_redis.js";

function isValidSubscription(subscription) {
  return Boolean(
    subscription &&
      typeof subscription === "object" &&
      typeof subscription.endpoint === "string" &&
      subscription.keys &&
      typeof subscription.keys.p256dh === "string" &&
      typeof subscription.keys.auth === "string"
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const deviceId = String(req.body?.deviceId || "").trim();
    const subscription = req.body?.subscription;

    if (!deviceId) {
      return res.status(400).json({ error: "Missing deviceId" });
    }

    if (!isValidSubscription(subscription)) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }

    const now = new Date().toISOString();
    const key = deviceHashKey(deviceId);

    await redisCommand(["SADD", DEVICES_SET_KEY, deviceId]);
    await redisCommand([
      "HSET",
      key,
      "subscription",
      JSON.stringify(subscription),
      "updatedAt",
      now,
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}