// Skill data
const skills = {
  physics: { xp: 0, rank: 0 },
  "self-care": { xp: 0, rank: 0 },
  entertainment: { xp: 0, rank: 0 },
  socialization: { xp: 0, rank: 0 },
  chores: { xp: 0, rank: 0 },
};

const rankThresholds = {
  physics: [0, 20, 50, 90, 130, 200],
  "self-care": [0, 50, 125, 225, 325, 450],
  entertainment: [0, 15, 30, 50, 70, 90],
  socialization: [0, 25, 50, 80, 120, 175],
  chores: [0, 20, 45, 75, 100, 150],
};

const rankNames = {
  physics: ["0 - Clueless", "1 - Curious", "2 - Studious", "3 - Analytical", "4 - Theorist", "5 - Physicist"],
  "self-care": ["0 - Burnt Out", "1 - Neglected", "2 - Aware", "3 - Healthy", "4 - Thriving", "5 - Zen"],
  entertainment: ["0 - Uninterested", "1 - Bored", "2 - Amused", "3 - Engaged", "4 - Enthralled", "5 - Ecstatic"],
  socialization: ["0 - Loner", "1 - Shy", "2 - Chatterbox", "3 - Connector", "4 - Charismatic", "5 - Social Star"],
  chores: ["0 - Slob", "1 - Messy", "2 - Tidy", "3 - Reliable", "4 - Responsible", "5 - Domestic Pro"],
};

let currentSkill = null;

let completedTasks = JSON.parse(localStorage.getItem("completedTasks")) || {
  physics: [],
  "self-care": [],
  entertainment: [],
  socialization: [],
  chores: [],
};

function openTaskInput(skill) {
  currentSkill = skill;
  document.getElementById("task-desc").value = "";
  document.getElementById("task-xp").value = "";
  document.getElementById("task-overlay").style.display = "block";
}

function closeTaskInput() {
  document.getElementById("task-overlay").style.display = "none";
  currentSkill = null;
}

function submitTask() {
  const desc = document.getElementById("task-desc").value.trim();
  const xp = parseInt(document.getElementById("task-xp").value);
  if (!desc || isNaN(xp) || xp <= 0 || !currentSkill) return;

  const timestamp = new Date().toLocaleString();
  const taskData = { desc, xp, time: timestamp };
  completedTasks[currentSkill].push(taskData);
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));

  renderCompletedTasks();
  showNotes(currentSkill, xp);
  closeTaskInput();
}

function renderCompletedTasks() {
  const container = document.getElementById("completed-tasks-list");
  container.innerHTML = "";
  Object.keys(completedTasks).forEach((skill) => {
    if (completedTasks[skill].length > 0) {
      const group = document.createElement("li");
      group.innerHTML = `<strong>${skill}</strong><ul style="padding-left: 1rem;"></ul>`;
      const sublist = group.querySelector("ul");

      completedTasks[skill].forEach((task) => {
        const item = document.createElement("li");
        item.textContent = `${task.desc} (+${task.xp} XP) — ${task.time}`;
        sublist.appendChild(item);
      });

      container.appendChild(group);
    }
  });
}

function showNotes(skill, xp) {
  const skillCard = document.getElementById(skill);
  const container = document.createElement("div");
  container.className = "note-container";
  container.style.position = "absolute";
  container.style.top = `${skillCard.offsetTop}px`;
  container.style.left = `${skillCard.offsetLeft}px`;
  container.style.width = `${skillCard.offsetWidth}px`;
  container.style.height = `${skillCard.offsetHeight}px`;
  container.style.pointerEvents = "auto";
  container.style.zIndex = 1000;
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.gap = "10px";

  const count = xp >= 6 ? 3 : xp >= 3 ? 2 : 1;

  for (let i = 0; i < count; i++) {
    const note = document.createElement("img");
    note.src = "music-note.png";
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

  const audio = new Audio(
    xp >= 6
      ? "Three-Music-Notes.wav"
      : xp >= 3
      ? "Two-Music-Notes.wav"
      : "One-Music-Note.wav"
  );
  audio.play();
}

function collectXP(skill, amount) {
  const s = skills[skill];
  s.xp += Math.round(amount);

  let nextRank = s.rank + 1;
  while (nextRank <= 5 && s.xp >= rankThresholds[skill][nextRank]) {
    s.rank = nextRank;
    skills[skill].__rankedUp = true;
    nextRank++;
  }

  updateUI(skill);
  playXPCollectSound();
  localStorage.setItem("skills", JSON.stringify(skills));
}

function showRankUp(skill) {
  const skillCard = document.getElementById(skill);
  const popup = document.getElementById("rankup-popup");
  popup.dataset.skill = skill;
  popup.style.position = "absolute";
  popup.style.top = `${skillCard.offsetTop}px`;
  popup.style.left = `${skillCard.offsetLeft}px`;
  popup.style.width = `${skillCard.offsetWidth}px`;
  popup.style.height = `${skillCard.offsetHeight}px`;
  popup.style.zIndex = 10000;
  popup.style.display = "block";
  popup.innerHTML =
    '<img src="Rank-Up.png" alt="Rank Up" style="width: 90%; transform: rotate(-10deg); margin: auto; display: block;">';

  new Audio("Rank-Up.wav").play();
}

function acknowledgeRankUp() {
  const popup = document.getElementById("rankup-popup");
  const skill = popup.dataset.skill;
  popup.style.display = "none";
  popup.dataset.skill = "";
  updateUI(skill);
}

function updateUI(skill) {
  const s = skills[skill];
  const fill = document.getElementById(`${skill}-fill`);
  const rank = document.getElementById(`${skill}-rank`);

  const current = s.rank;
  const max =
    rankThresholds[skill][current + 1] ||
    rankThresholds[skill][rankThresholds[skill].length - 1];
  const prev = rankThresholds[skill][current] || 0;
  const pct = ((s.xp - prev) / (max - prev)) * 100;

  fill.style.width = `${Math.min(100, pct)}%`;
  rank.textContent = `Rank: ${rankNames[skill][s.rank]}`;
}

function resetSkill(skill) {
  skills[skill] = { xp: 0, rank: 0 };
  completedTasks[skill] = [];
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));
  updateUI(skill);
  renderCompletedTasks();
}

function playXPCollectSound() {
  new Audio("Point-Up.wav").play();
}

function openSettings() {
  const settings = document.createElement("div");
  settings.id = "settings-panel";
  settings.classList.add("animated-settings");
  settings.innerHTML = `<h2>XP Threshold Settings</h2>
    <button id='settings-close' onclick='closeSettings()'>✖</button>
    ${Object.keys(skills)
      .map(
        (skill) => `
      <div><strong>${skill.replace(/-/g, " ")}</strong>
        ${rankThresholds[skill]
          .slice(1)
          .map(
            (v, i) => `
          <input type='number' data-skill='${skill}' data-rank='${
              i + 1
            }' value='${v}' min='0' /> Rank ${i + 1}
        `
          )
          .join("<br>")}
      </div><br>`
      )
      .join("")}
    <button onclick='saveSettings()'>Save</button>
    <button onclick='closeSettings()'>Cancel</button>`;
  settings.style.overflowY = "auto";
  settings.style.maxHeight = "90vh";
  settings.style.position = "fixed";
  settings.style.top = "10%";
  settings.style.left = "10%";
  settings.style.background = "#111";
  settings.style.color = "white";
  settings.style.padding = "1rem";
  settings.style.border = "2px solid white";
  settings.style.zIndex = 9999;
  document.body.appendChild(settings);
}

function closeSettings() {
  const panel = document.getElementById("settings-panel");
  if (panel) panel.remove();
}

function saveSettings() {
  const inputs = document.querySelectorAll("#settings-panel input");
  inputs.forEach((input) => {
    const skill = input.dataset.skill;
    const rank = parseInt(input.dataset.rank);
    const value = parseInt(input.value);
    if (!isNaN(value)) {
      rankThresholds[skill][rank] = value;
    }
  });
  Object.keys(skills).forEach(updateUI);
  closeSettings();
}

function maybeShowRankUp(skill) {
  if (skills[skill].__rankedUp) {
    skills[skill].__rankedUp = false;
    showRankUp(skill);
  }
}

function toggleCompletedTasks() {
  const panel = document.getElementById("completed-tasks-panel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

window.onload = () => {
  const gear = document.getElementById("settings-button");
  if (gear) gear.onclick = openSettings;
  const savedSkills = JSON.parse(localStorage.getItem("skills"));
  if (savedSkills) {
    Object.keys(skills).forEach(skill => {
      if (savedSkills[skill]) {
        skills[skill].xp = savedSkills[skill].xp;
        skills[skill].rank = savedSkills[skill].rank;
      }
    });
  }
  Object.keys(skills).forEach(updateUI);
  renderCompletedTasks();
};
