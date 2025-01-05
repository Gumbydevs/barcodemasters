// Sample user data
const users = [
  { username: "player1", password: "password123", name: "Player One", wins: 5, losses: 3 },
  { username: "player2", password: "password456", name: "Player Two", wins: 10, losses: 2 }
];

// Function to simulate login
function login(username, password) {
  const user = users.find(user => user.username === username && user.password === password);
  if (user) {
      // Store logged-in user in localStorage
      localStorage.setItem('loggedInUser', JSON.stringify(user));
      window.location.href = 'profile.html'; // Redirect to the profile page
  } else {
      alert('Invalid username or password!');
  }
}

// Function to update the version number dynamically
function updateVersionNumber() {
    const versionNumber = "1.0.0";  // Change this version in one place
    document.getElementById('version').textContent = `Version: ${versionNumber}`;
}

// Run the version update script on profile page load
if (window.location.pathname.includes('profile.html')) {
    updateVersionNumber();
}
