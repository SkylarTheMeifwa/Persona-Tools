(function () {
  const DELIVERY_LOG_KEY = "p5ReminderDeliveryLog";
  const CHECK_INTERVAL_MS = 60 * 1000;
  const DEFAULT_DELIVERY_GRACE_MS = 2 * 60 * 1000;
  const SYNC_INTERVAL_MS = 60 * 1000;

  let runningTimer = null;
  let deliveryGraceMs = DEFAULT_DELIVERY_GRACE_MS;
  let lastSyncAt = 0;
  let lastSyncedSnapshot = "";

  function getPushDeviceId() {
    const storageKey = "p5PushDeviceId";
    let deviceId = localStorage.getItem(storageKey);

    if (!deviceId) {
      deviceId =
        ("dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)).toLowerCase();
      localStorage.setItem(storageKey, deviceId);
    }

    return deviceId;
  }

  function base64UrlToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(normalized);
    const output = new Uint8Array(raw.length);

    for (let i = 0; i < raw.length; i += 1) {
      output[i] = raw.charCodeAt(i);
    }

    return output;
  }

  async function ensurePushSubscription() {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    const registration =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register("service-worker.js"));

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const keyResponse = await fetch("/api/push-public-key");
      if (!keyResponse.ok) return;

      const { publicKey } = await keyResponse.json();
      if (!publicKey) return;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      });
    }

    await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getPushDeviceId(),
        subscription,
      }),
    });
  }

  async function syncRemindersToServer(source, reminders, force = false) {
    if (!source || !window.isSecureContext || !navigator.onLine) {
      return;
    }

    const now = Date.now();
    const snapshot = JSON.stringify(reminders);
    const shouldSync = force || snapshot !== lastSyncedSnapshot || now - lastSyncAt >= SYNC_INTERVAL_MS;

    if (!shouldSync) {
      return;
    }

    try {
      if (window.P5Push && typeof window.P5Push.registerPushSubscription === "function") {
        await window.P5Push.registerPushSubscription();
      } else {
        await ensurePushSubscription();
      }

      const response = await fetch("/api/push-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: getPushDeviceId(),
          source,
          reminders,
        }),
      });

      if (!response.ok) {
        return;
      }

      lastSyncAt = now;
      lastSyncedSnapshot = snapshot;
    } catch (_) {
      // Ignore sync failures and keep local reminder behavior active.
    }
  }

  function readDeliveryLog() {
    try {
      const raw = localStorage.getItem(DELIVERY_LOG_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeDeliveryLog(log) {
    localStorage.setItem(DELIVERY_LOG_KEY, JSON.stringify(log));
  }

  async function showNotification(reminder) {
    if (!("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;

    const payload = {
      type: "SHOW_LOCAL_REMINDER",
      title: reminder.title || "Persona Tools Reminder",
      body: reminder.body || "You have an upcoming due date.",
      url: reminder.url || "/index.html",
      badgeCount: Number.isFinite(reminder.badgeCount) ? Math.max(0, reminder.badgeCount) : 1,
    };

    if ("serviceWorker" in navigator) {
      try {
        const registration =
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.register("service-worker.js"));

        if (registration.active) {
          registration.active.postMessage(payload);
          return true;
        }

        await registration.update();
      } catch (_) {
        // Fall back to Notification constructor below.
      }
    }

    try {
      new Notification(payload.title, { body: payload.body });
      return true;
    } catch (_) {
      return false;
    }
  }

  function getOccurrenceTimes(reminder) {
    const dueAt = new Date(reminder.dueAt).getTime();
    if (!Number.isFinite(dueAt)) return [];

    const leadMinutes = Math.max(0, Number(reminder.startOffsetMinutes) || 0);
    const repeatIntervalMinutes = Math.max(0, Number(reminder.repeatIntervalMinutes) || 0);
    const repeatCount = Math.max(0, Number(reminder.repeatCount) || 0);

    const firstTrigger = dueAt - leadMinutes * 60 * 1000;
    if (!Number.isFinite(firstTrigger)) return [];

    const times = [firstTrigger];
    if (repeatIntervalMinutes <= 0 || repeatCount <= 0) {
      return times;
    }

    for (let i = 1; i <= repeatCount; i += 1) {
      const nextTime = firstTrigger + i * repeatIntervalMinutes * 60 * 1000;
      if (nextTime <= dueAt + deliveryGraceMs) {
        times.push(nextTime);
      }
    }

    return times;
  }

  async function evaluateAndNotify(reminders) {
    const now = Date.now();
    const deliveryLog = readDeliveryLog();
    let changed = false;

    for (const reminder of reminders) {
      if (!reminder || !reminder.id || !reminder.dueAt) continue;

      const occurrences = getOccurrenceTimes(reminder);
      for (let index = 0; index < occurrences.length; index += 1) {
        const occurrence = occurrences[index];
        const deliveryId = reminder.id + ":" + index;
        const alreadySentAt = deliveryLog[deliveryId];

        if (alreadySentAt) continue;
        if (now < occurrence) continue;
        if (now - occurrence > deliveryGraceMs) continue;

        const sent = await showNotification(reminder);
        if (sent) {
          deliveryLog[deliveryId] = now;
          changed = true;
        }
      }
    }

    if (changed) {
      writeDeliveryLog(deliveryLog);
    }
  }

  function start(options) {
    const getReminders = typeof options.getReminders === "function" ? options.getReminders : () => [];
    const maxLateMinutes = Number(options?.maxLateMinutes);
    const syncSource = String(options?.syncSource || "").trim().toLowerCase();
    const enableServerSync = options?.enableServerSync !== false;
    deliveryGraceMs = Number.isFinite(maxLateMinutes) && maxLateMinutes >= 0
      ? maxLateMinutes * 60 * 1000
      : DEFAULT_DELIVERY_GRACE_MS;

    const tick = async () => {
      const reminders = getReminders();
      if (!Array.isArray(reminders)) return;
      if (enableServerSync && syncSource) {
        await syncRemindersToServer(syncSource, reminders);
      }
      if (reminders.length === 0) return;
      await evaluateAndNotify(reminders);
    };

    tick();

    if (runningTimer) {
      clearInterval(runningTimer);
    }

    runningTimer = window.setInterval(tick, CHECK_INTERVAL_MS);
  }

  function formatSummary(config, baseUnitLabel) {
    if (!config || !config.enabled) return "Notifications off";

    const offset = Math.max(0, Number(config.startOffset) || 0);
    const repeatEvery = Math.max(0, Number(config.repeatEvery) || 0);
    const repeatCount = Math.max(0, Number(config.repeatCount) || 0);

    const primary = `${offset} ${baseUnitLabel} before due`;
    if (repeatEvery <= 0 || repeatCount <= 0) {
      return primary;
    }

    return `${primary}, repeat every ${repeatEvery} ${baseUnitLabel} x${repeatCount}`;
  }

  window.P5ReminderEngine = {
    start,
    evaluateAndNotify,
    formatSummary,
  };
})();
