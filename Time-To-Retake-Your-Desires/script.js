document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("categories");
  const grouped = {};

  // Group tasks by category
  dailyTasks.forEach(task => {
    task.categories.forEach(cat => {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(task);
    });
  });

  // Render each category section
  Object.entries(grouped).forEach(([category, tasks]) => {
    const section = document.createElement("div");
    section.className = "category";

    const heading = document.createElement("h2");
    heading.textContent = category;
    section.appendChild(heading);

    tasks.forEach(task => {
      const wrapper = document.createElement("label");
      wrapper.className = "task";
      wrapper.innerHTML = `
        <input type="checkbox" data-id="${task.id}" />
        ${task.name}
      `;
      section.appendChild(wrapper);
    });

    container.appendChild(section);
  });

  // Sync checkboxes with the same task ID
  container.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      const id = e.target.dataset.id;
      const checked = e.target.checked;
      document.querySelectorAll(`input[data-id="${id}"]`).forEach(cb => {
        cb.checked = checked;
      });
    }
  });

  // Reset all checkboxes
  document.getElementById("reset-btn").addEventListener("click", () => {
    document.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.checked = false;
    });
  });
});
