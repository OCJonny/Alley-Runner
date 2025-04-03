/**
 * API functions for interacting with the server
 */

// Initialize the leaderboard data
async function initLeaderboard() {
  try {
    const leaderboardData = await getLeaderboardData();
    // Use this data to display in UI
    return leaderboardData;
  } catch (error) {
    console.error('Failed to initialize leaderboard:', error);
    // Handle gracefully - show empty leaderboard or error message
    return [];
  }
}

// Get leaderboard data from the server
async function getLeaderboardData() {
  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    throw error;
  }
}

// Update domain stats on the server
async function updateDomainStats(domain, score, beans) {
  try {
    const response = await fetch('/api/stats/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        score,
        beans
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating domain stats:', error);
    // Continue game even if server update fails
    // Store stats locally as backup
    return null;
  }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initLeaderboard,
    getLeaderboardData,
    updateDomainStats
  };
}