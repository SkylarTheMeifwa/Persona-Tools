// Dropbox logout utility
function dropboxLogout() {
  localStorage.removeItem("dropbox_token");
  alert("Dropbox token removed. Please reconnect.");
  // Optionally, reload the page to clear any cached state
  window.location.reload();
}

// Attach to button if present
window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("dropbox-logout-btn");
  if (btn) btn.addEventListener("click", dropboxLogout);
});
