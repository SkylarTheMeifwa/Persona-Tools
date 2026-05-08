const GUIDE_DATA_TYPE = "p1guide";

async function loadGuide() {
  const userToken = localStorage.getItem("dropbox_token");
  if (!userToken) {
    throw new Error("Dropbox not connected.");
  }

  const response = await fetch("/api/load-from-dropbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userToken,
      dataType: GUIDE_DATA_TYPE
    })
  });

  if (!response.ok) {
    throw new Error("Failed to load guide from Dropbox.");
  }

  return await response.json();
}

let pages = [];
let currentPage = Number(localStorage.getItem("currentPage")) || 0;
let lastFlipDirection = "next";

const titleEl = document.getElementById("pageTitle");
const contentEl = document.getElementById("pageContent");
const indicatorEl = document.getElementById("pageIndicator");
const bookPageEl = document.getElementById("bookPage");
const tocListEl = document.getElementById("tocList");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const bookmarkBtn = document.getElementById("bookmarkBtn");
const goBookmarkBtn = document.getElementById("goBookmarkBtn");

function buildSidebar() {
  tocListEl.innerHTML = "";

  pages.forEach((page, index) => {
    const item = document.createElement("div");
    item.className = "sidebar-item";
    item.textContent = `${page.id} - ${page.title}`;

    item.onclick = () => {
      lastFlipDirection = index > currentPage ? "next" : "prev";
      currentPage = index;
      renderPage();
    };

    tocListEl.appendChild(item);
  });
}

function updateSidebarActiveState() {
  const items = document.querySelectorAll(".sidebar-item");

  items.forEach((item, index) => {
    item.classList.toggle("active", index === currentPage);
  });
}

function updateProgressBars() {
  if (!pages.length) return;

  const overallProgress = ((currentPage + 1) / pages.length) * 100;

  document.getElementById("overallBar").style.width = `${overallProgress}%`;
  document.getElementById("overallPercent").textContent = `${Math.floor(overallProgress)}%`;

  updateChapterProgress("4.", "chapter4Bar", "chapter4Percent");
  updateChapterProgress("5.", "chapter5Bar", "chapter5Percent");
}

function updateChapterProgress(chapterPrefix, barId, percentId) {
  const chapterPages = pages.filter(page => String(page.id).startsWith(chapterPrefix));
  const currentPageData = pages[currentPage];

  if (!currentPageData) return;

  const currentChapterIndex = chapterPages.findIndex(page => page.id === currentPageData.id);

  let progress = 0;

  if (currentChapterIndex >= 0 && chapterPages.length > 0) {
    progress = ((currentChapterIndex + 1) / chapterPages.length) * 100;
  }

  document.getElementById(barId).style.width = `${progress}%`;
  document.getElementById(percentId).textContent = `${Math.floor(progress)}%`;
}

function renderPage() {
  const page = pages[currentPage];

  if (!page) return;

  const flipClass = lastFlipDirection === "prev" ? "flipping-prev" : "flipping-next";

  bookPageEl.classList.add(flipClass);

  setTimeout(() => {
    titleEl.textContent = `${page.id} - ${page.title}`;
    contentEl.innerHTML = page.content || "";
    indicatorEl.textContent = `${currentPage + 1} / ${pages.length}`;

    localStorage.setItem("currentPage", currentPage);

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === pages.length - 1;

    updateSidebarActiveState();
    updateProgressBars();

    bookPageEl.classList.remove("flipping-next", "flipping-prev");
    window.scrollTo(0, 0);
  }, 200);
}

function goToNextPage() {
  if (currentPage < pages.length - 1) {
    lastFlipDirection = "next";
    currentPage++;
    renderPage();
  }
}

function goToPreviousPage() {
  if (currentPage > 0) {
    lastFlipDirection = "prev";
    currentPage--;
    renderPage();
  }
}

prevBtn.onclick = goToPreviousPage;
nextBtn.onclick = goToNextPage;

bookmarkBtn.onclick = () => {
  if (!pages[currentPage]) return;

  localStorage.setItem("bookmarkPage", currentPage);
  alert(`Bookmark saved: ${pages[currentPage].id} - ${pages[currentPage].title}`);
};

goBookmarkBtn.onclick = () => {
  const savedBookmark = Number(localStorage.getItem("bookmarkPage"));

  if (!Number.isNaN(savedBookmark) && pages[savedBookmark]) {
    lastFlipDirection = savedBookmark > currentPage ? "next" : "prev";
    currentPage = savedBookmark;
    renderPage();
  } else {
    alert("No bookmark saved yet.");
  }
};

document.addEventListener("keydown", event => {
  if (event.key === "ArrowRight") goToNextPage();
  if (event.key === "ArrowLeft") goToPreviousPage();
});

let touchStartX = 0;
let touchEndX = 0;

bookPageEl.addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].screenX;
});

bookPageEl.addEventListener("touchend", event => {
  touchEndX = event.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const distance = touchEndX - touchStartX;

  if (distance < -50) goToNextPage();
  if (distance > 50) goToPreviousPage();
}

async function initializeBook() {
  try {
    const guideData = await loadGuide();
    pages = Array.isArray(guideData.pages) ? guideData.pages : [];

    if (!pages.length) {
      titleEl.textContent = "No pages found";
      contentEl.textContent = "Check that P1Guide.json has a pages array.";
      return;
    }

    if (currentPage >= pages.length) {
      currentPage = 0;
    }

    buildSidebar();
    renderPage();
  } catch (error) {
    titleEl.textContent = "Error";

    contentEl.innerHTML = `
      <div class="error-message">
        Sorry, this page is currently unavailable.
      </div>
    `;

    console.error(error);
  }
}

initializeBook();