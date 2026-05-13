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
let isFlipping = false;
let scrollProtectionTimeout = null;

const titleEl = document.getElementById("pageTitle");
const contentEl = document.getElementById("pageContent");
const indicatorEls = document.querySelectorAll(".pageIndicator");
const bookPageEl = document.getElementById("bookPage");
const tocListEl = document.getElementById("tocList");
const prevBtns = document.querySelectorAll(".prevBtn");
const nextBtns = document.querySelectorAll(".nextBtn");

function buildSidebar() {
  tocListEl.innerHTML = "";

  pages.forEach((page, index) => {
    const item = document.createElement("div");
    item.className = "sidebar-item";
    item.textContent = `${page.id} - ${page.title}`;

    item.onclick = () => {
      if (isFlipping) return;
      
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

function getChapterNumber(pageId) {
  const match = String(pageId).match(/^(\d+)/);
  return match ? match[1] : null;
}

function updateProgressBars() {
  if (!pages.length) return;

  const overallProgress = ((currentPage + 1) / pages.length) * 100;

  document.getElementById("overallBar").style.width = `${overallProgress}%`;
  document.getElementById("overallPercent").textContent = `${Math.floor(overallProgress)}%`;

  updateCurrentChapterProgress();
}

function updateCurrentChapterProgress() {
  const currentPageData = pages[currentPage];

  if (!currentPageData) return;

  const currentChapterNum = getChapterNumber(currentPageData.id);
  const chapterPages = pages.filter(page => getChapterNumber(page.id) === currentChapterNum);

  if (chapterPages.length === 0) return;

  const currentChapterIndex = chapterPages.findIndex(page => page.id === currentPageData.id);
  const progress = currentChapterIndex >= 0 
    ? ((currentChapterIndex + 1) / chapterPages.length) * 100
    : 0;

  document.getElementById("currentChapterLabel").textContent = `Chapter ${currentChapterNum} Progress`;
  document.getElementById("currentChapterBar").style.width = `${progress}%`;
  document.getElementById("currentChapterPercent").textContent = `${Math.floor(progress)}%`;
}

function renderPage() {
  const page = pages[currentPage];

  if (!page) return;

  isFlipping = true;
  
  // Fade out current content
  bookPageEl.classList.add("fade-out");

  setTimeout(() => {
    // Update content while faded out
    titleEl.textContent = `${page.id} - ${page.title}`;
    contentEl.innerHTML = page.content || "";
    
    // Update all page indicators
    indicatorEls.forEach(el => {
      el.textContent = `${currentPage + 1} / ${pages.length}`;
    });

    localStorage.setItem("currentPage", currentPage);

    // Update all button states
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage === pages.length - 1;
    
    prevBtns.forEach(btn => btn.disabled = isFirstPage);
    nextBtns.forEach(btn => btn.disabled = isLastPage);

    updateSidebarActiveState();
    updateProgressBars();

    // Fade back in
    bookPageEl.classList.remove("fade-out");
    isFlipping = false;
    window.scrollTo(0, 0);
  }, 150);
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

prevBtns.forEach(btn => btn.onclick = goToPreviousPage);
nextBtns.forEach(btn => btn.onclick = goToNextPage);

document.addEventListener("keydown", event => {
  if (event.key === "ArrowRight") goToNextPage();
  if (event.key === "ArrowLeft") goToPreviousPage();
});

// Prevent accidental page flips on scroll
window.addEventListener("wheel", event => {
  if (isFlipping) return;
  
  // Only trigger on very specific scroll patterns to avoid accidental flips
  // Don't flip just from normal scrolling
  scrollProtectionTimeout && clearTimeout(scrollProtectionTimeout);
  scrollProtectionTimeout = setTimeout(() => {
    isFlipping = false;
  }, 100);
});

// Mobile sidebar toggle
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // Close sidebar when a chapter is selected on mobile
  document.addEventListener("click", event => {
    if (event.target.classList.contains("sidebar-item")) {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("open");
      }
    }
  });
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

    // Set initial page content
    const initialPage = pages[currentPage];
    titleEl.textContent = `${initialPage.id} - ${initialPage.title}`;
    contentEl.innerHTML = initialPage.content || "";
    
    // Update all page indicators
    indicatorEls.forEach(el => {
      el.textContent = `${currentPage + 1} / ${pages.length}`;
    });

    buildSidebar();
    updateSidebarActiveState();
    updateProgressBars();
    
    // Update all button states
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage === pages.length - 1;
    
    prevBtns.forEach(btn => btn.disabled = isFirstPage);
    nextBtns.forEach(btn => btn.disabled = isLastPage);
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