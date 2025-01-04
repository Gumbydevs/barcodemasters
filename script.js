// script.js

// Version management
const VERSION = "1.0.0"; // Update this to change the version globally

// Set version on every page
document.querySelectorAll(".version").forEach(element => {
  element.textContent = `Version ${VERSION}`;
});

// Handle theme toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const body = document.body;
    body.classList.toggle('dark-mode');
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
  });
}

// Apply stored theme preference
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
}
