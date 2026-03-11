window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("dropbox-token-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const token = document.getElementById("dropbox-token-input").value.trim();
      if (token) {
        localStorage.setItem("dropbox_token", token);
        alert("Dropbox token saved to localStorage!");
        document.getElementById("dropbox-token-input").value = "";
      }
    });
  }
});
