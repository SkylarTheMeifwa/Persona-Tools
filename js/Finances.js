const startDate = new Date("2026-01-02");
const endDate = new Date("2026-12-31");

let entries = {};
let currentDate = new Date(startDate);
let editIndex = null;
let isEditMode = false;
let isEditGoalsMode = false;
let isGoalsTestMode = false;
let deletedGoals = [];
const DEFAULT_ENTRY_REMINDER = {
  enabled: false,
  time: "19:00",
  repeatEveryHours: 0,
  repeatCount: 0,
  displayAmount: false,
};

function toNonNegativeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function normalizeEntryReminder(reminder) {
  const source = reminder && typeof reminder === "object" ? reminder : DEFAULT_ENTRY_REMINDER;
  const time = /^\d{2}:\d{2}$/.test(String(source.time || ""))
    ? String(source.time)
    : DEFAULT_ENTRY_REMINDER.time;

  return {
    enabled: Boolean(source.enabled),
    time,
    repeatEveryHours: toNonNegativeInt(source.repeatEveryHours, DEFAULT_ENTRY_REMINDER.repeatEveryHours),
    repeatCount: toNonNegativeInt(source.repeatCount, DEFAULT_ENTRY_REMINDER.repeatCount),
    displayAmount: Boolean(source.displayAmount),
  };
}

function normalizeAllocationReminder(reminder) {
  const normalized = normalizeEntryReminder(reminder);
  return {
    ...normalized,
    repeatEveryHours: 0,
    repeatCount: 0,
  };
}

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function buildReminderBody(name, amount, reminder) {
  if (reminder && reminder.displayAmount) {
    return `${name} - ${formatMoney(amount)}`;
  }

  return name;
}

function makeEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEntries() {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    entries = {};
    return;
  }

  Object.keys(entries).forEach((dateKey) => {
    const dayEntries = Array.isArray(entries[dateKey]) ? entries[dateKey] : [];
    entries[dateKey] = dayEntries
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => {
        const normalizedType = entry.type === "income" ? "income" : "expense";
        const normalizedAmount = Number(entry.amount);

        return {
          ...entry,
          id: entry.id || makeEntryId(),
          name: typeof entry.name === "string" ? entry.name : String(entry.name || ""),
          amount: Number.isFinite(normalizedAmount) ? normalizedAmount : 0,
          type: normalizedType,
          reminder: normalizeEntryReminder(entry.reminder),
        };
      });
  });
}

function setEntryReminderFormState(disabled) {
  const ids = [
    "entry-reminder-time",
    "entry-reminder-repeat-hours",
    "entry-reminder-count",
    "entry-reminder-display-amount",
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = disabled;
    }
  });
}

function resetEntryReminderForm() {
  const enabledEl = document.getElementById("entry-reminder-enabled");
  const timeEl = document.getElementById("entry-reminder-time");
  const repeatEveryEl = document.getElementById("entry-reminder-repeat-hours");
  const repeatCountEl = document.getElementById("entry-reminder-count");
  const displayAmountEl = document.getElementById("entry-reminder-display-amount");

  if (enabledEl) enabledEl.checked = DEFAULT_ENTRY_REMINDER.enabled;
  if (timeEl) timeEl.value = DEFAULT_ENTRY_REMINDER.time;
  if (repeatEveryEl) repeatEveryEl.value = DEFAULT_ENTRY_REMINDER.repeatEveryHours;
  if (repeatCountEl) repeatCountEl.value = DEFAULT_ENTRY_REMINDER.repeatCount;
  if (displayAmountEl) displayAmountEl.checked = DEFAULT_ENTRY_REMINDER.displayAmount;

  setEntryReminderFormState(!DEFAULT_ENTRY_REMINDER.enabled);
}

function readEntryReminderFromForm() {
  const enabled = Boolean(document.getElementById("entry-reminder-enabled")?.checked);
  const time = document.getElementById("entry-reminder-time")?.value || DEFAULT_ENTRY_REMINDER.time;
  const repeatEveryHours = document.getElementById("entry-reminder-repeat-hours")?.value;
  const repeatCount = document.getElementById("entry-reminder-count")?.value;
  const displayAmount = Boolean(
    document.getElementById("entry-reminder-display-amount")?.checked
  );

  return normalizeEntryReminder({
    enabled,
    time,
    repeatEveryHours,
    repeatCount,
    displayAmount,
  });
}

function applyReminderToEntryForm(entry) {
  const reminder = normalizeEntryReminder(entry && entry.reminder ? entry.reminder : DEFAULT_ENTRY_REMINDER);

  const enabledEl = document.getElementById("entry-reminder-enabled");
  const timeEl = document.getElementById("entry-reminder-time");
  const repeatEveryEl = document.getElementById("entry-reminder-repeat-hours");
  const repeatCountEl = document.getElementById("entry-reminder-count");
  const displayAmountEl = document.getElementById("entry-reminder-display-amount");

  if (enabledEl) enabledEl.checked = reminder.enabled;
  if (timeEl) timeEl.value = reminder.time;
  if (repeatEveryEl) repeatEveryEl.value = reminder.repeatEveryHours;
  if (repeatCountEl) repeatCountEl.value = reminder.repeatCount;
  if (displayAmountEl) displayAmountEl.checked = reminder.displayAmount;
  setEntryReminderFormState(!reminder.enabled);
}

function reminderSummary(reminder) {
  if (!reminder || !reminder.enabled) {
    return "Notifications off";
  }

  const repeatEvery = toNonNegativeInt(reminder.repeatEveryHours, 0);
  const repeatCount = toNonNegativeInt(reminder.repeatCount, 0);
  if (!repeatEvery || !repeatCount) {
    return `Notify at ${reminder.time}${reminder.displayAmount ? ", show amount" : ""}`;
  }

  return `Notify at ${reminder.time}, repeat every ${repeatEvery}h x${repeatCount}${
    reminder.displayAmount ? ", show amount" : ""
  }`;
}

function buildFinanceEntryReminders() {
  const reminders = [];

  Object.keys(entries).forEach((dateKey) => {
    const dayEntries = entries[dateKey];
    if (!Array.isArray(dayEntries)) return;

    dayEntries.forEach((entry) => {
      const reminder = normalizeEntryReminder(entry.reminder);
      if (!reminder.enabled) return;

      const dueAt = new Date(`${dateKey}T${reminder.time}:00`);
      if (Number.isNaN(dueAt.getTime())) return;

      reminders.push({
        id: `finances:${entry.id}:${dueAt.getTime()}`,
        dueAt: dueAt.toISOString(),
        title: "Finance Entry Reminder",
        body: buildReminderBody(entry.name, entry.amount, reminder),
        url: window.location.pathname,
        startOffsetMinutes: 0,
        repeatIntervalMinutes: reminder.repeatEveryHours * 60,
        repeatCount: reminder.repeatCount,
      });
    });
  });

  return reminders;
}

function buildAllocationReminders() {
  const reminders = [];

  goals.forEach((goal) => {
    if (!Array.isArray(goal.allocations)) return;

    goal.allocations.forEach((allocation) => {
      const reminder = normalizeAllocationReminder(allocation.reminder);
      if (!reminder.enabled) return;

      const dueAt = new Date(`${allocation.date}T${reminder.time}:00`);
      if (Number.isNaN(dueAt.getTime())) return;

      reminders.push({
        id: `allocation:${allocation.id}:${dueAt.getTime()}`,
        dueAt: dueAt.toISOString(),
        title: "Allocation Reminder",
        body: buildReminderBody(`Allocated to ${goal.name}`, allocation.amount, reminder),
        url: window.location.pathname,
        startOffsetMinutes: 0,
        repeatIntervalMinutes: 0,
        repeatCount: 0,
      });
    });
  });

  return reminders;
}

function buildFinanceReminders() {
  return [...buildFinanceEntryReminders(), ...buildAllocationReminders()];
}

function toggleGoalsTestMode() {
  isGoalsTestMode = !isGoalsTestMode;
  const btn = document.getElementById("toggleGoalsTestModeBtn");
  if (btn) {
    btn.innerText = isGoalsTestMode ? "Test: On" : "Test: Off";
  }
  renderDay();
}

function toggleEditGoalsMode() {
  // Block entering edit mode when test mode is active or any card is flipped
  if (!isEditGoalsMode) {
    if (isGoalsTestMode) {
      alert("Turn off Test Mode before editing goals.");
      return;
    }
    if (goals.some(g => g._flipped)) {
      alert("Flip all cards back before editing goals.");
      return;
    }
  }

  isEditGoalsMode = !isEditGoalsMode;
  // If turning off edit mode (i.e., saving changes), persist to storage
  if (!isEditGoalsMode) {
    saveToStorage();
  }
  renderGoals();
  const btn = document.getElementById("toggleEditGoalsBtn");
  if (btn) btn.innerText = isEditGoalsMode ? "Save Changes" : "Edit Goals";
  // Show/hide rearrange and add goal buttons
  const rearrangeBtn = document.getElementById("rearrangeGoalsBtn");
  if (rearrangeBtn) rearrangeBtn.style.display = isEditGoalsMode ? "inline-block" : "none";
  const addGoalBtn = document.getElementById("addGoalBtn");
  if (addGoalBtn) addGoalBtn.style.display = isEditGoalsMode ? "inline-block" : "none";
  // Hide test mode button while in edit goals mode
  const testModeBtn = document.getElementById("toggleGoalsTestModeBtn");
  if (testModeBtn) testModeBtn.style.display = isEditGoalsMode ? "none" : "";
}

// Add Goal Modal logic
function openAddGoalModal() {
  document.getElementById("addGoalModal").style.display = "flex";
  document.getElementById("addGoalForm").reset();
}
function closeAddGoalModal() {
  document.getElementById("addGoalModal").style.display = "none";
}
function submitAddGoal(e) {
  e.preventDefault();
  const name = document.getElementById("addGoalName").value.trim();
  const amount = parseFloat(document.getElementById("addGoalAmount").value);
  const due = document.getElementById("addGoalDue").value;
  if (!name || isNaN(amount) || amount <= 0) return;
  const newGoal = { name, amount, allocated: 0, allocations: [] };
  if (due) newGoal.due = due;
  goals.push(newGoal);
  saveToStorage();
  renderGoals();
  closeAddGoalModal();
}

// Rearrange Goals Modal logic
function openRearrangeGoalsModal() {
  const modal = document.getElementById("rearrangeGoalsModal");
  const list = document.getElementById("rearrangeGoalsList");
  if (!modal || !list) return;
  // Populate list
  list.innerHTML = "";
  goals.forEach((goal, idx) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.marginBottom = "6px";
    const title = document.createElement("span");
    title.innerText = goal.name;
    title.style.flex = "1 1 auto";
    li.appendChild(title);
    // Up button
    const upBtn = document.createElement("button");
    upBtn.innerHTML = "&#8593;";
    upBtn.disabled = idx === 0;
    upBtn.onclick = () => moveGoalInList(idx, -1);
    li.appendChild(upBtn);
    // Down button
    const downBtn = document.createElement("button");
    downBtn.innerHTML = "&#8595;";
    downBtn.disabled = idx === goals.length - 1;
    downBtn.onclick = () => moveGoalInList(idx, 1);
    li.appendChild(downBtn);
    list.appendChild(li);
  });
  modal.style.display = "flex";
}

function closeRearrangeGoalsModal() {
  const modal = document.getElementById("rearrangeGoalsModal");
  if (modal) modal.style.display = "none";
}

// Move goal in the modal list (not in main array yet)
let tempGoalOrder = null;
function moveGoalInList(idx, dir) {
  if (!tempGoalOrder) {
    tempGoalOrder = goals.map(g => g);
  }
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= tempGoalOrder.length) return;
  [tempGoalOrder[idx], tempGoalOrder[newIdx]] = [tempGoalOrder[newIdx], tempGoalOrder[idx]];
  // Re-render list
  const list = document.getElementById("rearrangeGoalsList");
  if (!list) return;
  list.innerHTML = "";
  tempGoalOrder.forEach((goal, i) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.marginBottom = "6px";
    const title = document.createElement("span");
    title.innerText = goal.name;
    title.style.flex = "1 1 auto";
    li.appendChild(title);
    // Up button
    const upBtn = document.createElement("button");
    upBtn.innerHTML = "&#8593;";
    upBtn.disabled = i === 0;
    upBtn.onclick = () => moveGoalInList(i, -1);
    li.appendChild(upBtn);
    // Down button
    const downBtn = document.createElement("button");
    downBtn.innerHTML = "&#8595;";
    downBtn.disabled = i === tempGoalOrder.length - 1;
    downBtn.onclick = () => moveGoalInList(i, 1);
    li.appendChild(downBtn);
    list.appendChild(li);
  });
}

function saveRearrangedGoals() {
  if (tempGoalOrder) {
    // Copy order to main array
    for (let i = 0; i < goals.length; i++) {
      goals[i] = tempGoalOrder[i];
    }
    tempGoalOrder = null;
    saveToStorage();
    renderGoals();
  }
  closeRearrangeGoalsModal();
}

const goals = [];

const holidays = {
  "2026-04-03": {
    name: "Good Friday",
    note: "Not Going Home",
  },
  "2026-04-05": {
    name: "Easter",
    note: "Going Home",
  },
};

// ---------- LOCAL STORAGE + DROPBOX INTEGRATION ----------

function stripGoalsForStorage(goalsArr) {
  return goalsArr.map(g => ({
    ...g,
    allocations: (g.allocations || []).map(({ _editing, ...rest }) => rest)
  }));
}

// Save to Dropbox
async function saveToDropbox(cleanGoals) {
  const userToken = localStorage.getItem("dropbox_token");
  if (!userToken) return;

  try {
    await fetch("/api/save-to-dropbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userToken,
        entries,
        goals: cleanGoals,
        deletedGoals
      })
    });
  } catch (err) {
    console.error("Dropbox save failed:", err);
  }
}

// Save locally + cloud
function saveToStorage() {
  const cleanGoals = stripGoalsForStorage(goals);
  normalizeEntries();

  // Local backup
  localStorage.setItem("cashflow_entries", JSON.stringify(entries));
  localStorage.setItem("cashflow_goals", JSON.stringify(cleanGoals));
  localStorage.setItem("cashflow_deletedGoals", JSON.stringify(deletedGoals));

  // Cloud sync
  saveToDropbox(cleanGoals);
}

function exportData() {
  try {
    const payload = {
      entries,
      goals,
      deletedGoals,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cashflow-export-${formatDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Failed to export data: " + err.message);
  }
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.entries) entries = data.entries;
      if (data.goals) {
        // replace goals array but keep existing structure to preserve methods
        goals.length = 0;
        data.goals.forEach((g) => goals.push(g));
      }
      normalizeGoals();
      saveToStorage();
      renderDay();
      alert('Data imported successfully');
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
  };
  reader.readAsText(file);
  // reset input so same file can be selected again later
  event.target.value = '';
}

// ---------- LOAD LOCAL STORAGE ----------

function loadFromLocalStorage() {

  const savedEntries = localStorage.getItem("cashflow_entries");
  const savedGoals = localStorage.getItem("cashflow_goals");

  if (savedEntries) {
    entries = JSON.parse(savedEntries);
  }

  if (savedGoals) {
    const parsed = JSON.parse(savedGoals);
    goals.length = 0;
    parsed.forEach(g => goals.push(g));
  }

  const savedDeleted = localStorage.getItem("cashflow_deletedGoals");
  if (savedDeleted) {
    const parsed = JSON.parse(savedDeleted);
    deletedGoals.length = 0;
    parsed.forEach(g => deletedGoals.push(g));
  }

  normalizeGoals();
  normalizeEntries();
}

loadFromLocalStorage();


// ---------- DROPBOX TOKEN HANDLING ----------

// OAuth redirect will include ?dropbox_token=XXXX
const params = new URLSearchParams(window.location.search);
const token = params.get("dropbox_token");

if (token) {

  localStorage.setItem("dropbox_token", token);

  // remove token from URL
  window.history.replaceState({}, document.title, "/");
}


// ---------- LOAD DATA FROM DROPBOX ----------

async function loadFromDropbox() {

  const userToken = localStorage.getItem("dropbox_token");
  if (!userToken) return;

  try {

    const res = await fetch("/api/load-from-dropbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userToken
      })
    });

    if (!res.ok) return;

    const data = await res.json();

    if (data.entries) {
      entries = data.entries;
    }

    if (data.goals) {
      goals.length = 0;
      data.goals.forEach(g => goals.push(g));
    }

    if (data.deletedGoals) {
      deletedGoals.length = 0;
      data.deletedGoals.forEach(g => deletedGoals.push(g));
    }

    normalizeGoals();
    normalizeEntries();
    renderDay();

    console.log("Loaded data from Dropbox");

  } catch (err) {
    console.error("Failed to load from Dropbox:", err);
  }
}

// Load Dropbox after localStorage
loadFromDropbox();
/* ---------- UTIL ---------- */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthValue(value) {
  const [yearPart, monthPart] = String(value).split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

function formatMD(dateStr) {
  if (typeof dateStr === "string") {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      return `${parts[1]}/${parts[2]}`;
    }
  }
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) return dateStr;
  return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
}

function isAllocationApplied(allocation) {
  return isGoalsTestMode || Boolean(allocation.applied);
}

function getGoalAllocatedAmount(goal) {
  if (!goal.allocations) return 0;
  return goal.allocations.reduce((sum, allocation) => {
    return sum + Number(allocation.amount || 0);
  }, 0);
}

function getGoalAppliedAmount(goal) {
  if (!goal.allocations) return 0;
  return goal.allocations.reduce((sum, allocation) => {
    return isAllocationApplied(allocation) ? sum + Number(allocation.amount || 0) : sum;
  }, 0);
}

function isGoalFunded(goal) {
  if (!goal.allocations || goal.allocations.length === 0) return false;
  const appliedAmount = getGoalAppliedAmount(goal);
  return Math.abs(appliedAmount - Number(goal.amount || 0)) < 0.005;
}

function normalizeGoal(goal) {
  goal.allocations = Array.isArray(goal.allocations) ? goal.allocations : [];
  goal.allocations = goal.allocations
    .filter((allocation) => allocation && allocation.date && Number(allocation.amount) > 0)
    .map((allocation) => ({
      id: allocation.id || makeEntryId(),
      date: allocation.date,
      amount: Number(allocation.amount),
      applied: Boolean(allocation.applied),
      reminder: normalizeAllocationReminder(allocation.reminder),
      _editing: Boolean(allocation._editing),
    }));
  goal.allocated = getGoalAllocatedAmount(goal);
}

function normalizeGoals() {
  goals.forEach((goal) => normalizeGoal(goal));
  deletedGoals.forEach((goal) => normalizeGoal(goal));
}

function calculateBalanceUpTo(targetDate) {
  let balance =
    parseFloat(document.getElementById("startingBalance")?.value) || 0;

  let d = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );

  const end = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );

  while (d <= end) {
    const dateStr = formatDate(d);

    // Entries
    if (entries[dateStr]) {
      entries[dateStr].forEach((e) => {
        const change =
          e.type === "income" ? Number(e.amount) : -Number(e.amount);
        balance += change;
      });
    }

    // Allocations are always part of balance and day/calendar rendering
    goals.forEach((g) => {
      if (g.allocations) {
        g.allocations.forEach((a) => {
          if (a.date === dateStr) {
            balance -= Number(a.amount);
          }
        });
      }
    });

    d.setDate(d.getDate() + 1);
  }

  return balance;
}

function getUnallocatedBalance() {
  let balance =
    parseFloat(document.getElementById("startingBalance")?.value) || 0;

  let d = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );

  const end = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  );

  while (d <= end) {
    const dateStr = formatDate(d);

    if (entries[dateStr]) {
      entries[dateStr].forEach((e) => {
        const change =
          e.type === "income" ? Number(e.amount) : -Number(e.amount);
        balance += change;
      });
    }

    goals.forEach((g) => {
      if (g.allocations) {
        g.allocations.forEach((a) => {
          if (a.date === dateStr && isAllocationApplied(a)) {
            balance -= Number(a.amount);
          }
        });
      }
    });

    d.setDate(d.getDate() + 1);
  }

  return balance;
}

/* ---------- GOALS ---------- */
function renderGoals() {
  const goalsDiv = document.getElementById("goalsView");
  goalsDiv.innerHTML = "";

  // Place banner in the new container
  const bannerContainer = document.getElementById("goalsBannerContainer");
  if (bannerContainer) {
    bannerContainer.innerHTML = "";
    const banner = document.createElement("div");
    banner.style.fontWeight = "bold";
    banner.innerText = "Unallocated Balance: $" + getUnallocatedBalance().toFixed(2);
    bannerContainer.appendChild(banner);
  }

  goals.forEach((goal, idx) => {
    normalizeGoal(goal);
    const goalAmount = Number(goal.amount || 0);
    const allocatedAmount = getGoalAllocatedAmount(goal);
    const appliedAmount = getGoalAppliedAmount(goal);
    const displayedAllocatedAmount = isGoalsTestMode ? allocatedAmount : appliedAmount;
    goal.allocated = allocatedAmount;
    const percent = goalAmount > 0 ? ((appliedAmount / goalAmount) * 100).toFixed(1) : "0.0";
    const funded = isGoalFunded(goal);

    const card = document.createElement("div");
    card.className = "goal-card";
    if (funded) card.classList.add("goal-funded");

    let isEditing = goal._editing;
    if (isEditGoalsMode && isEditing) {
      card.style.padding = "8px";
      card.style.display = "flex";
      card.style.flexDirection = "column";

      const nameInput = document.createElement("input");
      nameInput.value = goal.name;
      nameInput.style.width = "100%";
      nameInput.placeholder = "Goal Name";
      nameInput.className = "goal-edit-input";

      const amountInput = document.createElement("input");
      amountInput.type = "number";
      amountInput.value = goal.amount;
      amountInput.min = "0.01";
      amountInput.step = "0.01";
      amountInput.style.width = "100%";
      amountInput.placeholder = "Amount";
      amountInput.className = "goal-edit-input";

      const dueInput = document.createElement("input");
      dueInput.type = "date";
      dueInput.value = goal.due || "";
      dueInput.style.width = "100%";
      dueInput.className = "goal-edit-input";

      nameInput.style.boxSizing = "border-box";
      amountInput.style.boxSizing = "border-box";
      dueInput.style.boxSizing = "border-box";
      nameInput.style.marginBottom = "4px";
      amountInput.style.marginBottom = "4px";
      dueInput.style.marginBottom = "8px";
      card.appendChild(nameInput);
      card.appendChild(amountInput);
      card.appendChild(dueInput);

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "6px";
      btnRow.style.justifyContent = "space-between";
      btnRow.style.width = "100%";
      const cancelBtn = document.createElement("button");
      cancelBtn.innerText = "Cancel";
      cancelBtn.style.flex = "1 1 0";
      cancelBtn.onclick = () => {
        delete goal._editing;
        renderGoals();
      };
      const saveBtn = document.createElement("button");
      saveBtn.innerText = "Save";
      saveBtn.style.flex = "1 1 0";
      saveBtn.onclick = () => {
        goal.name = nameInput.value.trim() || goal.name;
        goal.amount = parseFloat(amountInput.value) || goal.amount;
        goal.due = dueInput.value || undefined;
        delete goal._editing;
        saveToStorage();
        renderGoals();
      };
      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(saveBtn);
      card.appendChild(btnRow);

      goalsDiv.appendChild(card);
      return;
    }

    const inner = document.createElement("div");
    inner.className = "goal-card-inner";
    if (goal._flipped) inner.classList.add("flipped");
    inner.onclick = (event) => {
      if (isEditGoalsMode) return;
      if (event.target.closest("input, button, select, textarea, label")) return;
      goal._flipped = !goal._flipped;
      renderGoals();
    };

    const front = document.createElement("div");
    front.className = "goal-face goal-front";

    const back = document.createElement("div");
    back.className = "goal-face goal-back";

    const title = document.createElement("strong");
    title.innerText = goal.name;
    title.style.display = "block";
    title.style.wordBreak = "break-word";
    title.style.width = "100%";
    title.style.paddingRight = "2.2em";
    title.style.boxSizing = "border-box";
    front.appendChild(title);

    if (isEditGoalsMode) {
      const editBtn = document.createElement("button");
      editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
      editBtn.title = "Edit Goal";
      editBtn.className = "edit-btn";

      const btnFlex = document.createElement("div");
      btnFlex.style.display = "flex";
      btnFlex.style.gap = "2px";
      btnFlex.style.position = "absolute";
      btnFlex.style.top = "8px";
      btnFlex.style.right = "8px";
      btnFlex.style.zIndex = "2";

      editBtn.style.position = "static";
      editBtn.onclick = () => {
        goal._editing = true;
        renderGoals();
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      deleteBtn.title = "Delete Goal";
      deleteBtn.className = "delete-btn";
      deleteBtn.style.position = "static";
      deleteBtn.style.marginLeft = "0";
      deleteBtn.style.paddingLeft = "0";
      deleteBtn.onclick = () => {
        deletedGoals.push(goal);
        goals.splice(idx, 1);
        saveToStorage();
        renderGoals();
      };

      btnFlex.appendChild(editBtn);
      btnFlex.appendChild(deleteBtn);
      front.appendChild(btnFlex);
    }

    front.appendChild(document.createElement("br"));
    if (goal.due) {
      front.appendChild(document.createTextNode(`Due: ${formatMD(goal.due)}`));
      front.appendChild(document.createElement("br"));
    }
    front.appendChild(document.createTextNode(`Goal: $${goalAmount.toFixed(2)}`));
    front.appendChild(document.createElement("br"));
    front.appendChild(document.createTextNode(`Allocated: $${displayedAllocatedAmount.toFixed(2)}`));
    front.appendChild(document.createElement("br"));
    front.appendChild(document.createTextNode(`Progress: ${percent}%`));
    front.appendChild(document.createElement("br"));
    front.appendChild(
      document.createTextNode(
        funded ? "Funded" : `Remaining: $${Math.max(goalAmount - appliedAmount, 0).toFixed(2)}`
      )
    );

    if (isGoalsTestMode) {
      const input = document.createElement("input");
      input.type = "number";
      input.placeholder = "Amount";
      input.style.width = "70px";

      const allocationReminder = normalizeEntryReminder(DEFAULT_ENTRY_REMINDER);

      const reminderEditor = document.createElement("div");
      reminderEditor.className = "allocation-reminder-editor";

      const reminderRow = document.createElement("div");
      reminderRow.className = "allocation-reminder-row";

      const reminderEnabledLabel = document.createElement("label");
      const reminderEnabledInput = document.createElement("input");
      reminderEnabledInput.type = "checkbox";
      reminderEnabledLabel.appendChild(reminderEnabledInput);
      reminderEnabledLabel.appendChild(document.createTextNode("Notify me at"));

      const reminderTimeInput = document.createElement("input");
      reminderTimeInput.type = "time";
      reminderTimeInput.id = `allocation-reminder-time-${idx}`;
      reminderTimeInput.value = allocationReminder.time;
      reminderTimeInput.disabled = true;

      const displayAmountLabel = document.createElement("label");
      const displayAmountInput = document.createElement("input");
      displayAmountInput.type = "checkbox";
      displayAmountInput.disabled = true;
      displayAmountLabel.appendChild(displayAmountInput);
      displayAmountLabel.appendChild(document.createTextNode("Display Amount"));

      reminderRow.appendChild(reminderEnabledLabel);
      reminderRow.appendChild(reminderTimeInput);
      reminderRow.appendChild(displayAmountLabel);

      reminderEnabledInput.onchange = () => {
        const disabled = !reminderEnabledInput.checked;
        reminderTimeInput.disabled = disabled;
        displayAmountInput.disabled = disabled;
      };

      reminderEditor.appendChild(reminderRow);

      const addBtn = document.createElement("button");
      addBtn.innerText = "+";
      addBtn.onclick = () => {
        const value = Number(input.value);
        if (!value || value <= 0) return;
        if (value > getUnallocatedBalance()) {
          alert("Not enough unallocated funds.");
          return;
        }

        goal.allocations.push({
          id: makeEntryId(),
          date: formatDate(currentDate),
          amount: value,
          applied: true,
          reminder: normalizeEntryReminder({
            enabled: reminderEnabledInput.checked,
            time: reminderTimeInput.value,
            repeatEveryHours: 0,
            repeatCount: 0,
            displayAmount: displayAmountInput.checked,
          }),
        });
        saveToStorage();
        renderDay();
      };

      const removeBtn = document.createElement("button");
      removeBtn.innerText = "-";
      removeBtn.onclick = () => {
        const value = Number(input.value);
        if (!value || value <= 0) return;

        let remaining = value;
        for (let i = goal.allocations.length - 1; i >= 0 && remaining > 0; i--) {
          const allocationAmount = Number(goal.allocations[i].amount || 0);
          if (allocationAmount <= remaining) {
            remaining -= allocationAmount;
            goal.allocations.splice(i, 1);
          } else {
            goal.allocations[i].amount = allocationAmount - remaining;
            remaining = 0;
          }
        }

        saveToStorage();
        renderDay();
      };

      const controls = document.createElement("div");
      controls.className = "goal-controls";
      controls.appendChild(input);
      controls.appendChild(addBtn);
      controls.appendChild(removeBtn);
      front.appendChild(controls);
      front.appendChild(reminderEditor);
    }

    const backTitle = document.createElement("strong");
    backTitle.innerText = goal.name;
    backTitle.className = "goal-back-title";
    back.appendChild(backTitle);

    const checklist = document.createElement("div");
    checklist.className = "allocation-checklist";

    if (!goal.allocations.length) {
      const empty = document.createElement("div");
      empty.className = "allocation-empty";
      empty.innerText = "No allocations yet.";
      checklist.appendChild(empty);
    }

    goal.allocations.forEach((allocation, allocationIdx) => {
      const row = document.createElement("div");
      row.className = "allocation-row";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = isAllocationApplied(allocation);
      check.disabled = isGoalsTestMode;
      check.onchange = () => {
        allocation.applied = check.checked;
        saveToStorage();
        renderDay();
      };
      row.appendChild(check);

      const lineText = document.createElement("span");
      lineText.className = "allocation-line";
      lineText.innerText = `${formatMD(allocation.date)} - $${Number(allocation.amount).toFixed(2)}${
        allocation.reminder && allocation.reminder.enabled ? " [R]" : ""
      }`;
      row.appendChild(lineText);

      if (isGoalsTestMode) {
        const trashBtn = document.createElement("button");
        trashBtn.type = "button";
        trashBtn.className = "allocation-icon-btn allocation-trash-btn";
        trashBtn.title = "Delete allocation";
        trashBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        trashBtn.onclick = () => {
          goal.allocations.splice(allocationIdx, 1);
          saveToStorage();
          renderDay();
        };

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "allocation-icon-btn allocation-edit-btn";
        editBtn.title = "Edit allocation";
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.onclick = () => {
          allocation._editing = !allocation._editing;
          renderGoals();
        };

        row.insertBefore(trashBtn, check);
        row.appendChild(editBtn);
      }

      checklist.appendChild(row);

      if (isGoalsTestMode && allocation._editing) {
        const editor = document.createElement("div");
        editor.className = "allocation-edit-row";

        const dateInput = document.createElement("input");
        dateInput.type = "date";
        dateInput.className = "allocation-date-input";
        dateInput.value = allocation.date;
        dateInput.onchange = () => {
          if (!dateInput.value) return;
          allocation.date = dateInput.value;
          saveToStorage();
          renderDay();
        };

        const amountInput = document.createElement("input");
        amountInput.type = "number";
        amountInput.className = "allocation-amount-input";
        amountInput.min = "0.01";
        amountInput.step = "0.01";
        amountInput.value = Number(allocation.amount).toFixed(2);
        amountInput.onchange = () => {
          const nextAmount = Number(amountInput.value);
          if (!nextAmount || nextAmount <= 0) {
            amountInput.value = Number(allocation.amount).toFixed(2);
            return;
          }
          allocation.amount = nextAmount;
          saveToStorage();
          renderDay();
        };

        const reminderEditor = document.createElement("div");
        reminderEditor.className = "allocation-reminder-editor";

        const reminderConfig = normalizeAllocationReminder(allocation.reminder);

        const reminderRow = document.createElement("div");
        reminderRow.className = "allocation-reminder-row";

        const reminderEnabledLabel = document.createElement("label");
        const reminderEnabledInput = document.createElement("input");
        reminderEnabledInput.type = "checkbox";
        reminderEnabledInput.checked = reminderConfig.enabled;
        reminderEnabledLabel.appendChild(reminderEnabledInput);
        reminderEnabledLabel.appendChild(document.createTextNode("Enable Notification"));

        const reminderTimeLabel = document.createElement("label");
        reminderTimeLabel.textContent = "at";

        const reminderTimeInput = document.createElement("input");
        reminderTimeInput.type = "time";
        reminderTimeInput.value = reminderConfig.time;
        reminderTimeInput.disabled = !reminderConfig.enabled;

        const displayAmountLabel = document.createElement("label");
        const displayAmountInput = document.createElement("input");
        displayAmountInput.type = "checkbox";
        displayAmountInput.checked = reminderConfig.displayAmount;
        displayAmountInput.disabled = !reminderConfig.enabled;
        displayAmountLabel.appendChild(displayAmountInput);
        displayAmountLabel.appendChild(document.createTextNode("Display Amount"));

        reminderRow.appendChild(reminderEnabledLabel);
        reminderRow.appendChild(reminderTimeLabel);
        reminderRow.appendChild(reminderTimeInput);
        reminderRow.appendChild(displayAmountLabel);

        const saveAllocationReminder = () => {
          allocation.reminder = normalizeAllocationReminder({
            enabled: reminderEnabledInput.checked,
            time: reminderTimeInput.value,
            repeatEveryHours: 0,
            repeatCount: 0,
            displayAmount: displayAmountInput.checked,
          });
          saveToStorage();
          renderDay();
        };

        reminderEnabledInput.onchange = () => {
          const disabled = !reminderEnabledInput.checked;
          reminderTimeInput.disabled = disabled;
          displayAmountInput.disabled = disabled;
          saveAllocationReminder();
        };
        reminderTimeInput.onchange = saveAllocationReminder;
        displayAmountInput.onchange = saveAllocationReminder;

        reminderEditor.appendChild(reminderRow);

        editor.appendChild(dateInput);
        editor.appendChild(amountInput);
        checklist.appendChild(editor);
        checklist.appendChild(reminderEditor);
      }
    });

    back.appendChild(checklist);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    goalsDiv.appendChild(card);
  });

  if (isEditGoalsMode && deletedGoals.length > 0) {
    deletedGoals.forEach((goal, idx) => {
      normalizeGoal(goal);
      const div = document.createElement("div");
      div.className = "goal-card goal-deleted";
      div.style.opacity = 0.5;
      div.style.pointerEvents = "auto";
      div.style.display = "flex";
      div.style.flexDirection = "column";
      div.style.alignItems = "center";

      const restoreBtn = document.createElement("button");
      restoreBtn.innerText = "Restore";
      restoreBtn.className = "restore-btn";
      restoreBtn.onclick = () => {
        goals.push(goal);
        deletedGoals.splice(idx, 1);
        saveToStorage();
        renderGoals();
      };
      div.appendChild(document.createElement("br"));
      div.appendChild(document.createTextNode(goal.name));
      div.appendChild(restoreBtn);
      div.appendChild(document.createTextNode(`Goal: $${Number(goal.amount).toFixed(2)}`));
      goalsDiv.appendChild(div);
    });
  }
}

/* ---------- DAY VIEW ---------- */
function renderDay() {
  const dateStr = formatDate(currentDate);
  const balance = calculateBalanceUpTo(currentDate);

  // Format like "Tuesday, April 7, 2026"
  let dateDisplay = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (holidays[dateStr]) {
    const holiday = holidays[dateStr];

    dateDisplay += " - " + holiday.name;

    if (holiday.note) {
      dateDisplay += " (" + holiday.note + ")";
    }
  }

  document.getElementById("currentDate").innerText = dateDisplay;

  const balanceEl = document.getElementById("currentBalance");
  balanceEl.innerText = "Balance: $" + balance.toFixed(2);
  balanceEl.className = balance < 0 ? "negative" : "";

  const list = document.getElementById("entriesList");
  list.innerHTML = "";

  // Show normal entries
  if (entries[dateStr]) {
    entries[dateStr].forEach((e, index) => {
      const div = document.createElement("div");
      div.className = "entry";

      if (isEditMode) {
        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        delBtn.title = "Delete";
        delBtn.onclick = () => deleteEntry(index);
        div.appendChild(delBtn);
      }

      const span = document.createElement("span");
      span.className = e.type;
      span.innerText =
        (e.type === "income" ? "+ " : "- ") + " $" + e.amount + " - " + e.name;
      div.appendChild(span);

      if (e.reminder && e.reminder.enabled) {
        const reminderSpan = document.createElement("small");
        reminderSpan.innerText = `[${reminderSummary(e.reminder)}]`;
        reminderSpan.style.color = "#444";
        div.appendChild(reminderSpan);
      }

      if (isEditMode) {
        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.title = "Edit";
        editBtn.onclick = () => editEntry(index);
        div.appendChild(editBtn);
      }

      list.appendChild(div);
    });
  }

  // Show all allocations as entries
  goals.forEach((g) => {
    if (g.allocations) {
      g.allocations.forEach((a) => {
        if (a.date === dateStr) {
          const div = document.createElement("div");
          div.className = "entry allocation";

          const span = document.createElement("span");
          span.className = "allocation";
          span.style.color = "blue";
          span.innerText = `- $${Number(a.amount).toFixed(2)} - Allocated to ${g.name}`;
          div.appendChild(span);

          if (a.reminder && a.reminder.enabled) {
            const reminderSpan = document.createElement("small");
            reminderSpan.innerText = `[${reminderSummary(a.reminder)}]`;
            reminderSpan.style.color = "#444";
            div.appendChild(reminderSpan);
          }

          list.appendChild(div);
        }
      });
    }
  });

  renderCalendar();
  renderGoals();
}

/* ---------- CALENDAR ---------- */
function renderCalendar() {
  const calendarDiv = document.getElementById("calendarView");
  calendarDiv.innerHTML = "<h3>Calendar View</h3>";
  const isNarrow = window.matchMedia("(max-width: 768px)").matches;

  const minMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const maxMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  const controls = document.createElement("div");
  controls.className = "calendar-controls";

  const monthLabel = document.createElement("label");
  monthLabel.className = "calendar-month-label";
  monthLabel.setAttribute("for", "calendar-month-select");
  monthLabel.innerText = "Month:";

  const monthSelect = document.createElement("select");
  monthSelect.id = "calendar-month-select";
  monthSelect.className = "calendar-month-select";

  for (let monthCursor = new Date(minMonth); monthCursor <= maxMonth; monthCursor.setMonth(monthCursor.getMonth() + 1)) {
    const option = document.createElement("option");
    option.value = formatMonthValue(monthCursor);
    option.innerText = monthCursor.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    monthSelect.appendChild(option);
  }

  monthSelect.value = formatMonthValue(currentMonth);
  monthSelect.onchange = () => {
    const selectedMonth = parseMonthValue(monthSelect.value);
    if (!selectedMonth) return;

    const maxDayInMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0
    ).getDate();
    const day = Math.min(currentDate.getDate(), maxDayInMonth);
    const nextDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);

    if (nextDate < startDate) {
      currentDate = new Date(startDate);
    } else if (nextDate > endDate) {
      currentDate = new Date(endDate);
    } else {
      currentDate = nextDate;
    }

    renderDay();
  };

  controls.appendChild(monthLabel);
  controls.appendChild(monthSelect);
  calendarDiv.appendChild(controls);

  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();

  const monthSection = document.createElement("section");
  monthSection.className = "calendar-month";

  const title = document.createElement("h4");
  title.className = "calendar-month-title";
  title.innerText =
    currentMonth.toLocaleString("default", { month: "long" }) + " " + year;
  monthSection.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  // add weekday headers
  const weekdays = isNarrow
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  weekdays.forEach((wd) => {
    const hd = document.createElement("div");
    hd.className = "calendar-weekday";
    hd.innerText = wd;
    grid.appendChild(hd);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const spacer = document.createElement("div");
    spacer.className = "calendar-empty";
    grid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const dateStr = formatDate(cellDate);
    const cell = document.createElement("div");
    cell.classList.add("calendar-cell");

    if (cellDate >= startDate && cellDate <= endDate) {
      const balance = calculateBalanceUpTo(cellDate);
      // Create top line container
      const topRow = document.createElement("div");
      topRow.className = "calendar-day-row";

      // Day number
      const dayNumber = document.createElement("strong");
      dayNumber.className = "calendar-day-number";
      dayNumber.innerText = day;
      topRow.appendChild(dayNumber);

      if (holidays[dateStr]) {
        const holidayText = document.createElement("div");
        holidayText.innerText = holidays[dateStr].name;
        holidayText.className = "calendar-holiday";
        topRow.appendChild(holidayText);
      }

      cell.appendChild(topRow);

      // Balance underneath
      const balanceLine = document.createElement("div");
      balanceLine.className = "calendar-balance";
      balanceLine.innerText = "$" + balance.toFixed(2);
      cell.appendChild(balanceLine);

      if (entries[dateStr]) {
        entries[dateStr].forEach((e) => {
          const item = document.createElement("div");
          item.className = "calendar-entry";
          item.style.color = e.type === "income" ? "green" : "red";
          const reminderTag = e.reminder && e.reminder.enabled ? " [R]" : "";
          item.innerText = (e.type === "income" ? "+ " : "- ") + e.name + reminderTag;
          cell.appendChild(item);
        });
      }

      goals.forEach((g) => {
        if (g.allocations) {
          g.allocations.forEach((a) => {
            if (a.date === dateStr) {
              const alloc = document.createElement("div");
              alloc.className = "calendar-allocation";
              alloc.style.color = "blue";
              alloc.innerText = `- ${g.name}${a.reminder && a.reminder.enabled ? " [R]" : ""}`;
              cell.appendChild(alloc);
            }
          });
        }
      });

      if (balance < 0) cell.classList.add("calendar-negative");
      if (dateStr === formatDate(currentDate)) {
        cell.classList.add("calendar-selected");
      }

      cell.onclick = () => {
        currentDate = new Date(cellDate);
        renderDay();
      };
    }

    grid.appendChild(cell);
  }

  monthSection.appendChild(grid);
  calendarDiv.appendChild(monthSection);
}
function toggleEditMode() {
  isEditMode = !isEditMode;

  document.getElementById("toggleEditModeBtn").innerText = isEditMode
    ? "Save Changes"
    : "Edit Entries";

  renderDay();
}

/* ---------- ENTRY CRUD ---------- */
function saveEntry(type) {
  const name = document.getElementById("entryName").value;
  const amount = Number(document.getElementById("entryAmount").value);
  const dateStr = formatDate(currentDate);
  const reminder = readEntryReminderFromForm();

  if (!name || !amount) return alert("Fill all fields");
  if (!entries[dateStr]) entries[dateStr] = [];

  if (editIndex !== null) {
    const existing = entries[dateStr][editIndex];
    entries[dateStr][editIndex] = {
      id: existing && existing.id ? existing.id : makeEntryId(),
      name,
      amount,
      type,
      reminder,
    };
    editIndex = null;
  } else {
    entries[dateStr].push({
      id: makeEntryId(),
      name,
      amount,
      type,
      reminder,
    });
  }

  // Clear the form
  document.getElementById("entryName").value = "";
  document.getElementById("entryAmount").value = "";
  resetEntryReminderForm();

  saveToStorage();
  renderDay();
}

function editEntry(index) {
  const dateStr = formatDate(currentDate);
  const entry = entries[dateStr][index];
  document.getElementById("entryName").value = entry.name;
  document.getElementById("entryAmount").value = entry.amount;
  applyReminderToEntryForm(entry);
  editIndex = index;
}

function deleteEntry(index) {
  const dateStr = formatDate(currentDate);
  entries[dateStr].splice(index, 1);
  if (entries[dateStr].length === 0) delete entries[dateStr];
  saveToStorage();
  renderDay();
}

/* ---------- NAVIGATION ---------- */
function nextDay() {
  if (currentDate < endDate) {
    currentDate.setDate(currentDate.getDate() + 1);
    renderDay();
  }
}
function prevDay() {
  if (currentDate > startDate) {
    currentDate.setDate(currentDate.getDate() - 1);
    renderDay();
  }
}
function recalculate() {
  currentDate = new Date(startDate);
  renderDay();
}

renderDay();
document.addEventListener("DOMContentLoaded", () => {
  const reminderEnabledInput = document.getElementById("entry-reminder-enabled");
  if (reminderEnabledInput) {
    reminderEnabledInput.addEventListener("change", (event) => {
      setEntryReminderFormState(!event.target.checked);
    });
  }

  resetEntryReminderForm();

  if (window.P5ReminderEngine) {
    window.P5ReminderEngine.start({
      getReminders: buildFinanceReminders,
      maxLateMinutes: 2,
      syncSource: "finances",
    });
  }
});

window.saveToStorage = saveToStorage;
