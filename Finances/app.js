const startDate = new Date("2026-02-25");
const endDate = new Date("2026-04-12");

let entries = {};
let currentDate = new Date(startDate);
let editIndex = null;

const goals = [
  {
    name: "Rent (March Part 1)",
    amount: 364.66,
    due: "3/3",
    allocated: 0,
    allocations: [],
  },
  {
    name: "Rent (March Part 2)",
    amount: 367.66,
    due: "3/18",
    allocated: 0,
    allocations: [],
  },
  {
    name: "Phoebe's Lights",
    amount: 40,
    due: "3/29",
    allocated: 0,
    allocations: [],
  },
  {
    name: "Brandon Cooling Pad",
    amount: 20,
    due: "3/29",
    allocated: 0,
    allocations: [],
  },
  { name: "Scrapbook", amount: 40, due: "3/29", allocated: 0, allocations: [] },
  {
    name: "Rent (April)",
    amount: 730,
    due: "4/3",
    allocated: 0,
    allocations: [],
  },
  { name: "Pillows", amount: 20, due: "4/7", allocated: 0, allocations: [] },
  { name: "New Tire", amount: 130, due: "4/7", allocated: 0, allocations: [] },
  {
    name: "Trip to See Brandon",
    amount: 140,
    due: "4/11",
    allocated: 0,
    allocations: [],
  },
  { name: "PS5 Reimbursement", amount: 101.31, allocated: 0, allocations: [] },
  { name: "Pillows", amount: 20, allocated: 0, allocations: [] },
];

/* ---------- STORAGE ---------- */
function saveToStorage() {
  localStorage.setItem("cashflow_entries", JSON.stringify(entries));
  localStorage.setItem("cashflow_goals", JSON.stringify(goals));
}

function loadFromStorage() {
  const savedEntries = localStorage.getItem("cashflow_entries");
  const savedGoals = localStorage.getItem("cashflow_goals");

  if (savedEntries) entries = JSON.parse(savedEntries);
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

loadFromStorage();

/* ---------- UTIL ---------- */
function formatDate(date) {
  return date.toISOString().split("T")[0]; // always "YYYY-MM-DD"
}

function calculateBalanceUpTo(date) {
  let balance =
    parseFloat(document.getElementById("startingBalance")?.value) || 0;

  for (let d = new Date(startDate); d <= date; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);

    // Add entries (income/expense) for this day
    if (entries[dateStr]) {
      entries[dateStr].forEach((e) => {
        balance += e.type === "income" ? Number(e.amount) : -Number(e.amount);
      });
    }

    // Subtract allocations made on THIS DAY only
    goals.forEach((g) => {
      if (g.allocations && g.allocations.length > 0) {
        g.allocations.forEach((a) => {
          if (a.date === dateStr) {
            balance -= Number(a.amount);
          }
        });
      }
    });
  }

  return balance;
}

function getUnallocatedBalance() {
  const totalBalance = calculateBalanceUpTo(currentDate);
  const totalAllocated = goals.reduce((sum, g) => sum + Number(g.allocated), 0);
  return totalBalance - totalAllocated;
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

  document.getElementById("currentDate").innerText = currentDate.toDateString();

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

      const span = document.createElement("span");
      span.className = e.type;
      span.innerText =
        (e.type === "income" ? "+ " : "- ") + " $" + e.amount + " - " + e.name;
      div.appendChild(span);

      const editBtn = document.createElement("button");
      editBtn.innerText = "Edit";
      editBtn.onclick = () => editEntry(index);
      div.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.innerText = "Delete";
      delBtn.onclick = () => deleteEntry(index);
      div.appendChild(delBtn);

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
        cell.innerHTML = `<strong>${day}</strong><br>$${balance.toFixed(2)}`;

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

/* ---------- ENTRY CRUD ---------- */
function saveEntry() {
  const name = document.getElementById("entryName").value;
  const amount = Number(document.getElementById("entryAmount").value);
  const type = document.getElementById("entryType").value;
  const dateStr = formatDate(currentDate);

  if (!name || !amount) return alert("Fill all fields");
  if (!entries[dateStr]) entries[dateStr] = [];

  if (editIndex !== null) {
    entries[dateStr][editIndex] = { name, amount, type };
    editIndex = null;
  } else {
    entries[dateStr].push({ name, amount, type });
  }

  saveToStorage();
  renderDay();
}

function editEntry(index) {
  const dateStr = formatDate(currentDate);
  const entry = entries[dateStr][index];
  document.getElementById("entryName").value = entry.name;
  document.getElementById("entryAmount").value = entry.amount;
  document.getElementById("entryType").value = entry.type;
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
