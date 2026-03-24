window.addEventListener("DOMContentLoaded", () => {
  const serviceWorkerUrl = "../service-worker.js";
  const modeStorageKey = "p5-navbar-font-mode";
  const fontForm = document.getElementById("font-settings-form");
  const status = document.getElementById("font-mode-status");
  const notificationStatus = document.getElementById("notification-status");
  const enableNotificationsBtn = document.getElementById("enable-notifications-btn");
  const syncNotificationsBtn = document.getElementById("sync-notifications-btn");
  const sendTestNotificationBtn = document.getElementById("send-test-notification-btn");
  const clearBadgeBtn = document.getElementById("clear-badge-btn");

  const setStatus = (message) => {
    if (status) {
      status.textContent = message;
    }
  };

  const setNotificationStatus = (message) => {
    if (notificationStatus) {
      notificationStatus.textContent = message;
    }
  };

  const params = new URLSearchParams(window.location.search);
  const dropboxToken = params.get("dropbox_token");
  const dropboxError = params.get("dropbox_error");

  if (dropboxToken) {
    localStorage.setItem("dropbox_token", dropboxToken);
    setStatus("Dropbox connected.");
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (dropboxError) {
    if (dropboxError === "code_used") {
      setStatus("Dropbox login expired. Please click Connect Dropbox again.");
    } else if (dropboxError === "state_mismatch") {
      setStatus("Dropbox login could not be verified. Please try again.");
    } else {
      setStatus("Dropbox login failed. Please try again.");
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  let swRegistrationPromise = null;

  const base64UrlToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(normalized);
    const output = new Uint8Array(raw.length);

    for (let i = 0; i < raw.length; i += 1) {
      output[i] = raw.charCodeAt(i);
    }

    return output;
  };

  const getPushDeviceId = () => {
    const storageKey = "p5PushDeviceId";
    let deviceId = localStorage.getItem(storageKey);

    if (!deviceId) {
      deviceId =
        ("dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)).toLowerCase();
      localStorage.setItem(storageKey, deviceId);
    }

    return deviceId;
  };

  const getServiceWorkerRegistration = async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported in this browser.");
    }

    if (!swRegistrationPromise) {
      swRegistrationPromise = navigator.serviceWorker
        .getRegistration()
        .then((existingRegistration) => {
          if (existingRegistration) {
            return existingRegistration;
          }

          return navigator.serviceWorker.register(serviceWorkerUrl);
        });
    }

    return swRegistrationPromise;
  };

  const registerPushSubscription = async () => {
    if (!window.isSecureContext) {
      throw new Error("Push requires HTTPS or localhost.");
    }

    const registration = await getServiceWorkerRegistration();
    const keyResponse = await fetch("/api/push-public-key");

    if (!keyResponse.ok) {
      const payload = await keyResponse.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to fetch push configuration.");
    }

    const { publicKey } = await keyResponse.json();
    if (!publicKey) {
      throw new Error("Missing push public key.");
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      });
    }

    const response = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getPushDeviceId(),
        subscription,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to save push subscription.");
    }
  };

  window.P5Push = {
    getPushDeviceId,
    registerPushSubscription,
  };

  const updateNotificationUiState = () => {
    const permission = "Notification" in window ? Notification.permission : "denied";
    const enabled = permission === "granted";

    if (sendTestNotificationBtn) {
      sendTestNotificationBtn.disabled = !enabled;
    }

    if (clearBadgeBtn) {
      clearBadgeBtn.disabled = false;
    }

    if (permission === "granted") {
      setNotificationStatus("Notifications are enabled.");
      return;
    }

    if (permission === "denied") {
      setNotificationStatus("Notifications are blocked in browser settings.");
      return;
    }

    setNotificationStatus("Notifications are not enabled yet.");
  };

  const applyModeToDocument = (mode) => {
    document.documentElement.classList.toggle("p5-font-readable", mode === "readable");
  };

  const applyModeToActiveNavbar = (mode) => {
    const nav = document.querySelector(".p5-navbar");
    if (!nav) {
      return;
    }

    nav.classList.toggle("font-readable", mode === "readable");
  };

  const currentMode = localStorage.getItem(modeStorageKey) === "readable" ? "readable" : "default";
  const currentRadio = document.querySelector(
    `input[name="navbar-font-mode"][value="${currentMode}"]`
  );

  if (currentRadio) {
    currentRadio.checked = true;
  }

  applyModeToDocument(currentMode);
  applyModeToActiveNavbar(currentMode);
  setStatus(
    currentMode === "readable"
      ? "Readable mode is active."
      : "Default mode is active."
  );

  if (fontForm) {
    fontForm.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.name !== "navbar-font-mode") {
        return;
      }

      const mode = target.value === "readable" ? "readable" : "default";
      localStorage.setItem(modeStorageKey, mode);
      applyModeToDocument(mode);
      applyModeToActiveNavbar(mode);

      setStatus(
        mode === "readable"
          ? "Readable mode saved."
          : "Default mode saved."
      );
    });
  }

  updateNotificationUiState();

  if (enableNotificationsBtn) {
    enableNotificationsBtn.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        setNotificationStatus("This browser does not support notifications.");
        return;
      }

      try {
        await getServiceWorkerRegistration();
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          await registerPushSubscription();
          setNotificationStatus("Notifications enabled for closed-app push reminders.");
        } else if (permission === "denied") {
          setNotificationStatus("Notifications denied. Enable them in browser site settings.");
        } else {
          setNotificationStatus("Notification permission request dismissed.");
        }
      } catch (error) {
        setNotificationStatus(`Unable to enable notifications: ${error.message}`);
      }

      updateNotificationUiState();
    });
  }

  if (sendTestNotificationBtn) {
    sendTestNotificationBtn.addEventListener("click", async () => {
      try {
        if (Notification.permission !== "granted") {
          setNotificationStatus("Enable notifications first.");
          return;
        }

        const registration = await getServiceWorkerRegistration();
        if (!registration.active) {
          setNotificationStatus("Service worker is still starting. Please try again.");
          return;
        }

        registration.active.postMessage({ type: "SHOW_TEST_NOTIFICATION", url: window.location.pathname });
        setNotificationStatus("Test notification sent.");
      } catch (error) {
        setNotificationStatus(`Unable to send test notification: ${error.message}`);
      }
    });
  }

  if (clearBadgeBtn) {
    clearBadgeBtn.addEventListener("click", async () => {
      try {
        const registration = await getServiceWorkerRegistration();
        if (!registration.active) {
          setNotificationStatus("Service worker is still starting. Please try again.");
          return;
        }

        registration.active.postMessage({ type: "CLEAR_BADGE" });
        setNotificationStatus("Badge clear requested.");
      } catch (error) {
        setNotificationStatus(`Unable to clear badge: ${error.message}`);
      }
    });
  }

  if (syncNotificationsBtn) {
    syncNotificationsBtn.addEventListener("click", async () => {
      const originalLabel = syncNotificationsBtn.textContent;
      syncNotificationsBtn.disabled = true;
      syncNotificationsBtn.textContent = "Syncing...";

      try {
        if (Notification.permission === "granted") {
          await registerPushSubscription();
        }

        const response = await fetch("/api/push-cron", { method: "GET" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Manual sync failed.");
        }

        const mode = payload.mode || "unknown";
        const scheduledCount = Number.isFinite(payload.scheduledCount)
          ? payload.scheduledCount
          : 0;
        const sentCount = Number.isFinite(payload.sentCount) ? payload.sentCount : 0;

        setNotificationStatus(
          `Sync complete (${mode}). Scheduled ${scheduledCount}, sent ${sentCount}.`
        );
      } catch (error) {
        setNotificationStatus(`Unable to sync notifications: ${error.message}`);
      } finally {
        syncNotificationsBtn.disabled = false;
        syncNotificationsBtn.textContent = originalLabel;
      }
    });
  }

  navigator.serviceWorker?.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "CLEAR_BADGE") {
      setNotificationStatus("Badge cleared.");
    }
  });
});
