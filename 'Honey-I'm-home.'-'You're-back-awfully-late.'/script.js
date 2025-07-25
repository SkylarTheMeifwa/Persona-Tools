// Ensure the global state
let tasks = [];
let editMode = false;
let editingTaskId = null;

function parseDueDate(dueStr) {
  if (!dueStr) return null;
  const parts = dueStr.trim().split(" ");
  if (parts.length !== 3) return null;
  const [date, time, ampm] = parts;
  const [month, day] = date.split("/").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  let hours = hh;
  if (ampm.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
  const year = new Date().getFullYear();
  return new Date(year, month - 1, day, hours, mm);
}

function openTaskInput(editTask = null) {
  document.getElementById("task-desc").value = editTask ? editTask.name : "";
  document.getElementById("task-category").value = editTask
    ? editTask.category
    : "";

  if (editTask && editTask.due) {
    const parts = editTask.due.split(" ");
    if (parts.length === 3) {
      const [time, ampm, date] = parts;
      const [month, day] = date.split("/");
      const [hour, min] = time.split(":");
      document.getElementById("task-month").value = month;
      document.getElementById("task-day").value = day;
      document.getElementById("task-hour").value = hour;
      document.getElementById("task-min").value = min;
      document.getElementById("task-ampm").value = ampm;
    }
  } else {
    document.getElementById("task-month").value = "";
    document.getElementById("task-day").value = "";
    document.getElementById("task-hour").value = "";
    document.getElementById("task-min").value = "";
    document.getElementById("task-ampm").value = "";
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
  const month = document.getElementById("task-month").value.trim();
  const day = document.getElementById("task-day").value.trim();
  const hour = document.getElementById("task-hour").value.trim();
  const min = document.getElementById("task-min").value.trim();
  const ampm = document.getElementById("task-ampm").value.trim();

  let due = "";
  const hasPartialInput = month || day || hour || min || ampm;
  const hasAllDateTime = month && day && hour && min && ampm;

  if (hasPartialInput && !hasAllDateTime) {
    alert("Please fill out all date/time fields or leave them all blank.");
    return;
  }

  if (hasAllDateTime) {
    due = `${hour}:${min} ${ampm} ${month}/${day}`;
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
    }
  } else {
    const id = Date.now().toString();
    tasks.push({ id, name: desc, category, due, completed: false });
  }

  saveTasks();
  renderTasks();
  closeTaskInput();
}

function saveTasks() {
  localStorage.setItem("p5Tasks", JSON.stringify(tasks));
}

function loadTasks() {
  const saved = localStorage.getItem("p5Tasks");
  if (saved) tasks = JSON.parse(saved);
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
        dueSpan.textContent = `(Due: ${task.due})`;
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
});
