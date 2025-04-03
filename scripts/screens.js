// Global variables for audio management
let backgroundMusic = null;
let soundEnabled = true;

// Start audio context on user interaction
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

function initAudio() {
  if (!backgroundMusic) {
    backgroundMusic = new Audio('sounds/Game_Music.wav');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0;
  }
}

// Fade in the music over a specified duration
function fadeInMusic(audio, duration = 2000) {
  if (!audio || !soundEnabled) return;
  
  let startTime = Date.now();
  let interval = setInterval(() => {
    let elapsed = Date.now() - startTime;
    let volume = Math.min(0.5, elapsed / duration);
    
    audio.volume = volume;
    
    if (elapsed >= duration) {
      clearInterval(interval);
    }
  }, 50);
}

// Toggle sound on/off
function toggleSound() {
  soundEnabled = !soundEnabled;
  
  if (backgroundMusic) {
    if (soundEnabled) {
      backgroundMusic.play();
      fadeInMusic(backgroundMusic);
    } else {
      backgroundMusic.pause();
    }
  }
  
  // Update button image
  const soundButton = document.getElementById('soundButton');
  if (soundButton) {
    soundButton.src = soundEnabled ? 'images/Button_Sound_On.png' : 'images/Button_Sound_Off.png';
  }
}

// Auto-pause music when tab is not focused
document.addEventListener('visibilitychange', () => {
  if (backgroundMusic && soundEnabled) {
    if (document.hidden) {
      backgroundMusic.pause();
    } else {
      backgroundMusic.play();
    }
  }
});

// Show a specific screen by ID
function showScreen(screenId) {
  // Hide all screens
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.style.display = 'none';
  });
  
  // Show the requested screen
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.style.display = 'flex';
  }
}

// Initialize and show the title screen
async function showTitleScreen() {
  showScreen('titleScreen');
  
  if (backgroundMusic) {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play();
    fadeInMusic(backgroundMusic);
  }
  
  // Initialize the leaderboard
  if (window.leaderboardAPI) {
    await window.leaderboardAPI.init();
  }
}

// Show the main menu with domains
async function showMainMenu() {
  showScreen('mainMenuScreen');
  
  // Fetch and display domain stats
  await updateDomainStatsDisplay();
}

// Show the game screen
function showGameScreen() {
  showScreen('gameScreen');
}

// Show the end screen with score
function showEndScreen(score) {
  const scoreElement = document.getElementById('finalScore');
  if (scoreElement) {
    scoreElement.textContent = score;
  }
  
  showScreen('endScreen');
}

// Start the game with the chosen element type
function startGame(elementType) {
  // Check if the game has been initialized
  if (!window.gameInstance) {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      window.initGame(canvas, elementType);
    }
  } else {
    // Reset and start with new element type
    window.gameInstance.elementType = elementType;
    window.gameInstance.start();
  }
  
  showGameScreen();
}

// Restart the game
function restartGame() {
  if (window.gameInstance) {
    window.gameInstance.start();
    showGameScreen();
  }
}

// Update domain stats display on main menu
async function updateDomainStatsDisplay() {
  // Try to get stats from API first
  let domainStats = null;
  
  if (window.leaderboardAPI) {
    try {
      domainStats = await window.leaderboardAPI.getAll();
    } catch (error) {
      console.error('Failed to fetch leaderboard data:', error);
    }
  }
  
  // If API call failed, use local storage
  if (!domainStats) {
    domainStats = [];
    const domains = ['lightning', 'fire', 'water', 'earth'];
    
    domains.forEach(domain => {
      const stats = JSON.parse(localStorage.getItem(`domain_${domain}`)) || {
        highScore: 0,
        totalScore: 0,
        totalBeans: 0
      };
      
      domainStats.push({
        domain,
        high_score: stats.highScore,
        total_score: stats.totalScore,
        total_beans: stats.totalBeans
      });
    });
  }
  
  // Update the UI for each domain
  domainStats.forEach(stats => {
    const statContainer = document.getElementById(`${stats.domain}Stats`);
    if (statContainer) {
      statContainer.innerHTML = `
        <div class="stat">High: ${stats.high_score}</div>
        <div class="stat">Total: ${stats.total_score}</div>
        <div class="stat">Beans: ${stats.total_beans}</div>
      `;
    }
  });
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
  // Show the title screen
  showTitleScreen();
  
  // Setup event listeners for sound toggle
  const soundButton = document.getElementById('soundButton');
  if (soundButton) {
    soundButton.addEventListener('click', toggleSound);
  }
});