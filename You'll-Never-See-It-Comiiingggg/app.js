// Skill definitions and data storage
const skills = {
  "self-care": { xp: 0, rank: 0 },
  entertainment: { xp: 0, rank: 0 },
  socialization: { xp: 0, rank: 0 },
  chores: { xp: 0, rank: 0 },
};

const rankThresholds = {
  "self-care": [0, 50, 125, 225, 325, 450],
  entertainment: [0, 15, 30, 50, 70, 90],
  socialization: [0, 25, 50, 80, 120, 175],
  chores: [0, 20, 45, 75, 100, 150],
};

const rankNames = {
  "self-care": [
    "0 - Burnt Out",
    "1 - Neglected",
    "2 - Aware",
    "3 - Healthy",
    "4 - Thriving",
    "5 - Zen",
  ],
  entertainment: [
    "0 - Uninterested",
    "1 - Bored",
    "2 - Amused",
    "3 - Engaged",
    "4 - Enthralled",
    "5 - Ecstatic",
  ],
  socialization: [
    "0 - Loner",
    "1 - Shy",
    "2 - Chatterbox",
    "3 - Connector",
    "4 - Charismatic",
    "5 - Social Star",
  ],
  chores: [
    "0 - Slob",
    "1 - Messy",
    "2 - Tidy",
    "3 - Reliable",
    "4 - Responsible",
    "5 - Domestic Pro",
  ],
};

let currentSkill = null;

let completedTasks = JSON.parse(localStorage.getItem("completedTasks")) || {
  "self-care": [],
  entertainment: [],
  socialization: [],
  chores: [],
};

// Format ISO datetime string to readable local format
function formatDateTime(dateTimeString) {
  const dt = new Date(dateTimeString);
  if (isNaN(dt)) return dateTimeString;
  return dt.toLocaleString(undefined, {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Create a DOM list item for a completed task
function createCompletedTaskItem(task) {
  const item = document.createElement("li");

  const descSpan = document.createElement("span");
  descSpan.textContent = `${task.desc} `;

  const xpSpan = document.createElement("span");
  xpSpan.textContent = `(+${task.xp} XP)`;
  xpSpan.style.color = "#FFD700";

  const dateSpan = document.createElement("span");
  dateSpan.textContent = ` - ${formatDateTime(task.time)}`;
  dateSpan.style.color = "#999999";

  item.append(descSpan, xpSpan, dateSpan);
  return item;
}

// Show task input overlay for a skill
function openTaskInput(skill) {
  currentSkill = skill;
  document.getElementById("task-desc").value = "";
  document.getElementById("task-xp").value = "";
  document.getElementById("task-overlay").style.display = "flex";
}

// Hide task input overlay
function closeTaskInput() {
  document.getElementById("task-overlay").style.display = "none";
  currentSkill = null;
}

// Handle submission of a completed task
function submitTask() {
  const desc = document.getElementById("task-desc").value.trim();
  const xp = parseInt(document.getElementById("task-xp").value, 10);
  if (!desc || isNaN(xp) || xp <= 0 || !currentSkill) return;

  const timestamp = new Date().toISOString();
  const taskData = { desc, xp, time: timestamp };
  completedTasks[currentSkill].push(taskData);
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));

  renderCompletedTasks();
  showNotes(currentSkill, xp);
  closeTaskInput();
}

// Render all completed tasks for all skills
function renderCompletedTasks() {
  Object.keys(completedTasks).forEach((skill) => {
    const container = document.getElementById(`completed-${skill}`);
    if (!container) return;
    container.innerHTML = "";
    completedTasks[skill].forEach((task) => {
      container.appendChild(createCompletedTaskItem(task));
    });
    updateXpBarFromCompletedTasks(skill);
  });
}

// Toggle visibility of completed tasks list for a skill
function toggleCompletedTasks(skill, button) {
  const list = document.getElementById(`completed-${skill}`);
  if (!list) return;

  if (list.style.display === "block") {
    list.style.display = "none";
    if (button) button.textContent = "Show Tasks";
  } else {
    list.style.display = "block";
    if (button) button.textContent = "Hide Tasks";
  }
}

// Show music note icons for XP collection animation
function showNotes(skill, xp) {
  const skillCard = document.getElementById(skill);
  if (!skillCard) return;

  const container = document.createElement("div");
  container.className = "note-container";

  Object.assign(container.style, {
    position: "absolute",
    top: `${skillCard.offsetTop}px`,
    left: `${skillCard.offsetLeft}px`,
    width: `${skillCard.offsetWidth}px`,
    height: `${skillCard.offsetHeight}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    pointerEvents: "auto",
    zIndex: 1000,
  });

  // Number of notes depends on XP amount
  const count = xp >= 6 ? 3 : xp >= 3 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const note = document.createElement("img");
    note.src = "Pictures/music-note.png";
    note.className = "note";
    note.style.height = `${skillCard.offsetHeight * 0.9}px`;
    note.style.cursor = "pointer";
    note.onclick = () => {
      collectXP(skill, xp);
      container.remove();
      maybeShowRankUp(skill);
    };
    container.appendChild(note);
  }

  document.body.appendChild(container);

  const soundSrc =
    xp >= 6
      ? "Audio/Three-Music-Notes.wav"
      : xp >= 3
      ? "Audio/Two-Music-Notes.wav"
      : "Audio/One-Music-Note.wav";

  new Audio(soundSrc).play();
}

// Add XP to skill, handle rank ups, update UI and storage
function collectXP(skill, amount) {
  const s = skills[skill];
  s.xp += Math.round(amount);

  let nextRank = s.rank + 1;
  while (nextRank <= 5 && s.xp >= rankThresholds[skill][nextRank]) {
    s.rank = nextRank;
    s.__rankedUp = true;
    nextRank++;
  }

  updateUI(skill);
  playXPCollectSound();
  localStorage.setItem("skills", JSON.stringify(skills));
}

// Show the rank up popup for a skill
function showRankUp(skill) {
  const skillCard = document.getElementById(skill);
  const popup = document.getElementById("rankup-popup");
  if (!skillCard || !popup) return;

  Object.assign(popup.style, {
    position: "absolute",
    top: `${skillCard.offsetTop}px`,
    left: `${skillCard.offsetLeft}px`,
    width: `${skillCard.offsetWidth}px`,
    height: `${skillCard.offsetHeight}px`,
    zIndex: 10000,
    display: "block",
  });

  popup.dataset.skill = skill;
  popup.innerHTML =
    '<img src="Pictures/Rank-Up.png" alt="Rank Up" style="width:90%; transform:rotate(-10deg); margin:auto; display:block;">';

  new Audio("Audio/Rank-Up.wav").play();
}

// Close rank up popup and update UI accordingly
function acknowledgeRankUp() {
  const popup = document.getElementById("rankup-popup");
  if (!popup) return;
  popup.style.display = "none";
  const skill = popup.dataset.skill;
  popup.dataset.skill = "";
  if (skill) updateUI(skill);
}

// Update XP bar and rank label UI for a skill
function updateUI(skill) {
  const s = skills[skill];
  const fill = document.getElementById(`${skill}-fill`);
  const rankLabel = document.getElementById(`${skill}-rank`);
  if (!fill || !rankLabel) return;

  const current = s.rank;
  const max =
    rankThresholds[skill][current + 1] ?? rankThresholds[skill].at(-1);
  const prev = rankThresholds[skill][current] ?? 0;
  const pct = ((s.xp - prev) / (max - prev)) * 100;

  fill.style.width = `${Math.min(100, pct)}%`;
  rankLabel.textContent = `Rank: ${rankNames[skill][current]}`;
}

// Reset skill XP, rank, and completed tasks; update storage and UI
function resetSkill(skill) {
  skills[skill] = { xp: 0, rank: 0 };
  completedTasks[skill] = [];
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));
  updateUI(skill);
  renderCompletedTasks();
}

// Play XP collection sound effect
function playXPCollectSound() {
  new Audio("Audio/Point-Up.wav").play();
}

// Open global settings panel for XP thresholds
function openSettings() {
  const panel = document.createElement("div");
  panel.id = "settings-panel";
  panel.classList.add("animated-settings");

  panel.innerHTML = `<h2>XP Threshold Settings</h2>
    <button id='settings-close' onclick='closeSettings()'>✖</button>
    ${Object.entries(skills)
      .map(
        ([skill]) => `
      <div><strong>${skill.replace(/-/g, " ")}</strong><br>
        ${rankThresholds[skill]
          .slice(1)
          .map(
            (v, i) => `
          <label>Rank ${
            i + 1
          } <input type='number' data-skill='${skill}' data-rank='${
              i + 1
            }' value='${v}' min='0' /></label><br>`
          )
          .join("")}
      </div><br>`
      )
      .join("")}
    <button onclick='saveSettings()'>Save</button>
    <button onclick='closeSettings()'>Cancel</button>`;

  Object.assign(panel.style, {
    overflowY: "auto",
    maxHeight: "90vh",
    position: "fixed",
    top: "10%",
    left: "10%",
    background: "#111",
    color: "white",
    padding: "1rem",
    border: "2px solid white",
    zIndex: 9999,
  });

  document.body.appendChild(panel);
}

// Close global settings panel
function closeSettings() {
  document.getElementById("settings-panel")?.remove();
}

// Save global XP threshold settings from inputs
function saveSettings() {
  document.querySelectorAll("#settings-panel input").forEach((input) => {
    const skill = input.dataset.skill;
    const rank = parseInt(input.dataset.rank, 10);
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && rankThresholds[skill]) {
      rankThresholds[skill][rank] = value;
    }
  });
  Object.keys(skills).forEach(updateUI);
  closeSettings();
}

// Show rank up popup if skill has ranked up flag
function maybeShowRankUp(skill) {
  if (skills[skill].__rankedUp) {
    skills[skill].__rankedUp = false;
    showRankUp(skill);
  }
}

// Load saved skills and render UI on page load
window.onload = () => {
  const savedSkills = JSON.parse(localStorage.getItem("skills"));
  if (savedSkills) {
    Object.keys(skills).forEach((skill) => {
      if (savedSkills[skill]) {
        skills[skill].xp = savedSkills[skill].xp;
        skills[skill].rank = savedSkills[skill].rank;
      }
    });
  }

  document
    .getElementById("settings-button")
    ?.addEventListener("click", openSettings);

  renderCompletedTasks(); // Renders tasks and updates XP bars
};

// Open individual skill settings popup
function openSkillSettings(skill) {
  const popup = document.getElementById("skill-settings-popup");
  const title = document.getElementById("skill-settings-title");
  const body = document.getElementById("skill-settings-body");

  title.textContent =
    skill.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) +
    " Settings";

  body.innerHTML = ""; // Clear previous content

  const thresholds = rankThresholds[skill];
  if (!thresholds) {
    body.textContent = "No settings available for this skill.";
  } else {
    const form = document.createElement("form");

    thresholds.slice(1).forEach((val, i) => {
      const label = document.createElement("label");
      label.textContent = `Rank ${i + 1} XP Threshold:`;

      const input = document.createElement("input");
      input.type = "number";
      input.min = 0;
      input.value = val;
      input.dataset.rank = i + 1;
      input.dataset.skill = skill;

      label.appendChild(document.createElement("br"));
      label.appendChild(input);
      form.appendChild(label);
      form.appendChild(document.createElement("br"));
    });

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => {
      form.querySelectorAll("input").forEach((input) => {
        const rank = parseInt(input.dataset.rank, 10);
        const skillKey = input.dataset.skill;
        const val = parseInt(input.value, 10);
        if (!isNaN(val) && rankThresholds[skillKey]) {
          rankThresholds[skillKey][rank] = val;
        }
      });
      Object.keys(skills).forEach(updateUI);
      closeSkillSettings();
      alert("Settings saved!");
    };

    form.appendChild(saveBtn);
    body.appendChild(form);
  }

  popup.style.display = "block";
}

// Close individual skill settings popup
function closeSkillSettings() {
  const popup = document.getElementById("skill-settings-popup");
  if (popup) popup.style.display = "none";
}

// Update XP bar and rank label from completed tasks (cumulative XP)
function updateXpBarFromCompletedTasks(skill) {
  const tasks = completedTasks[skill] || [];
  const totalXp = tasks.reduce((sum, t) => sum + (t.xp || 0), 0);

  const thresholds = rankThresholds[skill];
  if (!thresholds) return;

  let rank = 0;
  for (let i = 1; i < thresholds.length; i++) {
    if (totalXp >= thresholds[i]) rank = i;
    else break;
  }

  const prevThreshold = thresholds[rank];
  const nextThreshold =
    thresholds[rank + 1] ?? thresholds[thresholds.length - 1];
  const progressPercent =
    nextThreshold > prevThreshold
      ? ((totalXp - prevThreshold) / (nextThreshold - prevThreshold)) * 100
      : 100;

  const fill = document.getElementById(`${skill}-fill`);
  const rankLabel = document.getElementById(`${skill}-rank`);
  if (fill) fill.style.width = `${Math.min(progressPercent, 100)}%`;
  if (rankLabel) rankLabel.textContent = `Rank: ${rankNames[skill][rank]}`;

  skills[skill].xp = totalXp;
  skills[skill].rank = rank;
}
