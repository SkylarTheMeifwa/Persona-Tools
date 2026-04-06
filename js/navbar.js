(function () {
  const pagePrefix = window.location.pathname.includes("/pages/") ? "../" : "";
  const statSubnavStorageKey = "p5-stat-subnav-visible";
  const financeSubnavStorageKey = "p5-finance-subnav-visible";
  const navbarFontModeStorageKey = "p5-navbar-font-mode";
  const navbarFontMode = window.localStorage.getItem(navbarFontModeStorageKey);
  const isReadableMode = navbarFontMode === "readable";
  const fontAwesomeKitUrl = "https://kit.fontawesome.com/bad9427839.js";

  document.documentElement.classList.toggle("p5-font-readable", isReadableMode);

  if (!document.querySelector(`script[src="${fontAwesomeKitUrl}"]`)) {
    const fontAwesomeScript = document.createElement("script");
    fontAwesomeScript.src = fontAwesomeKitUrl;
    fontAwesomeScript.crossOrigin = "anonymous";
    document.head.appendChild(fontAwesomeScript);
  }

  // Inject navbar CSS if not already present
  if (!document.querySelector(`link[href="${pagePrefix}css/navbar.css"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${pagePrefix}css/navbar.css`;
    document.head.appendChild(link);
  }

  fetch(`${pagePrefix}assets/navbar.html`)
    .then((res) => res.text())
    .then((html) => {
      const container = document.createElement("div");
      container.innerHTML = html.trim();
      const nav = container.firstChild;
      const dropdowns = nav.querySelectorAll(".p5-dropdown:not(.p5-stat-dropdown):not(.p5-finance-dropdown)");

      const closeAllDropdowns = () => {
        dropdowns.forEach((dropdown) => {
          dropdown.classList.remove("p5-dropdown-open");
          const toggle = dropdown.querySelector(".p5-dropdown-toggle");
          if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
          }
        });
      };

      const setDropdownOpen = (dropdown, open) => {
        if (!dropdown) {
          return;
        }

        const toggle = dropdown.querySelector(".p5-dropdown-toggle");
        dropdown.classList.toggle("p5-dropdown-open", open);
        if (toggle) {
          toggle.setAttribute("aria-expanded", open ? "true" : "false");
        }
      };

      // Factory function to create a subnav toggle manager
      const createSubnavManager = (config) => {
        const {
          subnav,
          toggle,
          storageKey,
          bodyClass,
          pageFiles,
          links,
          nonLinks,
          collapsedClass,
        } = config;

        if (!subnav || !toggle) {
          return null;
        }

        const toggleIcon = toggle.querySelector("i.fa-solid");

        const setToggleIcon = (visible) => {
          if (!toggleIcon) {
            return;
          }
          toggleIcon.classList.toggle("fa-angle-down", !visible);
          toggleIcon.classList.toggle("fa-angle-up", visible);
        };

        const setVisible = (visible) => {
          if (visible) {
            document.body.classList.add(bodyClass);
            subnav.hidden = false;
            window.localStorage.setItem(storageKey, "true");
            setToggleIcon(true);
          } else {
            document.body.classList.remove(bodyClass);
            subnav.hidden = true;
            window.localStorage.setItem(storageKey, "false");
            setToggleIcon(false);
          }
        };

        return { toggle, setVisible, setToggleIcon, toggleIcon, pageFiles, links, nonLinks, collapsedClass, bodyClass };
      };

      if (isReadableMode) {
        nav.classList.add("font-readable");
      }

      // Mark the active link based on the current page filename
      const currentFile =
        decodeURIComponent(window.location.pathname.split("/").pop() || "index.html");

      // Create managers for both stat and finance subnavs
      const statManager = createSubnavManager({
        subnav: nav.querySelector(".p5-stat-subnav"),
        toggle: nav.querySelector(".p5-stat-dropdown-toggle"),
        storageKey: statSubnavStorageKey,
        bodyClass: "has-stat-subnav",
        pageFiles: [
          "I-Belieeevee-We-Can-Flyyy-Up-In-The-Sky.html",
          "You'll-Never-See-It-Comiiingggg.html",
        ],
        links: nav.querySelectorAll(
          '.p5-dropdown-menu a[href="I-Belieeevee-We-Can-Flyyy-Up-In-The-Sky.html"], .p5-dropdown-menu a[href="You%27ll-Never-See-It-Comiiingggg.html"], .p5-stat-subnav a'
        ),
        nonLinks: nav.querySelectorAll(
          'a[href="../index.html"], a[href="Finances.html"], a[href="Groceries.html"], a[href="settings.html"], a[href="mementos-requests.html"], a[href="Time-To-Retake-Your-Desires.html"]'
        ),
        collapsedClass: "stat-subnav-collapsed",
      });

      const financeManager = createSubnavManager({
        subnav: nav.querySelector(".p5-finance-subnav"),
        toggle: nav.querySelector(".p5-finance-dropdown-toggle"),
        storageKey: financeSubnavStorageKey,
        bodyClass: "has-finance-subnav",
        pageFiles: ["Finances.html", "Groceries.html", "GasCalculator.html"],
        links: nav.querySelectorAll(
          '.p5-dropdown-menu a[href="Finances.html"], .p5-dropdown-menu a[href="Groceries.html"], .p5-finance-subnav a'
        ),
        nonLinks: nav.querySelectorAll(
          'a[href="../index.html"], a[href="I-Belieeevee-We-Can-Flyyy-Up-In-The-Sky.html"], a[href="You%27ll-Never-See-It-Comiiingggg.html"], a[href="settings.html"], a[href="mementos-requests.html"], a[href="Time-To-Retake-Your-Desires.html"]'
        ),
        collapsedClass: "finance-subnav-collapsed",
      });

      // Initialize both managers with stored state
      if (statManager) {
        const hasStoredVisible = window.localStorage.getItem(statSubnavStorageKey) === "true";
        statManager.setVisible(hasStoredVisible);
      }

      if (financeManager) {
        const hasStoredVisible = window.localStorage.getItem(financeSubnavStorageKey) === "true";
        financeManager.setVisible(hasStoredVisible);
      }

      nav.querySelectorAll("a[href]").forEach((a) => {
        const linkFile = decodeURIComponent(a.getAttribute("href")).split("/").pop();
        if (linkFile === currentFile) {
          a.classList.add("active");
          // If it's inside a dropdown, also mark the toggle
          const dropdown = a.closest(".p5-dropdown");
          if (dropdown) {
            dropdown.querySelector(".p5-dropdown-toggle").classList.add("active");
          }
        }
      });

      if (statManager && statManager.pageFiles.includes(currentFile)) {
        statManager.toggle.classList.add("active");
      }

      if (financeManager && financeManager.pageFiles.includes(currentFile)) {
        financeManager.toggle.classList.add("active");
      }

      dropdowns.forEach((dropdown) => {
        const toggle = dropdown.querySelector(".p5-dropdown-toggle");
        if (!toggle) {
          return;
        }

        toggle.setAttribute("aria-haspopup", "true");
        toggle.setAttribute("aria-expanded", "false");

        toggle.addEventListener("click", (event) => {
          event.preventDefault();

          const isOpen = dropdown.classList.contains("p5-dropdown-open");
          closeAllDropdowns();
          setDropdownOpen(dropdown, !isOpen);
        });

        toggle.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            closeAllDropdowns();
            toggle.focus();
          }
        });

        dropdown.querySelectorAll(".p5-dropdown-menu a").forEach((link) => {
          link.addEventListener("click", () => {
            closeAllDropdowns();
          });
        });
      });

      // Setup event listeners for both subnav managers
      const setupSubnavManager = (manager) => {
        if (!manager) {
          return;
        }

        manager.toggle.addEventListener("click", (event) => {
          event.preventDefault();
          closeAllDropdowns();

          const isVisible = document.body.classList.contains(
            manager.bodyClass || `has-${manager.collapsedClass.split("-")[0]}-subnav`
          );
          manager.setVisible(!isVisible);
          document.body.classList.remove(manager.collapsedClass);
        });

        manager.links.forEach((link) => {
          link.addEventListener("click", () => {
            manager.setVisible(true);
          });
        });

        manager.nonLinks.forEach((link) => {
          link.addEventListener("click", () => {
            manager.setVisible(false);
            document.body.classList.remove(manager.collapsedClass);
          });
        });
      };

      setupSubnavManager(statManager);
      setupSubnavManager(financeManager);

      document.addEventListener("click", (event) => {
        if (!nav.contains(event.target)) {
          closeAllDropdowns();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeAllDropdowns();
        }
      });

      document.body.insertAdjacentElement("afterbegin", nav);
    });
})();
