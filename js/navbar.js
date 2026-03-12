(function () {
  const statSubnavStorageKey = "p5-stat-subnav-visible";
  const navbarFontModeStorageKey = "p5-navbar-font-mode";
  const navbarFontMode = window.localStorage.getItem(navbarFontModeStorageKey);
  const isReadableMode = navbarFontMode === "readable";

  document.documentElement.classList.toggle("p5-font-readable", isReadableMode);

  // Inject navbar CSS if not already present
  if (!document.querySelector('link[href="css/navbar.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/navbar.css";
    document.head.appendChild(link);
  }

  fetch("assets/navbar.html")
    .then((res) => res.text())
    .then((html) => {
      const container = document.createElement("div");
      container.innerHTML = html.trim();
      const nav = container.firstChild;
      const statSubnav = nav.querySelector(".p5-stat-subnav");

      if (isReadableMode) {
        nav.classList.add("font-readable");
      }

      // Mark the active link based on the current page filename
      const currentFile =
        decodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
      const statPageFiles = [
        "I-Belieeevee-We-Can-Flyyy-Up-In-The-Sky.html",
        "You'll-Never-See-It-Comiiingggg.html",
      ];
      const hasStoredSubnavVisible =
        window.localStorage.getItem(statSubnavStorageKey) === "true";

      const setStatSubnavVisible = (visible) => {
        if (!statSubnav) {
          return;
        }

        if (visible) {
          document.body.classList.add("has-stat-subnav");
          statSubnav.hidden = false;
          window.localStorage.setItem(statSubnavStorageKey, "true");
        } else {
          document.body.classList.remove("has-stat-subnav");
          statSubnav.hidden = true;
          window.localStorage.setItem(statSubnavStorageKey, "false");
        }
      };

      setStatSubnavVisible(hasStoredSubnavVisible);

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

      const statToggle = nav.querySelector(".p5-dropdown-toggle");

      if (statToggle && statPageFiles.includes(currentFile)) {
        statToggle.classList.add("active");
      }

      const statLinks = nav.querySelectorAll(
        '.p5-dropdown-menu a[href="I-Belieeevee-We-Can-Flyyy-Up-In-The-Sky.html"], .p5-dropdown-menu a[href="You%27ll-Never-See-It-Comiiingggg.html"], .p5-stat-subnav a'
      );
      const nonStatLinks = nav.querySelectorAll(
        'a[href="index.html"], a[href="Finances.html"], a[href="settings.html"], a[href="mementos-requests.html"], a[href="Time-To-Retake-Your-Desires.html"]'
      );

      if (statToggle) {
        statToggle.addEventListener("click", (event) => {
          event.preventDefault();

          const isVisible = document.body.classList.contains("has-stat-subnav");
          setStatSubnavVisible(!isVisible);

          document.body.classList.remove("stat-subnav-collapsed");
        });
      }

      statLinks.forEach((link) => {
        link.addEventListener("click", () => {
          setStatSubnavVisible(true);
        });
      });

      nonStatLinks.forEach((link) => {
        link.addEventListener("click", () => {
          setStatSubnavVisible(false);
          document.body.classList.remove("stat-subnav-collapsed");
        });
      });

      document.body.insertAdjacentElement("afterbegin", nav);
    });
})();
