window.addEventListener("DOMContentLoaded", () => {
  const modeStorageKey = "p5-navbar-font-mode";
  const fontForm = document.getElementById("font-settings-form");
  const status = document.getElementById("font-mode-status");
  const notificationStatus = document.getElementById("notification-status");
  const enableNotificationsBtn = document.getElementById("enable-notifications-btn");
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
    window.history.replaceState({}, document.title, "/settings.html");
  } else if (dropboxError) {
    if (dropboxError === "code_used") {
      setStatus("Dropbox login expired. Please click Connect Dropbox again.");
    } else if (dropboxError === "state_mismatch") {
      setStatus("Dropbox login could not be verified. Please try again.");
    } else {
      setStatus("Dropbox login failed. Please try again.");
    }
    window.history.replaceState({}, document.title, "/settings.html");
  }

  let swRegistrationPromise = null;

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

          return navigator.serviceWorker.register("service-worker.js");
        });
    }

    return swRegistrationPromise;
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
          setNotificationStatus("Notifications enabled.");
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

        registration.active.postMessage({ type: "SHOW_TEST_NOTIFICATION" });
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

  navigator.serviceWorker?.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "CLEAR_BADGE") {
      setNotificationStatus("Badge cleared.");
    }
  });
});
