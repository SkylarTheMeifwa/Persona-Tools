// Ensure the global state
let tasks = [];
let editMode = false;
let editingTaskId = null;
const TASKS_STORAGE_KEY = "p5Tasks";
const DEFAULT_TASK_REMINDER = {
  enabled: true,
  leadMinutes: 60,
  repeatEveryMinutes: 0,
  repeatCount: 0,
};

function toNonNegativeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function normalizeTaskReminder(reminder) {
  const source = reminder && typeof reminder === "object" ? reminder : DEFAULT_TASK_REMINDER;
  return {
    enabled: Boolean(source.enabled),
    leadMinutes: toNonNegativeInt(source.leadMinutes, DEFAULT_TASK_REMINDER.leadMinutes),
    repeatEveryMinutes: toNonNegativeInt(
      source.repeatEveryMinutes,
      DEFAULT_TASK_REMINDER.repeatEveryMinutes
    ),
    repeatCount: toNonNegativeInt(source.repeatCount, DEFAULT_TASK_REMINDER.repeatCount),
  };
}

function isValidNotificationDateTime(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return false;
  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.getTime());
}

function normalizeTaskNotifications(notifications) {
  const source = Array.isArray(notifications) ? notifications : [];
  const unique = new Set();

  source.forEach((value) => {
    const raw = String(value || "").trim();
    if (isValidNotificationDateTime(raw)) {
      unique.add(raw);
    }
  });

  return Array.from(unique).sort((a, b) => new Date(a) - new Date(b));
}

function clearNotificationRows() {
  const list = document.getElementById("task-notifications-list");
  list.innerHTML = "";
}

function updateNotificationEmptyState() {
  const list = document.getElementById("task-notifications-list");
  const hasRows = list.querySelector(".notification-row");
  const empty = list.querySelector(".notification-empty");

  if (!hasRows && !empty) {
    const emptyState = document.createElement("div");
    emptyState.className = "notification-empty";
    emptyState.textContent = "No notifications yet.";
    list.appendChild(emptyState);
  }

  if (hasRows && empty) {
    empty.remove();
  }
}

function addNotificationRow(value = "") {
  const list = document.getElementById("task-notifications-list");
  const empty = list.querySelector(".notification-empty");
  if (empty) empty.remove();

  const row = document.createElement("div");
  row.className = "notification-row";

  const input = document.createElement("input");
  input.type = "datetime-local";
  input.className = "task-notification-at";
  input.value = value;
  row.appendChild(input);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-notification-btn";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    row.remove();
    updateNotificationEmptyState();
  });
  row.appendChild(removeBtn);

  list.appendChild(row);
}

function setNotificationRows(values) {
  clearNotificationRows();
  normalizeTaskNotifications(values).forEach((value) => addNotificationRow(value));
  updateNotificationEmptyState();
}

function getNotificationRowsValues() {
  const inputs = document.querySelectorAll(".task-notification-at");
  return Array.from(inputs)
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

function toLocalDateTimeInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function buildLegacyNotificationTimes(task) {
  if (!task || !task.due || !task.reminder || !task.reminder.enabled) {
    return [];
  }

  const dueDate = parseDueDate(task.due);
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return [];
  }

  const leadMs = Math.max(0, Number(task.reminder.leadMinutes) || 0) * 60 * 1000;
  const repeatMs = Math.max(0, Number(task.reminder.repeatEveryMinutes) || 0) * 60 * 1000;
  const repeatCount = Math.max(0, Number(task.reminder.repeatCount) || 0);

  const start = dueDate.getTime() - leadMs;
  const values = [toLocalDateTimeInputValue(new Date(start))];
  if (repeatMs <= 0 || repeatCount <= 0) {
    return values;
  }

  for (let i = 1; i <= repeatCount; i += 1) {
    values.push(toLocalDateTimeInputValue(new Date(start + repeatMs * i)));
  }

  return normalizeTaskNotifications(values);
}

function parseDueParts(dueStr) {
  if (!dueStr || typeof dueStr !== "string") {
    return null;
  }

  const trimmed = dueStr.trim();
  const firstFormat = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})\s*(AM|PM)$/i
  );
  if (firstFormat) {
    return {
      month: firstFormat[1],
      day: firstFormat[2],
      year: firstFormat[3],
      hour: firstFormat[4],
      min: firstFormat[5],
      ampm: firstFormat[6].toUpperCase(),
    };
  }

  const secondFormat = trimmed.match(/^\s*(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})\s*(AM|PM)$/i);
  if (secondFormat) {
    return {
      month: secondFormat[1],
      day: secondFormat[2],
      year: null,
      hour: secondFormat[3],
      min: secondFormat[4],
      ampm: secondFormat[5].toUpperCase(),
    };
  }

  const legacyFormat = trimmed.match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM)\s+(\d{1,2})\/(\d{1,2})$/i);
  if (legacyFormat) {
    return {
      month: legacyFormat[4],
      day: legacyFormat[5],
      year: null,
      hour: legacyFormat[1],
      min: legacyFormat[2],
      ampm: legacyFormat[3].toUpperCase(),
    };
  }

  return null;
}

function formatDueString(dateValue, hour, min, ampm) {
  const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  const yyyy = match[1];
  const mm = match[2];
  const dd = match[3];
  const hh = String(hour).padStart(2, "0");
  const mi = String(min).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${mi} ${ampm.toUpperCase()}`;
}

function formatDueDisplay(dueStr) {
  const parts = parseDueParts(dueStr);
  if (!parts) {
    return dueStr;
  }

  const month = String(Number(parts.month));
  const day = String(Number(parts.day));
  const hourValue = Number(parts.hour);
  const hour = String(Number.isFinite(hourValue) ? hourValue : parts.hour);
  const minute = String(parts.min).padStart(2, "0");
  const ampm = String(parts.ampm || "").toLowerCase();
  return `${month}/${day} ${hour}:${minute} ${ampm}`;
}

function toDateInputValue(month, day, year) {
  const resolvedYear = String(year || new Date().getFullYear());
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${resolvedYear}-${mm}-${dd}`;
}

function parseDueDate(dueStr) {
  const parts = parseDueParts(dueStr);
  if (!parts) return null;

  const month = Number(parts.month);
  const day = Number(parts.day);
  const hh = Number(parts.hour);
  const mm = Number(parts.min);
  let hours = hh;
  if (parts.ampm === "PM" && hours !== 12) hours += 12;
  if (parts.ampm === "AM" && hours === 12) hours = 0;
  const year = Number(parts.year || new Date().getFullYear());
  return new Date(year, month - 1, day, hours, mm);
}

function openTaskInput(editTask = null) {
  document.getElementById("task-desc").value = editTask ? editTask.name : "";
  document.getElementById("task-category").value = editTask
    ? editTask.category
    : "";

  if (editTask && editTask.due) {
    const parts = parseDueParts(editTask.due);
    if (parts) {
      document.getElementById("task-date").value = toDateInputValue(
        parts.month,
        parts.day,
        parts.year
      );
      document.getElementById("task-hour").value = parts.hour;
      document.getElementById("task-min").value = parts.min;
      document.getElementById("task-ampm").value = parts.ampm;
    }
  } else {
    document.getElementById("task-date").value = "";
    document.getElementById("task-hour").value = "";
    document.getElementById("task-min").value = "";
    document.getElementById("task-ampm").value = "";
  }

  if (editTask) {
    const existingNotifications = normalizeTaskNotifications(editTask.notifications);
    setNotificationRows(
      existingNotifications.length ? existingNotifications : buildLegacyNotificationTimes(editTask)
    );
  } else {
    setNotificationRows([]);
  }

  editingTaskId = editTask ? editTask.id : null;
  document.getElementById("task-overlay").style.display = "flex";
  document.getElementById("submit-task-btn").textContent = editTask
    ? "Save Changes"
    : "Add Task";
}

function closeTaskInput() {
  document.getElementById("task-overlay").style.display = "none";
  editingTaskId = null;
  document.getElementById("submit-task-btn").textContent = "Add Task";
}

function submitTask() {
  const desc = document.getElementById("task-desc").value.trim();
  const category = document.getElementById("task-category").value.trim();
  const dateValue = document.getElementById("task-date").value.trim();
  const hour = document.getElementById("task-hour").value.trim();
  const min = document.getElementById("task-min").value.trim();
  const ampm = document.getElementById("task-ampm").value.trim();
  const notifications = normalizeTaskNotifications(getNotificationRowsValues());

  let due = "";
  const hasPartialInput = dateValue || hour || min || ampm;
  const hasAllDateTime = dateValue && hour && min && ampm;

  if (hasPartialInput && !hasAllDateTime) {
    alert("Please fill out all date/time fields or leave them all blank.");
    return;
  }

  if (hasAllDateTime) {
    due = formatDueString(dateValue, hour, min, ampm);
  }

  if (!desc || !category) {
    alert("Please fill out task description and category.");
    return;
  }

  if (editingTaskId) {
    const task = tasks.find((t) => t.id === editingTaskId);
    if (task) {
      task.name = desc;
      task.category = category;
      task.due = due;
      task.notifications = notifications;
    }
  } else {
    const id = Date.now().toString();
    tasks.push({
      id,
      name: desc,
      category,
      due,
      completed: false,
      reminder: normalizeTaskReminder(DEFAULT_TASK_REMINDER),
      notifications,
    });
  }

  saveTasks();
  renderTasks();
  closeTaskInput();
}

function saveTasks() {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  saveTasksToDropbox();
}

function loadTasks() {
  const saved = localStorage.getItem(TASKS_STORAGE_KEY);
  if (saved) {
    tasks = normalizeTasks(JSON.parse(saved));
  }
}

function normalizeTasks(payload) {
  const rawTasks = Array.isArray(payload) ? payload : [];
  return rawTasks
    .filter((task) => task && typeof task === "object")
    .map((task, index) => ({
      id: task.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(task.name || "").trim(),
      category: String(task.category || "").trim(),
      due: typeof task.due === "string" ? task.due : "",
      completed: Boolean(task.completed),
      reminder: normalizeTaskReminder(task.reminder),
      notifications: normalizeTaskNotifications(task.notifications),
    }))
    .filter((task) => task.name && task.category);
}

function getDateStamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function exportData() {
  try {
    const payload = {
      tasks,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mementos-requests-export-${getDateStamp(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(`Failed to export data: ${error.message}`);
  }
}

function triggerImportPicker() {
  document.getElementById("import-file").click();
}

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function onFileLoad(loadEvent) {
    try {
      const parsed = JSON.parse(loadEvent.target.result);
      const importedTasks = normalizeTasks(Array.isArray(parsed) ? parsed : parsed.tasks);
      tasks = importedTasks;
      saveTasks();
      renderTasks();
      alert("Data imported successfully.");
    } catch (error) {
      alert(`Failed to import data: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

async function saveTasksToDropbox() {
  const userToken = localStorage.getItem("dropbox_token");
  if (!userToken) return;

  try {
    await fetch("/api/save-mementos-to-dropbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userToken,
        tasks,
      }),
    });
  } catch (error) {
    console.error("Dropbox save failed:", error);
  }
}

async function loadTasksFromDropbox() {
  const userToken = localStorage.getItem("dropbox_token");
  if (!userToken) return;

  try {
    const response = await fetch("/api/load-mementos-from-dropbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userToken,
      }),
    });

    if (!response.ok) return;

    const payload = await response.json();
    const cloudTasks = normalizeTasks(payload.tasks);
    if (!cloudTasks.length) return;

    tasks = cloudTasks;
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    renderTasks();
  } catch (error) {
    console.error("Dropbox load failed:", error);
  }
}

function getTaskReminderSummary(task) {
  if (!task) {
    return "Notifications off";
  }

  if (Array.isArray(task.notifications) && task.notifications.length) {
    const count = task.notifications.length;
    return `${count} notification${count === 1 ? "" : "s"} scheduled`;
  }

  if (!task.reminder || !task.reminder.enabled) {
    return "Notifications off";
  }

  const lead = task.reminder.leadMinutes;
  const repeatEvery = task.reminder.repeatEveryMinutes;
  const repeatCount = task.reminder.repeatCount;
  if (!repeatEvery || !repeatCount) {
    return `Notify ${lead}m before`;
  }

  return `Notify ${lead}m before, repeat ${repeatEvery}m x${repeatCount}`;
}

function buildTaskReminders() {
  return tasks
    .filter((task) => !task.completed)
    .flatMap((task) => {
      const notificationTimes = normalizeTaskNotifications(task.notifications);
      if (notificationTimes.length > 0) {
        return notificationTimes
          .map((notificationAt, index) => {
            const at = new Date(notificationAt);
            if (!Number.isFinite(at.getTime())) return null;

            return {
              id: `mementos:${task.id}:notification:${index}:${notificationAt}`,
              dueAt: at.toISOString(),
              title: "Task Reminder",
              body: task.due
                ? `${task.name}. Due: ${formatDueDisplay(task.due)}.`
                : `${task.name}.`,
              url: "/mementos-requests.html",
              startOffsetMinutes: 0,
              repeatIntervalMinutes: 0,
              repeatCount: 0,
            };
          })
          .filter(Boolean);
      }

      if (!task.due || !task.reminder || !task.reminder.enabled) {
        return [];
      }

      const dueDate = parseDueDate(task.due);
      if (!dueDate || Number.isNaN(dueDate.getTime())) return [];

      return [
        {
          id: `mementos:${task.id}:${dueDate.getTime()}`,
          dueAt: dueDate.toISOString(),
          title: "Task Reminder",
          body: `${task.name} is due at ${formatDueDisplay(task.due)}.`,
          url: "/mementos-requests.html",
          startOffsetMinutes: task.reminder.leadMinutes,
          repeatIntervalMinutes: task.reminder.repeatEveryMinutes,
          repeatCount: task.reminder.repeatCount,
        },
      ];
    })
    .filter(Boolean);
}

function toggleEditMode() {
  editMode = !editMode;
  document.getElementById("edit-btn").textContent = editMode
    ? "Stop Editing"
    : "Edit List";
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  renderTasks();
}

function deleteCompletedInCategory(category) {
  tasks = tasks.filter(
    (task) => !(task.category === category && task.completed)
  );
  saveTasks();
  renderTasks();
}

function toggleTaskCompleted(id, completed) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = completed;
    saveTasks();
    renderTasks();
  }
}

function renderTasks() {
  const container = document.getElementById("daily-categories");
  container.innerHTML = "";

  const grouped = {};
  tasks.forEach((task) => {
    if (!grouped[task.category]) grouped[task.category] = [];
    grouped[task.category].push(task);
  });

  Object.keys(grouped).forEach((category) => {
    grouped[category].sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      const dateA = parseDueDate(a.due);
      const dateB = parseDueDate(b.due);
      return (dateA || Infinity) - (dateB || Infinity);
    });

    const section = document.createElement("div");
    section.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";

    const heading = document.createElement("h2");
    heading.textContent = category;
    header.appendChild(heading);

    const hasCompletedTasks = grouped[category].some((task) => task.completed);
    if (editMode && hasCompletedTasks) {
      const delCompletedBtn = document.createElement("button");
      delCompletedBtn.className = "delete-completed-btn";
      delCompletedBtn.textContent = "Delete Completed";
      delCompletedBtn.addEventListener("click", () => {
        if (confirm(`Delete all completed tasks in "${category}"?`)) {
          deleteCompletedInCategory(category);
        }
      });
      header.appendChild(delCompletedBtn);
    }

    section.appendChild(header);

    grouped[category].forEach((task) => {
      const wrapper = document.createElement("label");
      wrapper.className = "task";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.id = task.id;
      checkbox.checked = !!task.completed;
      checkbox.addEventListener("change", (e) => {
        toggleTaskCompleted(task.id, e.target.checked);
      });
      wrapper.appendChild(checkbox);

      const taskText = document.createElement("span");
      taskText.textContent = task.name + " ";
      if (task.completed) {
        taskText.style.textDecoration = "line-through";
        taskText.style.color = "grey";
      }
      wrapper.appendChild(taskText);

      if (task.due) {
        const dueSpan = document.createElement("small");
        dueSpan.textContent = `(Due: ${formatDueDisplay(task.due)})`;
        dueSpan.style.color = "grey";
        if (task.completed) dueSpan.style.textDecoration = "line-through";
        dueSpan.style.marginLeft = "0.5rem";
        wrapper.appendChild(dueSpan);
      }

      if (editMode) {
        if (!task.completed) {
          const editTaskBtn = document.createElement("button");
          editTaskBtn.textContent = "Edit Task";
          editTaskBtn.style.marginLeft = "auto";
          editTaskBtn.style.background = "red";
          editTaskBtn.style.color = "white";
          editTaskBtn.style.fontSize = "10px";
          editTaskBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openTaskInput(task);
          });
          wrapper.appendChild(editTaskBtn);
        } else {
          const delBtn = document.createElement("button");
          delBtn.textContent = "Delete";
          delBtn.style.marginLeft = "auto";
          delBtn.style.background = "red";
          delBtn.style.color = "white";
          delBtn.style.fontSize = "10px";
          delBtn.addEventListener("click", (e) => {
            e.preventDefault();
            deleteTask(task.id);
          });
          wrapper.appendChild(delBtn);
        }
      }

      section.appendChild(wrapper);
    });

    container.appendChild(section);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
  renderTasks();
  loadTasksFromDropbox();

  if (window.P5ReminderEngine) {
    window.P5ReminderEngine.start({
      getReminders: buildTaskReminders,
      syncSource: "mementos",
    });
  }

  document
    .getElementById("add-task-btn")
    .addEventListener("click", () => openTaskInput());
  document.getElementById("edit-btn").addEventListener("click", toggleEditMode);
  document
    .getElementById("submit-task-btn")
    .addEventListener("click", submitTask);
  document
    .getElementById("cancel-task-btn")
    .addEventListener("click", closeTaskInput);
  document
    .getElementById("export-data-btn")
    .addEventListener("click", exportData);
  document
    .getElementById("import-data-btn")
    .addEventListener("click", triggerImportPicker);
  document
    .getElementById("import-file")
    .addEventListener("change", importData);
  document
    .getElementById("add-notification-btn")
    .addEventListener("click", () => addNotificationRow());
});
