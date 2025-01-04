document.addEventListener('DOMContentLoaded', () => {
  console.log("Monster Collection Page Loaded");

  const spreadsheetId = "15s90AxqNSzv-K_639ffokf-6Zd5tSFdHeBPFZIyG7Jc"; 
  const apiKey = "AIzaSyAvSQBek_khqKh5ZEYhWcqlF0taRg_Q1R4";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1?key=${apiKey}`;

  async function fetchMonsters() {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.values) {
        renderMonsters(data.values);
      } else {
        console.error("No data found in the spreadsheet.");
      }
    } catch (error) {
      console.error("Error fetching monster data:", error);
    }
  }

  function renderMonsters(monsters) {
    const monsterGrid = document.getElementById("monsterGrid");
    monsterGrid.innerHTML = ""; // Clear existing content

    monsters.slice(1).forEach(monster => { // Skip header row
      const [name, type, level, experience, image] = monster;

      const card = document.createElement("div");
      card.className = "monster-card";

      const monsterImage = document.createElement("img");
      monsterImage.className = "monster-image";
      monsterImage.src = image || "default-monster.png"; // Fallback image
      monsterImage.alt = `${name} Image`;

      const info = document.createElement("div");
      info.className = "monster-info";
      info.innerHTML = `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Level:</strong> ${level}</p>
        <p><strong>Experience:</strong> ${experience}</p>
      `;

      card.appendChild(monsterImage);
      card.appendChild(info);
      monsterGrid.appendChild(card);
    });
  }

  document.getElementById("backButton").addEventListener("click", () => {
    window.location.href = "home.html";
  });

  fetchMonsters();
});
