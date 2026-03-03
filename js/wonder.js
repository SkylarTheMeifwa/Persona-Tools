document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("daily-categories");
  const grouped = {};

  // Group tasks by category
  dailyTasks.forEach((task) => {
    task.categories.forEach((cat) => {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(task);
    });
  });

  // Define the custom category order
  const categoryOrder = [
    "Login Rewards",
    "Thieves Den",
    "Goals",
    "Leblanc",
    "Start Rewards",
    "Revelation Cards",
    "Lufel's Plans",
    "Kamoshita's Arc",
  ];

  // Sort and render categories in desired order
  categoryOrder.forEach((category) => {
    if (!grouped[category]) return;

    // Sort tasks: unchecked before checked
    grouped[category].sort((a, b) => {
      const aChecked = localStorage.getItem(`task-${a.id}`) === "true";
      const bChecked = localStorage.getItem(`task-${b.id}`) === "true";
      return aChecked - bChecked;
    });

    const section = document.createElement("div");
    section.className = "category";

    const heading = document.createElement("h3");
    heading.textContent = category;
    section.appendChild(heading);

    grouped[category].forEach((task) => {
      const wrapper = document.createElement("label");
      wrapper.className = "task";
      const isChecked = localStorage.getItem(`task-${task.id}`) === "true";

      wrapper.innerHTML = `
          <input type="checkbox" data-id="${task.id}" ${
        isChecked ? "checked" : ""
      } />
          <span class="task-text">${task.name}</span>
        `;

      if (isChecked) {
        wrapper.style.opacity = "0.4";
        const textSpan = wrapper.querySelector(".task-text");
        if (textSpan) textSpan.style.textDecoration = "line-through";
      }

      section.appendChild(wrapper);
    });

    container.appendChild(section);
  });

  // Sync checkboxes and store state
  container.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      const id = e.target.dataset.id;
      const checked = e.target.checked;
      localStorage.setItem(`task-${id}`, checked);

      // Sync all checkboxes with same ID
      document.querySelectorAll(`input[data-id="${id}"]`).forEach((cb) => {
        cb.checked = checked;
      });

      // Optionally update opacity and strikethrough dynamically
      document.querySelectorAll(`input[data-id="${id}"]`).forEach((input) => {
        const label = input.closest("label.task");
        if (label) {
          if (checked) {
            label.style.opacity = "0.4";
            const span = label.querySelector(".task-text");
            if (span) span.style.textDecoration = "line-through";
          } else {
            label.style.opacity = "1";
            const span = label.querySelector(".task-text");
            if (span) span.style.textDecoration = "none";
          }
        }
      });
    }
  });

  // Reset all checkboxes
  document.getElementById("reset-btn").addEventListener("click", () => {
    document.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = false;
      localStorage.setItem(`task-${cb.dataset.id}`, false);

      const label = cb.closest("label.task");
      if (label) {
        label.style.opacity = "1";
        const span = label.querySelector(".task-text");
        if (span) span.style.textDecoration = "none";
      }
    });
  });
});
