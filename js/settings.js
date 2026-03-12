window.addEventListener("DOMContentLoaded", () => {
  const modeStorageKey = "p5-navbar-font-mode";
  const fontForm = document.getElementById("font-settings-form");
  const status = document.getElementById("font-mode-status");

  const setStatus = (message) => {
    if (status) {
      status.textContent = message;
    }
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
});
