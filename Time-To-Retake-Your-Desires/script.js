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
    "Kamoshita's Arc"
  ];

  // Sort and render categories in desired order
  categoryOrder.forEach((category) => {
    if (!grouped[category]) return;

    const section = document.createElement("div");
    section.className = "category";

    const heading = document.createElement("h2");
    heading.textContent = category;
    section.appendChild(heading);

    grouped[category].forEach((task) => {
      const wrapper = document.createElement("label");
      wrapper.className = "task";
      const isChecked = localStorage.getItem(`task-${task.id}`) === "true";

      wrapper.innerHTML = `
        <input type="checkbox" data-id="${task.id}" ${isChecked ? "checked" : ""} />
        ${task.name}
      `;
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
    }
  });

  // Reset all checkboxes
  document.getElementById("reset-btn").addEventListener("click", () => {
    document.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = false;
      localStorage.setItem(`task-${cb.dataset.id}`, false);
    });
  });
});
