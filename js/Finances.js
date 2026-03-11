const startDate = new Date("2026-02-25");
const endDate = new Date("2026-04-12");

let entries = {};
let currentDate = new Date(startDate);
let editIndex = null;
let isEditMode = false;
let isEditGoalsMode = false;
let deletedGoals = [];

function toggleEditGoalsMode() {
  isEditGoalsMode = !isEditGoalsMode;
  renderGoals();
  const btn = document.getElementById("toggleEditGoalsBtn");
  if (btn) btn.innerText = isEditGoalsMode ? "Save Changes" : "Edit Goals";
  // Show/hide rearrange and add goal buttons
  const rearrangeBtn = document.getElementById("rearrangeGoalsBtn");
  if (rearrangeBtn) rearrangeBtn.style.display = isEditGoalsMode ? "inline-block" : "none";
  const addGoalBtn = document.getElementById("addGoalBtn");
  if (addGoalBtn) addGoalBtn.style.display = isEditGoalsMode ? "inline-block" : "none";
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

const goals = [
  { name: "March Rent Part 2", amount: 367.66, allocated: 0, allocations: [], },
  { name: "April Rent", amount: 730, allocated: 0, allocations: [], },
  { name: "New Tire", amount: 130, allocated: 0, allocations: [] },
  { name: "Trip to See My Love", amount: 150, allocated: 0, allocations: [], },
  { name: "Beach Trip", amount: 250, allocated: 0, allocations: [], },
  { name: "At Home Run", amount: 150, allocated: 0, allocations: [], },
  { name: "Scrapbook", amount: 10, allocated: 0, allocations: [] },
  { name: "Capture Card", amount: 110.74, allocated: 0, allocations: [] },
  { name: "PS5 Reimbursement", amount: 101.31, allocated: 0, allocations: [] },
  { name: "Satin Pillowcases", amount: 40, allocated: 0, allocations: [], },
  { name: "Pillows", amount: 27.25, allocated: 0, allocations: [] },  
  { name: "PS5 Remainder", amount: 121.24, allocated: 0, allocations: [] },
];

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

// Save to Dropbox
async function saveToDropbox() {
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
        goals,
        deletedGoals
      })
    });
  } catch (err) {
    console.error("Dropbox save failed:", err);
  }
}

// Save locally + cloud
function saveToStorage() {

  // Local backup
  localStorage.setItem("cashflow_entries", JSON.stringify(entries));
  localStorage.setItem("cashflow_goals", JSON.stringify(goals));
  localStorage.setItem("cashflow_deletedGoals", JSON.stringify(deletedGoals));

  // Cloud sync
  saveToDropbox();
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

    // Allocations
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
  // Start with today’s balance
  const todayBalance = calculateBalanceUpTo(currentDate);

  // Subtract allocations already made **today** (so you can't overspend)
  const todayAllocated = goals.reduce((sum, g) => {
    return (
      sum +
      g.allocations.reduce((s, a) => {
        return a.date === formatDate(currentDate) ? s + Number(a.amount) : s;
      }, 0)
    );
  }, 0);

  return todayBalance;
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
    const div = document.createElement("div");
    div.className = "goal-card";
    div.style.paddingTop = "";
    if (goal.allocated >= goal.amount) div.classList.add("goal-funded");

    const percent = ((goal.allocated / goal.amount) * 100).toFixed(1);

    // Title and delete button in flex row
    div.innerHTML = "";
    // Absolute-positioned delete button in top right
    let isEditing = goal._editing;
    if (isEditGoalsMode && isEditing) {
      // Inline edit form
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
      div.appendChild(nameInput);
      div.appendChild(amountInput);
      div.appendChild(dueInput);

      // Save/Cancel buttons in a flex row
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
      div.appendChild(btnRow);
    } else {
      // Normal display
      const title = document.createElement("strong");
      title.innerText = goal.name;
      title.style.display = "block";
      title.style.wordBreak = "break-word";
      title.style.width = "100%";
      title.style.paddingRight = "1.8em";
      title.style.boxSizing = "border-box";
      div.appendChild(title);

      if (isEditGoalsMode) {
        // Edit button
        const editBtn = document.createElement("button");
        editBtn.innerText = "✎";
        editBtn.title = "Edit Goal";
        editBtn.className = "edit-btn";
        // Flex container for edit/delete buttons
        const btnFlex = document.createElement("div");
        btnFlex.style.display = "flex";
        btnFlex.style.gap = "2px";
        btnFlex.style.position = "absolute";
        btnFlex.style.top = "4px";
        btnFlex.style.right = "8px";
        btnFlex.style.zIndex = "2";
        // Edit button
        editBtn.style.position = "static";
        editBtn.onclick = () => {
          goal._editing = true;
          renderGoals();
        };
        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "&#128465;";
        deleteBtn.title = "Delete Goal";
        deleteBtn.className = "delete-btn";
        deleteBtn.style.position = "static";
        deleteBtn.style.marginLeft = "0";
        deleteBtn.style.paddingLeft = "0";
        editBtn.style.marginRight = "0";
        editBtn.style.paddingRight = "0";
        deleteBtn.onclick = () => {
          deletedGoals.push(goal); // Save deleted goal for greyed out rendering
          goals.splice(idx, 1);
          saveToStorage();
          renderGoals();
        };
        btnFlex.appendChild(editBtn);
        btnFlex.appendChild(deleteBtn);
        div.style.position = "relative";
        div.appendChild(btnFlex);
      }
      div.appendChild(document.createElement("br"));
      if (goal.due) {
        // Format due date as m/d
        const dateObj = new Date(goal.due);
        if (!isNaN(dateObj)) {
          const m = dateObj.getMonth() + 1;
          const d = dateObj.getDate();
          div.appendChild(document.createTextNode(`Due: ${m}/${d}`));
        } else {
          div.appendChild(document.createTextNode(`Due: ${goal.due}`));
        }
        div.appendChild(document.createElement("br"));
      }
      div.appendChild(document.createTextNode(`Goal: $${goal.amount.toFixed(2)}`));
      div.appendChild(document.createElement("br"));
      div.appendChild(document.createTextNode(`Allocated: $${goal.allocated.toFixed(2)}`));
      div.appendChild(document.createElement("br"));
      div.appendChild(document.createTextNode(`Progress: ${percent}%`));
      div.appendChild(document.createElement("br"));
      div.appendChild(document.createTextNode(goal.allocated >= goal.amount ? "Funded" : `Remaining: $${(goal.amount - goal.allocated).toFixed(2)}`));
    }

    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "Amount";
    input.style.width = "70px";

    const addBtn = document.createElement("button");
    addBtn.innerText = "+";
    addBtn.onclick = () => {
      const value = Number(input.value);
      if (!value || value <= 0) return;
      if (value > getUnallocatedBalance())
        return alert("Not enough unallocated funds.");

      goal.allocated += value;
      goal.allocations.push({ date: formatDate(currentDate), amount: value });
      saveToStorage();
      renderDay();
    };

    const removeBtn = document.createElement("button");
    removeBtn.innerText = "-";
    removeBtn.onclick = () => {
      const value = Number(input.value);
      if (!value || value <= 0) return;

      goal.allocated = Math.max(0, goal.allocated - value);

      if (goal.allocations) {
        let remaining = value;
        for (
          let i = goal.allocations.length - 1;
          i >= 0 && remaining > 0;
          i--
        ) {
          if (goal.allocations[i].amount <= remaining) {
            remaining -= goal.allocations[i].amount;
            goal.allocations.splice(i, 1);
          } else {
            goal.allocations[i].amount -= remaining;
            remaining = 0;
          }
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

    div.appendChild(controls);
    goalsDiv.appendChild(div);
  });

  // Show deleted goals greyed out in edit mode
  if (isEditGoalsMode && deletedGoals.length > 0) {
    deletedGoals.forEach((goal, idx) => {
      const div = document.createElement("div");
      div.className = "goal-card goal-deleted";
      div.style.opacity = 0.5;
      div.style.pointerEvents = "auto";
      div.style.display = "flex";
      div.style.flexDirection = "column";
      div.style.alignItems = "center";
      // Restore button
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
      div.appendChild(document.createTextNode(`Goal: $${goal.amount.toFixed(2)}`));
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
        delBtn.innerHTML = "&#128465;";
        delBtn.title = "Delete";
        delBtn.onclick = () => deleteEntry(index);
        div.appendChild(delBtn);
      }

      const span = document.createElement("span");
      span.className = e.type;
      span.innerText =
        (e.type === "income" ? "+ " : "- ") + " $" + e.amount + " - " + e.name;
      div.appendChild(span);

      if (isEditMode) {
        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.innerHTML = "&#9998;";
        editBtn.title = "Edit";
        editBtn.onclick = () => editEntry(index);
        div.appendChild(editBtn);
      }

      list.appendChild(div);
    });
  }

  // Show allocations as entries
  goals.forEach((g) => {
    if (g.allocations) {
      g.allocations.forEach((a) => {
        if (a.date === dateStr) {
          const div = document.createElement("div");
          div.className = "entry allocation";

          const span = document.createElement("span");
          span.className = "allocation";
          span.style.color = "blue";
          span.innerText = `- $${a.amount.toFixed(2)} - Allocated to ${g.name}`;
          div.appendChild(span);

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

  let renderDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (renderDate <= endDate) {
    const month = renderDate.getMonth();
    const year = renderDate.getFullYear();

    const title = document.createElement("h4");
    title.innerText =
      renderDate.toLocaleString("default", { month: "long" }) + " " + year;
    calendarDiv.appendChild(title);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7, 1fr)";
    grid.style.gap = "4px";

    // add weekday headers
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    weekdays.forEach((wd) => {
      const hd = document.createElement("div");
      hd.style.fontWeight = "bold";
      hd.style.textAlign = "center";
      hd.innerText = wd;
      grid.appendChild(hd);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++)
      grid.appendChild(document.createElement("div"));

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const dateStr = formatDate(cellDate);
      const cell = document.createElement("div");
      cell.classList.add("calendar-cell");

      if (cellDate >= startDate && cellDate <= endDate) {
        const balance = calculateBalanceUpTo(cellDate);
        // Create top line container
        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.alignItems = "center";
        topRow.style.gap = "4px";
        topRow.style.whiteSpace = "nowrap"; // FORCE single line

        // Day number
        const dayNumber = document.createElement("strong");
        dayNumber.innerText = day;
        topRow.appendChild(dayNumber);

        if (holidays[dateStr]) {
          const holidayText = document.createElement("div");
          holidayText.innerText = holidays[dateStr].name; // ← FIXED
          holidayText.style.color = "purple";
          holidayText.style.fontSize = "10px";
          holidayText.style.fontWeight = "normal";
          topRow.appendChild(holidayText);
        }

        cell.appendChild(topRow);

        // Balance underneath
        const balanceLine = document.createElement("div");
        balanceLine.innerText = "$" + balance.toFixed(2);
        cell.appendChild(balanceLine);

        if (entries[dateStr]) {
          entries[dateStr].forEach((e) => {
            const item = document.createElement("div");
            item.style.fontSize = "10px";
            item.style.color = e.type === "income" ? "green" : "red";
            item.innerText = (e.type === "income" ? "+ " : "- ") + e.name;
            cell.appendChild(item);
          });
        }

        goals.forEach((g) => {
          if (g.allocations) {
            g.allocations.forEach((a) => {
              if (a.date === dateStr) {
                const alloc = document.createElement("div");
                alloc.style.fontSize = "10px";
                alloc.style.color = "blue";
                alloc.innerText = `- ${g.name}`;
                cell.appendChild(alloc);
              }
            });
          }
        });

        if (balance < 0) cell.classList.add("calendar-negative");
        if (dateStr === formatDate(currentDate))
          cell.classList.add("calendar-selected");

        cell.onclick = () => {
          currentDate = new Date(cellDate);
          renderDay();
        };
      }

      grid.appendChild(cell);
    }

    calendarDiv.appendChild(grid);
    renderDate = new Date(year, month + 1, 1);
  }
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

  if (!name || !amount) return alert("Fill all fields");
  if (!entries[dateStr]) entries[dateStr] = [];

  if (editIndex !== null) {
    entries[dateStr][editIndex] = { name, amount, type };
    editIndex = null;
  } else {
    entries[dateStr].push({ name, amount, type });
  }

  // Clear the form
  document.getElementById("entryName").value = "";
  document.getElementById("entryAmount").value = "";

  saveToStorage();
  renderDay();
}

function editEntry(index) {
  const dateStr = formatDate(currentDate);
  const entry = entries[dateStr][index];
  document.getElementById("entryName").value = entry.name;
  document.getElementById("entryAmount").value = entry.amount;
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
window.saveToStorage = saveToStorage;
