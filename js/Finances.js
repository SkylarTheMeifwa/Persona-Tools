const startDate = new Date("2026-02-25");
const endDate = new Date("2026-04-12");

let entries = {};
let currentDate = new Date(startDate);
let editIndex = null;
let isEditMode = false;

const goals = [
  { name: "March Rent Part 2", amount: 367.66, due: "3/18", allocated: 0, allocations: [], },
  { name: "April Rent", amount: 730, due: "4/3", allocated: 0, allocations: [], },
  { name: "New Tire", amount: 130, due: "4/7", allocated: 0, allocations: [] },
  { name: "Trip to See My Love", amount: 150, due: "4/11", allocated: 0, allocations: [], },
  { name: "Beach Trip", amount: 250, due: "4/11", allocated: 0, allocations: [], },
  { name: "At Home Run", amount: 150, due: "4/3", allocated: 0, allocations: [], },
  { name: "Scrapbook", amount: 10, due: "4/7", allocated: 0, allocations: [] },
  { name: "Capture Card", amount: 110.74, due: "4/7", allocated: 0, allocations: [] },
  { name: "PS5 Reimbursement", amount: 101.31, allocated: 0, allocations: [] },
  { name: "Satin Pillowcases", amount: 40, due: "4/7", allocated: 0, allocations: [], },
  { name: "Pillows", amount: 27.25, due: "4/7", allocated: 0, allocations: [] },  
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
        goals
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

  // Cloud sync
  saveToDropbox();
}

// allow exporting data to a file
function exportData() {
  const data = {
    entries,
    goals,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cashflow-data.json";
  a.click();
  URL.revokeObjectURL(url);
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

    parsed.forEach((g, i) => {
      if (goals[i]) {
        goals[i].allocated = Number(g.allocated) || 0;
        goals[i].allocations = g.allocations || [];
      }
    });
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
      data.goals.forEach((g, i) => {
        if (goals[i]) {
          goals[i].allocated = Number(g.allocated) || 0;
          goals[i].allocations = g.allocations || [];
        }
      });
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

  const banner = document.createElement("div");
  banner.style.gridColumn = "1 / -1";
  banner.style.fontWeight = "bold";
  banner.innerText =
    "Unallocated Balance: $" + getUnallocatedBalance().toFixed(2);
  goalsDiv.appendChild(banner);

  goals.forEach((goal) => {
    const div = document.createElement("div");
    div.className = "goal-card";
    if (goal.allocated >= goal.amount) div.classList.add("goal-funded");

    const percent = ((goal.allocated / goal.amount) * 100).toFixed(1);

    div.innerHTML =
      `<strong>${goal.name}</strong><br>` +
      (goal.due ? `Due: ${goal.due}<br>` : "") +
      `Goal: $${goal.amount.toFixed(2)}<br>` +
      `Allocated: $${goal.allocated.toFixed(2)}<br>` +
      `Progress: ${percent}%<br>` +
      (goal.allocated >= goal.amount
        ? "Funded"
        : "Remaining: $" + (goal.amount - goal.allocated).toFixed(2));

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
