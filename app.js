const skills = {Add commentMore actions
  physics: { xp: 0, rank: 1 },
  "self-care": { xp: 0, rank: 1 },
  entertainment: { xp: 0, rank: 1 },
  socialization: { xp: 0, rank: 1 },
  chores: { xp: 0, rank: 1 },
};

const rankThresholds = {
  physics: [0, 10, 25, 50, 100, 200],
  "self-care": [0, 10, 25, 50, 100, 200],
  entertainment: [0, 10, 25, 50, 100, 200],
  socialization: [0, 10, 25, 50, 100, 200],
  chores: [0, 10, 25, 50, 100, 200]
};
const rankNames = {
  physics: ["", "1 - Curious", "2 - Studious", "3 - Analytical", "4 - Theorist", "5 - Physicist"],
  "self-care": ["", "1 - Neglected", "2 - Aware", "3 - Healthy", "4 - Thriving", "5 - Zen"],
  entertainment: ["", "1 - Bored", "2 - Amused", "3 - Engaged", "4 - Enthralled", "5 - Ecstatic"],
  socialization: ["", "1 - Shy", "2 - Chatterbox", "3 - Connector", "4 - Charismatic", "5 - Social Star"],
  chores: ["", "1 - Messy", "2 - Tidy", "3 - Reliable", "4 - Responsible", "5 - Domestic Pro"]
};
let currentSkill = null;

function openTaskInput(skill) {
  currentSkill = skill;
  document.getElementById("task-overlay").style.display = "block";
}

function closeTaskInput() {
  document.getElementById("task-overlay").style.display = "none";
  currentSkill = null;
}

function submitTask() {
  const desc = document.getElementById("task-desc").value;
  const xp = parseInt(document.getElementById("task-xp").value);
  if (!desc || isNaN(xp) || !currentSkill) return;

  showNotes(currentSkill, xp);
  closeTaskInput();
}

function showNotes(skill, xp) {
  const container = document.getElementById("note-container");
  container.innerHTML = "";
  let count = xp >= 6 ? 3 : xp >= 3 ? 2 : 1;

  for (let i = 0; i < count; i++) {
    const note = document.createElement("img");
    note.src = "music-note.png";
    note.className = "note";
    note.style.top = `${Math.random() * 80 + 10}%`;
    note.style.left = `${Math.random() * 80 + 10}%`;
    note.onclick = () => collectXP(skill, xp / count);
    container.appendChild(note);
  }

  const audio = new Audio(xp >= 6 ? "Three-Music-Notes.wav" : xp >= 3 ? "Two-Music-Notes.wav" : "One-Music-Note.wav");
  audio.play();
}

function collectXP(skill, amount) {
  const s = skills[skill];
  s.xp += Math.round(amount);
  
  const nextRank = s.rank + 1;
  if (nextRank <= 5 && s.xp >= rankThresholds[skill][nextRank]) {
    s.rank = nextRank;
    showRankUp(skill);
  }

  updateUI(skill);
  playXPCollectSound();
}

function showRankUp(skill) {
  const popup = document.getElementById("rankup-popup");
  popup.dataset.skill = skill;
  popup.style.display = "block";
  new Audio("Rank-Up.wav").play();
}

function acknowledgeRankUp() {
  const popup = document.getElementById("rankup-popup");
  popup.style.display = "none";
}

function updateUI(skill) {
  const s = skills[skill];
  const fill = document.getElementById(`${skill}-fill`);
  const rank = document.getElementById(`${skill}-rank`);
  
  const current = s.rank;
  const max = rankThresholds[skill][current + 1] || rankThresholds[skill][rankThresholds[skill].length - 1];
  const prev = rankThresholds[skill][current] || 0;
  const pct = ((s.xp - prev) / (max - prev)) * 100;
  
  fill.style.width = `${Math.min(100, pct)}%`;
  rank.textContent = `Rank: ${rankNames[skill][s.rank]}`;
}

function resetSkill(skill) {
  skills[skill] = { xp: 0, rank: 1 };
  updateUI(skill);
}

function playXPCollectSound() {
  new Audio("Point-Up.wav").play();
}

// Load state from localStorage (optional)
function openSettings() {
  const settings = document.createElement("div");
  settings.id = "settings-panel";
  settings.classList.add("animated-settings");
  settings.innerHTML = `<h2>XP Threshold Settings</h2>
    ${Object.keys(skills).map(skill => `
      <div><strong>${skill.replace(/-/g, ' ')}</strong>
        ${rankThresholds[skill].slice(1).map((v, i) => `
          <input type='number' data-skill='${skill}' data-rank='${i + 1}' value='${v}' min='0' /> Rank ${i + 1}
        `).join("<br>")}
      </div><br>`).join("")}
    <button onclick='saveSettings()'>Save</button>
    <button onclick='closeSettings()'>Cancel</button>`;
  settings.style.overflowY = "auto";
  settings.style.maxHeight = "90vh";
  document.body.appendChild(settings);
}

function closeSettings() {
  const panel = document.getElementById("settings-panel");
  if (panel) panel.remove();
}

function saveSettings() {
  const inputs = document.querySelectorAll("#settings-panel input");
  inputs.forEach(input => {
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

window.onload = () => {
  const gear = document.createElement("button");
  gear.id = "settings-button";
  gear.innerHTML = "⚙"; // Gear symbol
  gear.onclick = openSettings;
  document.body.appendChild(gear);
  Object.keys(skills).forEach(updateUI);
};

let currentSkill = null;
let completedTasks = [];

function openTaskInput(skill) {
  currentSkill = skill;
  document.getElementById('task-desc').value = '';
  document.getElementById('task-xp').value = '';
  document.getElementById('task-overlay').style.display = 'flex';
}

function closeTaskInput() {
  document.getElementById('task-overlay').style.display = 'none';
}

function toggleCompletedTasks() {
  const panel = document.getElementById('completed-tasks-panel');
  panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
}

function submitTask() {
  const desc = document.getElementById('task-desc').value.trim();
  const xp = parseInt(document.getElementById('task-xp').value);

  if (!desc || isNaN(xp) || xp <= 0 || !currentSkill) return;

  // Add to completed tasks
  const taskItem = `${desc} (+${xp} XP) → ${currentSkill}`;
  completedTasks.push(taskItem);

  const taskList = document.getElementById('completed-tasks-list');
  const li = document.createElement('li');
  li.textContent = taskItem;
  taskList.appendChild(li);

  // You can also trigger XP effects here if you have them
  // addXP(currentSkill, xp); // if you already have this

  closeTaskInput();
}
