// API integration for leaderboard

// Get the base URL dynamically based on current hostname
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin;

// Initialize the leaderboard tables
async function initLeaderboard() {
  try {
    const response = await fetch(`${API_URL}/init`);
    console.log('Leaderboard initialized:', await response.text());
    return true;
  } catch (error) {
    console.error('Failed to initialize leaderboard:', error);
    return false;
  }
}

// Get all domain stats from the server
async function getLeaderboardData() {
  try {
    const response = await fetch(`${API_URL}/leaderboard`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch leaderboard data:', error);
    return null;
  }
}

// Update stats for a specific domain
async function updateDomainStats(domain, score, beans) {
  try {
    const response = await fetch(`${API_URL}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain, score, beans }),
    });
    
    if (response.ok) {
      console.log(`Successfully updated ${domain} stats (Score: ${score}, Beans: ${beans})`);
      return true;
    } else {
      console.error('Failed to update stats:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error updating domain stats:', error);
    return false;
  }
}

// Export API functions
window.leaderboardAPI = {
  init: initLeaderboard,
  getAll: getLeaderboardData,
  update: updateDomainStats
};