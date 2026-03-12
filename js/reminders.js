(function () {
  const DELIVERY_LOG_KEY = "p5ReminderDeliveryLog";
  const CHECK_INTERVAL_MS = 60 * 1000;
  const DELIVERY_GRACE_MS = 6 * 60 * 60 * 1000;

  let runningTimer = null;

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
      if (nextTime <= dueAt + DELIVERY_GRACE_MS) {
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
        if (now - occurrence > DELIVERY_GRACE_MS) continue;

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

    const tick = async () => {
      const reminders = getReminders();
      if (!Array.isArray(reminders) || reminders.length === 0) return;
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
