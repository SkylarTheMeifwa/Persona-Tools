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

function makeSubtaskId(seed = 0) {
  return `subtask-${Date.now()}-${seed}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSubtasks(subtasks) {
  const source = Array.isArray(subtasks) ? subtasks : [];
  return source
    .map((subtask, index) => {
      if (subtask && typeof subtask === "object") {
        const normalizedName = String(subtask.name || "").trim();
        return {
          id:
            typeof subtask.id === "string" && subtask.id.trim()
              ? subtask.id.trim()
              : makeSubtaskId(index),
          name: normalizedName,
          completed: Boolean(subtask.completed),
          collapsed: Boolean(subtask.collapsed),
          children: normalizeSubtasks(subtask.children),
        };
      }

      return {
        id: makeSubtaskId(index),
        name: String(subtask || "").trim(),
        completed: false,
        collapsed: false,
        children: [],
      };
    })
    .filter((subtask) => subtask.name);
}

function flattenSubtasksForEditor(subtasks, level = 0, parentId = "") {
  const normalized = normalizeSubtasks(subtasks);
  return normalized.flatMap((subtask) => [
    {
      id: subtask.id,
      parentId,
      level,
      name: subtask.name,
      completed: subtask.completed,
      collapsed: Boolean(subtask.collapsed),
    },
    ...flattenSubtasksForEditor(subtask.children, level + 1, subtask.id),
  ]);
}

function clearNotificationRows() {
  const list = document.getElementById("task-notifications-list");
  list.innerHTML = "";
}

function clearSubtaskRows() {
  const list = document.getElementById("task-subtasks-list");
  list.innerHTML = "";
}

function updateSubtaskEmptyState() {
  const list = document.getElementById("task-subtasks-list");
  const hasRows = list.querySelector(".subtask-row");
  const empty = list.querySelector(".subtask-empty");

  if (!hasRows && !empty) {
    const emptyState = document.createElement("div");
    emptyState.className = "subtask-empty";
    emptyState.textContent = "No subtasks yet.";
    list.appendChild(emptyState);
  }

  if (hasRows && empty) {
    empty.remove();
  }
}

function removeSubtaskRowWithDescendants(row) {
  const level = Number(row.dataset.level || 0);
  let cursor = row.nextElementSibling;

  while (cursor && Number(cursor.dataset.level || 0) > level) {
    const next = cursor.nextElementSibling;
    cursor.remove();
    cursor = next;
  }

  row.remove();
}

function getRowInsertionPointAfterBranch(row) {
  const baseLevel = Number(row.dataset.level || 0);
  let cursor = row.nextElementSibling;

  while (cursor && Number(cursor.dataset.level || 0) > baseLevel) {
    cursor = cursor.nextElementSibling;
  }

  return cursor;
}

function updateSubtaskRowIndent(row) {
  const level = toNonNegativeInt(row.dataset.level, 0);
  row.style.marginLeft = `${level * 16}px`;
}

function getRowLevel(row) {
  return toNonNegativeInt(row?.dataset?.level, 0);
}

function getRowParentId(row) {
  return String(row?.dataset?.parentId || "").trim();
}

function getPreviousSiblingRow(row) {
  const level = getRowLevel(row);
  const parentId = getRowParentId(row);
  let cursor = row.previousElementSibling;

  while (cursor) {
    if (getRowLevel(cursor) === level && getRowParentId(cursor) === parentId) {
      return cursor;
    }
    cursor = cursor.previousElementSibling;
  }

  return null;
}

function getNextSiblingRow(row) {
  const level = getRowLevel(row);
  const parentId = getRowParentId(row);
  let cursor = getRowInsertionPointAfterBranch(row);

  while (cursor) {
    if (getRowLevel(cursor) === level && getRowParentId(cursor) === parentId) {
      return cursor;
    }
    cursor = getRowInsertionPointAfterBranch(cursor);
  }

  return null;
}

function updateMoveBackButton(row) {
  const moveBackBtn = row.querySelector(".move-subtask-back-btn");
  if (!moveBackBtn) return;

  moveBackBtn.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';

  const level = toNonNegativeInt(row.dataset.level, 0);
  const promoted = row.dataset.promoted === "1";

  if (promoted) {
    moveBackBtn.disabled = true;
    moveBackBtn.title = "This subtask will be saved as a regular task";
    moveBackBtn.setAttribute("aria-label", "Will be saved as a regular task");
    return;
  }

  moveBackBtn.disabled = false;
  moveBackBtn.title =
    level > 0 ? "Move this subtask back one level" : "Save this subtask as a regular task";
  moveBackBtn.setAttribute(
    "aria-label",
    level > 0 ? "Move subtask back one level" : "Make this subtask a regular task"
  );
}

function updateNestUnderButton(row) {
  const moveForwardBtn = row.querySelector(".move-subtask-forward-btn");
  if (!moveForwardBtn) return;

  moveForwardBtn.innerHTML = '<i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';

  const previousRow = row.previousElementSibling;
  if (!previousRow) {
    moveForwardBtn.disabled = true;
    moveForwardBtn.title = "No task above to nest under";
    moveForwardBtn.setAttribute("aria-label", "Cannot nest under task above");
    return;
  }

  moveForwardBtn.disabled = false;
  moveForwardBtn.title = "Nest under task above";
  moveForwardBtn.setAttribute("aria-label", "Nest under task above");
}

function refreshSubtaskEditorControls() {
  const rows = document.querySelectorAll("#task-subtasks-list .subtask-row");
  rows.forEach((row) => {
    updateMoveBackButton(row);
    updateNestUnderButton(row);
  });
}

function getSubtaskBranchRows(row) {
  const branch = [row];
  const baseLevel = toNonNegativeInt(row.dataset.level, 0);
  let cursor = row.nextElementSibling;

  while (cursor && toNonNegativeInt(cursor.dataset.level, 0) > baseLevel) {
    branch.push(cursor);
    cursor = cursor.nextElementSibling;
  }

  return branch;
}

function findPreviousRowAtLevel(row, targetLevel) {
  let cursor = row.previousElementSibling;

  while (cursor) {
    if (toNonNegativeInt(cursor.dataset.level, 0) === targetLevel) {
      return cursor;
    }
    cursor = cursor.previousElementSibling;
  }

  return null;
}

function moveSubtaskRowBack(row) {
  const currentLevel = toNonNegativeInt(row.dataset.level, 0);

  if (row.dataset.promoted === "1") {
    return;
  }

  if (currentLevel === 0) {
    row.dataset.parentId = "";
    row.dataset.promoted = "1";
    refreshSubtaskEditorControls();
    return;
  }

  const branchRows = getSubtaskBranchRows(row);
  const nextLevel = currentLevel - 1;
  const nextParentLevel = nextLevel - 1;
  const nextParentRow = nextParentLevel >= 0 ? findPreviousRowAtLevel(row, nextParentLevel) : null;

  branchRows.forEach((branchRow) => {
    const branchLevel = toNonNegativeInt(branchRow.dataset.level, 0);
    branchRow.dataset.level = String(Math.max(branchLevel - 1, 0));
    updateSubtaskRowIndent(branchRow);
  });

  row.dataset.parentId = nextParentRow ? String(nextParentRow.dataset.subtaskId || "") : "";
  row.dataset.promoted = "0";
  refreshSubtaskEditorControls();
}

function moveSubtaskRowForward(row) {
  const previousRow = row.previousElementSibling;
  if (!previousRow) return;

  const branchRows = getSubtaskBranchRows(row);
  const currentLevel = getRowLevel(row);
  const targetLevel = getRowLevel(previousRow) + 1;
  const levelDelta = targetLevel - currentLevel;

  branchRows.forEach((branchRow) => {
    branchRow.dataset.level = String(Math.max(getRowLevel(branchRow) + levelDelta, 0));
    updateSubtaskRowIndent(branchRow);
  });

  row.dataset.parentId = String(previousRow.dataset.subtaskId || "");
  row.dataset.promoted = "0";
  refreshSubtaskEditorControls();
}

function addSubtaskRow({
  name = "",
  completed = false,
  collapsed = false,
  id = "",
  parentId = "",
  level = 0,
  promoted = false,
  insertBefore = null,
} = {}) {
  const list = document.getElementById("task-subtasks-list");
  const empty = list.querySelector(".subtask-empty");
  if (empty) empty.remove();

  const row = document.createElement("div");
  row.className = "subtask-row";
  row.dataset.subtaskId = id || makeSubtaskId(level);
  row.dataset.parentId = parentId;
  row.dataset.level = String(level);
  row.dataset.collapsed = collapsed ? "1" : "0";
  row.dataset.promoted = promoted ? "1" : "0";
  row.dataset.completed = completed ? "1" : "0";
  updateSubtaskRowIndent(row);

  const moveBackBtn = document.createElement("button");
  moveBackBtn.type = "button";
  moveBackBtn.className = "move-subtask-back-btn";
  moveBackBtn.addEventListener("click", () => {
    moveSubtaskRowBack(row);
  });
  row.appendChild(moveBackBtn);

  const moveForwardBtn = document.createElement("button");
  moveForwardBtn.type = "button";
  moveForwardBtn.className = "move-subtask-forward-btn";
  moveForwardBtn.addEventListener("click", () => {
    moveSubtaskRowForward(row);
  });
  row.appendChild(moveForwardBtn);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "task-subtask-name";
  input.placeholder = "Subtask";
  input.value = name;
  row.appendChild(input);

  const addNestedBtn = document.createElement("button");
  addNestedBtn.type = "button";
  addNestedBtn.className = "add-nested-subtask-btn";
  addNestedBtn.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
  addNestedBtn.title = "Add nested subtask";
  addNestedBtn.setAttribute("aria-label", "Add nested subtask");
  addNestedBtn.addEventListener("click", () => {
    const insertionPoint = getRowInsertionPointAfterBranch(row);
    addSubtaskRow({
      parentId: row.dataset.subtaskId,
      level: Number(row.dataset.level || 0) + 1,
      insertBefore: insertionPoint,
    });
  });
  row.appendChild(addNestedBtn);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-subtask-btn";
  removeBtn.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
  removeBtn.title = "Delete subtask";
  removeBtn.setAttribute("aria-label", "Delete subtask");
  removeBtn.addEventListener("click", () => {
    removeSubtaskRowWithDescendants(row);
    updateSubtaskEmptyState();
    refreshSubtaskEditorControls();
  });
  row.appendChild(removeBtn);

  if (insertBefore) {
    list.insertBefore(row, insertBefore);
  } else {
    list.appendChild(row);
  }

  return row;
}

function setSubtaskRows(subtasks) {
  clearSubtaskRows();
  flattenSubtasksForEditor(subtasks).forEach((subtask) => {
    addSubtaskRow({
      name: subtask.name,
      completed: subtask.completed,
      collapsed: subtask.collapsed,
      id: subtask.id,
      parentId: subtask.parentId,
      level: subtask.level,
    });
  });
  updateSubtaskEmptyState();
  refreshSubtaskEditorControls();
}

function getSubtaskRowsValues() {
  const rows = document.querySelectorAll("#task-subtasks-list .subtask-row");
  const rowValues = Array.from(rows).map((row, index) => {
    const level = toNonNegativeInt(row.dataset.level, 0);
    const parentId = level > 0 ? String(row.dataset.parentId || "").trim() : "";
    const id = String(row.dataset.subtaskId || "").trim() || makeSubtaskId(index);
    const name = row.querySelector(".task-subtask-name")?.value || "";
    const completed = String(row.dataset.completed || "0") === "1";
    const collapsed = String(row.dataset.collapsed || "0") === "1";
    const promoted = String(row.dataset.promoted || "0") === "1";

    return {
      id,
      parentId,
      level,
      name,
      completed,
      collapsed,
      promoted,
    };
  });

  const normalizedRows = rowValues
    .map((row) => ({
      ...row,
      name: String(row.name || "").trim(),
    }))
    .filter((row) => row.name);

  const nodeMap = new Map();
  normalizedRows.forEach((row) => {
    nodeMap.set(row.id, {
      id: row.id,
      name: row.name,
      completed: row.completed,
      collapsed: row.collapsed,
      promoted: row.promoted,
      children: [],
    });
  });

  const rootNodes = [];
  normalizedRows.forEach((row) => {
    const node = nodeMap.get(row.id);
    if (row.parentId && nodeMap.has(row.parentId)) {
      nodeMap.get(row.parentId).children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  const subtasks = [];
  const promotedTasks = [];

  rootNodes.forEach((node) => {
    if (node.promoted) {
      promotedTasks.push({
        name: node.name,
        completed: node.completed,
        subtasksCollapsed: Boolean(node.collapsed),
        subtasks: normalizeSubtasks(node.children),
      });
      return;
    }

    subtasks.push(node);
  });

  return {
    subtasks: normalizeSubtasks(subtasks),
    promotedTasks,
  };
}

function findSubtaskById(subtasks, subtaskId) {
  if (!Array.isArray(subtasks) || !subtaskId) return null;

  for (const subtask of subtasks) {
    if (subtask.id === subtaskId) {
      return subtask;
    }

    const match = findSubtaskById(subtask.children, subtaskId);
    if (match) {
      return match;
    }
  }

  return null;
}

function appendSubtaskItems(task, subtasks, subtaskList, level = 0) {
  normalizeSubtasks(subtasks).forEach((subtask) => {
    const subtaskRow = document.createElement("div");
    subtaskRow.className = "task subtask-item";
    subtaskRow.style.setProperty("--subtask-level", String(level));

    const hasChildren = Array.isArray(subtask.children) && subtask.children.length > 0;

    const subtaskStar = document.createElement("span");
    subtaskStar.className = "task-star";
    subtaskStar.setAttribute("aria-hidden", "true");
    subtaskRow.appendChild(subtaskStar);

    const subtaskCheckbox = document.createElement("input");
    subtaskCheckbox.type = "checkbox";
    subtaskCheckbox.checked = Boolean(subtask.completed);
    subtaskCheckbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    subtaskCheckbox.addEventListener("change", (event) => {
      toggleSubtaskCompleted(task.id, subtask.id, event.target.checked);
    });
    subtaskRow.appendChild(subtaskCheckbox);

    const subtaskText = document.createElement("span");
    subtaskText.className = "task-text";
    subtaskText.textContent = subtask.name + " ";
    if (subtask.completed) {
      subtaskText.style.textDecoration = "line-through";
      subtaskText.style.color = "grey";
    }
    subtaskRow.appendChild(subtaskText);

    if (hasChildren) {
      const taskActions = document.createElement("div");
      taskActions.className = "task-actions";

      const collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.className = "task-collapse-btn";
      collapseBtn.innerHTML = subtask.collapsed
        ? '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
      collapseBtn.title = subtask.collapsed ? "Expand subtasks" : "Collapse subtasks";
      collapseBtn.setAttribute("aria-label", collapseBtn.title);
      collapseBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSubtaskCollapsed(task.id, subtask.id, !subtask.collapsed);
      });
      taskActions.appendChild(collapseBtn);
      subtaskRow.appendChild(taskActions);
    }

    subtaskList.appendChild(subtaskRow);

    if (hasChildren && !subtask.collapsed) {
      appendSubtaskItems(task, subtask.children, subtaskList, level + 1);
    }
  });
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
  removeBtn.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
  removeBtn.title = "Delete notification";
  removeBtn.setAttribute("aria-label", "Delete notification");
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

function getUniqueCategories() {
  return Array.from(
    new Set(
      tasks
        .map((task) => String(task.category || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

function syncCategoryInputState() {
  const categorySelect = document.getElementById("task-category-select");
  const categoryNewInput = document.getElementById("task-category-new");
  const isNewCategory = categorySelect.value === "__new__";

  categoryNewInput.style.display = isNewCategory ? "block" : "none";
  if (!isNewCategory) {
    categoryNewInput.value = "";
  }
}

function populateCategoryOptions(selectedCategory = "") {
  const categorySelect = document.getElementById("task-category-select");
  const categoryNewInput = document.getElementById("task-category-new");
  const categories = getUniqueCategories();
  const hasExistingCategory = selectedCategory && categories.includes(selectedCategory);

  categorySelect.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Select a category";
  categorySelect.appendChild(placeholderOption);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  const newCategoryOption = document.createElement("option");
  newCategoryOption.value = "__new__";
  newCategoryOption.textContent = "+ Create New Category";
  categorySelect.appendChild(newCategoryOption);

  if (selectedCategory) {
    if (hasExistingCategory) {
      categorySelect.value = selectedCategory;
    } else {
      categorySelect.value = "__new__";
      categoryNewInput.value = selectedCategory;
    }
  } else if (categories.length === 0) {
    categorySelect.value = "__new__";
  } else {
    categorySelect.value = "";
  }

  syncCategoryInputState();
}

function openTaskInput(editTask = null) {
  document.getElementById("task-desc").value = editTask ? editTask.name : "";
  populateCategoryOptions(editTask ? editTask.category : "");
  setSubtaskRows(editTask ? editTask.subtasks : []);

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
  const categorySelectValue = document
    .getElementById("task-category-select")
    .value.trim();
  const categoryNewValue = document.getElementById("task-category-new").value.trim();
  const category = categorySelectValue === "__new__" ? categoryNewValue : categorySelectValue;
  const dateValue = document.getElementById("task-date").value.trim();
  const hour = document.getElementById("task-hour").value.trim();
  const min = document.getElementById("task-min").value.trim();
  const ampm = document.getElementById("task-ampm").value.trim();
  const notifications = normalizeTaskNotifications(getNotificationRowsValues());
  const { subtasks, promotedTasks } = getSubtaskRowsValues();

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

  const promotedTaskEntries = promotedTasks.map((task, index) => ({
    id: `${Date.now()}-promoted-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: task.name,
    category,
    due: "",
    completed: Boolean(task.completed),
    reminder: normalizeTaskReminder(DEFAULT_TASK_REMINDER),
    notifications: [],
    subtasks: normalizeSubtasks(task.subtasks),
    subtasksCollapsed: Boolean(task.subtasksCollapsed),
  }));

  if (editingTaskId) {
    const taskIndex = tasks.findIndex((t) => t.id === editingTaskId);
    const task = taskIndex >= 0 ? tasks[taskIndex] : null;
    if (task) {
      task.name = desc;
      task.category = category;
      task.due = due;
      task.notifications = notifications;
      task.subtasks = subtasks;
      task.subtasksCollapsed = Boolean(task.subtasksCollapsed);

      if (promotedTaskEntries.length) {
        tasks.splice(taskIndex + 1, 0, ...promotedTaskEntries);
      }
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
      subtasks,
      subtasksCollapsed: false,
    });

    if (promotedTaskEntries.length) {
      tasks.push(...promotedTaskEntries);
    }
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
      subtasks: normalizeSubtasks(task.subtasks),
      subtasksCollapsed: Boolean(task.subtasksCollapsed),
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
    await fetch("/api/save-to-dropbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userToken,
        dataType: "mementos",
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
    const response = await fetch("/api/load-from-dropbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userToken,
        dataType: "mementos",
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

function toggleTaskSubtasksCollapsed(taskId, collapsed) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  task.subtasksCollapsed = Boolean(collapsed);
  saveTasks();
  renderTasks();
}

function toggleSubtaskCompleted(taskId, subtaskId, completed) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !Array.isArray(task.subtasks)) return;

  const subtask = findSubtaskById(task.subtasks, subtaskId);
  if (!subtask) return;

  subtask.completed = completed;
  saveTasks();
  renderTasks();
}

function toggleSubtaskCollapsed(taskId, subtaskId, collapsed) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !Array.isArray(task.subtasks)) return;

  const subtask = findSubtaskById(task.subtasks, subtaskId);
  if (!subtask) return;

  subtask.collapsed = Boolean(collapsed);
  saveTasks();
  renderTasks();
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
      const wrapper = document.createElement("div");
      wrapper.className = "task";

      const taskStar = document.createElement("span");
      taskStar.className = "task-star";
      taskStar.setAttribute("aria-hidden", "true");
      wrapper.appendChild(taskStar);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.id = task.id;
      checkbox.checked = !!task.completed;
      checkbox.addEventListener("change", (e) => {
        toggleTaskCompleted(task.id, e.target.checked);
      });
      wrapper.appendChild(checkbox);

      const taskText = document.createElement("span");
      taskText.className = "task-text";
      taskText.textContent = task.name + " ";
      if (task.completed) {
        taskText.style.textDecoration = "line-through";
        taskText.style.color = "grey";
      }
      wrapper.appendChild(taskText);

      const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
      const taskActions = document.createElement("div");
      taskActions.className = "task-actions";
      let taskCollapseBtn = null;
      if (hasSubtasks) {
        taskCollapseBtn = document.createElement("button");
        taskCollapseBtn.type = "button";
        taskCollapseBtn.className = "task-collapse-btn";
        taskCollapseBtn.innerHTML = task.subtasksCollapsed
          ? '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
        taskCollapseBtn.title = task.subtasksCollapsed ? "Expand subtasks" : "Collapse subtasks";
        taskCollapseBtn.setAttribute("aria-label", taskCollapseBtn.title);
        taskCollapseBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleTaskSubtasksCollapsed(task.id, !task.subtasksCollapsed);
        });
      }

      if (taskCollapseBtn) {
        taskActions.appendChild(taskCollapseBtn);
      }

      if (editMode) {
        if (!task.completed) {
          const editTaskBtn = document.createElement("button");
          editTaskBtn.type = "button";
          editTaskBtn.className = "task-icon-btn task-edit-btn";
          editTaskBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
          editTaskBtn.title = "Edit Task";
          editTaskBtn.setAttribute("aria-label", "Edit Task");
          editTaskBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openTaskInput(task);
          });
          taskActions.appendChild(editTaskBtn);
        } else {
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "task-icon-btn task-delete-btn";
          delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
          delBtn.title = "Delete Task";
          delBtn.setAttribute("aria-label", "Delete Task");
          delBtn.addEventListener("click", (e) => {
            e.preventDefault();
            deleteTask(task.id);
          });
          taskActions.appendChild(delBtn);
        }
      }

      if (taskActions.childElementCount > 0) {
        wrapper.appendChild(taskActions);
      }

      section.appendChild(wrapper);

      if (task.due) {
        const dueSpan = document.createElement("small");
        dueSpan.className = "task-due";
        dueSpan.textContent = `(Due: ${formatDueDisplay(task.due)})`;
        if (task.completed) dueSpan.style.textDecoration = "line-through";
        section.appendChild(dueSpan);
      }

      if (hasSubtasks && !task.subtasksCollapsed) {
        const subtaskList = document.createElement("div");
        subtaskList.className = "subtask-list";

        appendSubtaskItems(task, task.subtasks, subtaskList, 0);

        section.appendChild(subtaskList);
      }
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
  document
    .getElementById("task-category-select")
    .addEventListener("change", syncCategoryInputState);
  document
    .getElementById("add-subtask-btn")
    .addEventListener("click", () => addSubtaskRow({ level: 0 }));
});
