/**
 * API functions for interacting with the server
 */

// Mock data for domains when server is not available
const mockDomainStats = {
  lightning: { domain: 'lightning', high_score: 0, total_score: 0, total_beans: 0 },
  fire: { domain: 'fire', high_score: 0, total_score: 0, total_beans: 0 },
  water: { domain: 'water', high_score: 0, total_score: 0, total_beans: 0 },
  earth: { domain: 'earth', high_score: 0, total_score: 0, total_beans: 0 }
};

// Local storage helpers
function getLocalStats() {
  const storedStats = localStorage.getItem('domainStats');
  return storedStats ? JSON.parse(storedStats) : mockDomainStats;
}

function updateLocalStats(domain, score, beans) {
  let stats = getLocalStats();
  
  if (!stats[domain]) {
    stats[domain] = { domain, high_score: 0, total_score: 0, total_beans: 0 };
  }
  
  stats[domain].high_score = Math.max(stats[domain].high_score, score);
  stats[domain].total_score += score;
  stats[domain].total_beans += beans;
  
  localStorage.setItem('domainStats', JSON.stringify(stats));
  return stats[domain];
}

// Initialize the leaderboard data
export async function initLeaderboard() {
  try {
    const leaderboardData = await getLeaderboardData();
    // Use this data to display in UI
    return leaderboardData;
  } catch (error) {
    console.error('Failed to initialize leaderboard:', error);
    // Use local storage as fallback
    return Object.values(getLocalStats());
  }
}

// Get leaderboard data from the server or local storage
export async function getLeaderboardData() {
  try {
    // This would be the server call, but we're using localStorage for now
    // const response = await fetch('/api/leaderboard');
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // return await response.json();
    
    // Return local storage data
    return Object.values(getLocalStats());
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    // Return local storage data as fallback
    return Object.values(getLocalStats());
  }
}

// Update domain stats (locally for now)
export async function updateDomainStats(domain, score, beans) {
  try {
    // This would be the server call, but we're using localStorage for now
    // const response = await fetch('/api/stats/update', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     domain,
    //     score,
    //     beans
    //   })
    // });
    // 
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // 
    // return await response.json();
    
    // Update local storage
    return updateLocalStats(domain, score, beans);
  } catch (error) {
    console.error('Error updating domain stats:', error);
    // Use local storage as backup
    return updateLocalStats(domain, score, beans);
  }
}