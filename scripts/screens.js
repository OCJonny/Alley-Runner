import { initGame } from './game.js';
import { loadAudio } from './utils.js';
import { initLeaderboard, getLeaderboardData } from './api.js';

// Game variables
let game = null;
let backgroundMusic = null;
let soundEnabled = true;
let domainStats = {};

/**
 * Initialize audio elements
 */
function initAudio() {
  if (!backgroundMusic) {
    backgroundMusic = loadAudio('sounds/Game_Music.wav');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0;
  }
}

/**
 * Fade in music gradually
 * @param {HTMLAudioElement} audio - Audio element to fade in
 * @param {number} duration - Fade duration in milliseconds
 */
function fadeInMusic(audio, duration = 2000) {
  if (!audio || !soundEnabled) return;
  
  let startTime = performance.now();
  const initialVolume = audio.volume;
  const targetVolume = 0.6; // Max volume
  
  function step() {
    let currentTime = performance.now();
    let elapsed = currentTime - startTime;
    let progress = Math.min(elapsed / duration, 1);
    
    audio.volume = initialVolume + (targetVolume - initialVolume) * progress;
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  
  audio.play().catch(error => {
    console.warn('Audio playback was prevented by the browser:', error);
  });
  
  requestAnimationFrame(step);
}

/**
 * Toggle sound on/off
 */
function toggleSound() {
  soundEnabled = !soundEnabled;
  
  const soundButton = document.getElementById('sound-toggle');
  if (soundButton) {
    soundButton.textContent = soundEnabled ? '🔊' : '🔇';
  }
  
  if (backgroundMusic) {
    if (soundEnabled) {
      fadeInMusic(backgroundMusic, 500);
    } else {
      backgroundMusic.volume = 0;
    }
  }
}

/**
 * Show a specific screen and hide others
 * @param {string} screenId - ID of the screen to show
 */
function showScreen(screenId) {
  // Hide all screens
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.style.display = 'none';
  });
  
  // Show requested screen
  const screenToShow = document.getElementById(screenId);
  if (screenToShow) {
    screenToShow.style.display = 'flex';
  }
}

/**
 * Show the title screen with fade-in effect
 */
async function showTitleScreen() {
  showScreen('title-screen');
  
  // Initialize audio
  initAudio();
  
  // Preload domain stats
  try {
    const leaderboardData = await initLeaderboard();
    domainStats = {};
    
    leaderboardData.forEach(item => {
      domainStats[item.domain] = {
        highScore: item.high_score,
        totalScore: item.total_score,
        totalBeans: item.total_beans
      };
    });
    
    console.log('Domain stats loaded:', domainStats);
  } catch (error) {
    console.error('Failed to load domain stats:', error);
  }
  
  // Add event listener to start button
  const startButton = document.getElementById('start-button');
  if (startButton) {
    startButton.onclick = showMainMenu;
  }
  
  // Add sound toggle button listener
  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.onclick = toggleSound;
  }
}

/**
 * Show the main menu screen with domain buttons
 */
async function showMainMenu() {
  showScreen('main-menu');
  
  // Start background music if not already playing
  if (backgroundMusic && soundEnabled && backgroundMusic.paused) {
    fadeInMusic(backgroundMusic);
  }
  
  // Get latest domain stats
  try {
    const leaderboardData = await getLeaderboardData();
    domainStats = {};
    
    leaderboardData.forEach(item => {
      domainStats[item.domain] = {
        highScore: item.high_score,
        totalScore: item.total_score,
        totalBeans: item.total_beans
      };
    });
    
    // Update domain stats display
    await updateDomainStatsDisplay();
  } catch (error) {
    console.error('Failed to update domain stats:', error);
  }
  
  // Set up domain selection buttons
  const domains = ['lightning', 'fire', 'water', 'earth'];
  domains.forEach(domain => {
    const button = document.getElementById(`${domain}-button`);
    if (button) {
      button.onclick = () => startGame(domain);
    }
  });
}

/**
 * Show the main game screen
 */
function showGameScreen() {
  showScreen('game-screen');
  
  // Reset score display
  const scoreElement = document.getElementById('score');
  if (scoreElement) {
    scoreElement.textContent = '0';
  }
  
  // Reset lives display
  const livesContainer = document.getElementById('lives-container');
  if (livesContainer) {
    livesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const lifeIcon = document.createElement('img');
      lifeIcon.src = 'images/Bean.png';
      lifeIcon.style.width = '30px';
      lifeIcon.style.height = '30px';
      lifeIcon.style.marginRight = '5px';
      livesContainer.appendChild(lifeIcon);
    }
  }
}

/**
 * Show the end screen with score and buttons
 * @param {number} score - Final score
 */
function showEndScreen(score) {
  showScreen('end-screen');
  
  // Display final score
  const finalScoreElement = document.getElementById('final-score');
  if (finalScoreElement) {
    finalScoreElement.textContent = score;
  }
  
  // Display high score for current domain
  const highScoreElement = document.getElementById('high-score');
  if (highScoreElement && game) {
    const domain = game.elementType;
    const highScore = domainStats[domain]?.highScore || 0;
    highScoreElement.textContent = highScore;
  }
  
  // Display beans collected
  const beansCollectedElement = document.getElementById('beans-collected');
  if (beansCollectedElement && game) {
    beansCollectedElement.textContent = game.totalBeansCollected;
  }
  
  // Set up restart button
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    restartButton.onclick = restartGame;
  }
  
  // Set up main menu button
  const menuButton = document.getElementById('menu-button');
  if (menuButton) {
    menuButton.onclick = showMainMenu;
  }
}

/**
 * Start a new game with the selected domain
 * @param {string} elementType - Domain element type (lightning, fire, water, earth)
 */
function startGame(elementType) {
  // Stop any existing game
  if (game) {
    game.stop();
    game = null;
  }
  
  // Show game screen
  showGameScreen();
  
  // Initialize new game
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    // Set canvas size based on screen size
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      canvas.width = Math.min(window.innerWidth - 20, 400);
      canvas.height = Math.min(window.innerHeight - 150, 600);
    } else {
      canvas.width = 500;
      canvas.height = 700;
    }
    
    // Initialize and start game
    initGame(canvas, elementType)
      .then(newGame => {
        game = newGame;
        
        // Handle game over event
        game.onGameOver = () => {
          showEndScreen(game.score);
        };
        
        // Start the game
        game.start();
        
        // Update the game background to match the domain
        document.getElementById('game-screen').className = 'screen ' + elementType;
      })
      .catch(error => {
        console.error('Error initializing game:', error);
      });
  }
}

/**
 * Restart the game after game over
 */
function restartGame() {
  // Get current domain from game
  const elementType = game ? game.elementType : 'lightning';
  
  // Start a new game with the same domain
  startGame(elementType);
}

/**
 * Update domain stats display in main menu
 */
async function updateDomainStatsDisplay() {
  const domains = ['lightning', 'fire', 'water', 'earth'];
  
  domains.forEach(domain => {
    const stats = domainStats[domain] || { highScore: 0, totalScore: 0, totalBeans: 0 };
    
    // Update total score display
    const totalScoreElement = document.getElementById(`${domain}-total-score`);
    if (totalScoreElement) {
      totalScoreElement.textContent = stats.totalScore;
    }
    
    // Update total beans display
    const totalBeansElement = document.getElementById(`${domain}-total-beans`);
    if (totalBeansElement) {
      totalBeansElement.textContent = stats.totalBeans;
    }
  });
}

// Event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  showTitleScreen();
  
  // Visibility change handling for background music
  document.addEventListener('visibilitychange', () => {
    if (backgroundMusic && soundEnabled) {
      if (document.hidden) {
        backgroundMusic.pause();
      } else {
        backgroundMusic.play().catch(error => {
          console.warn('Audio playback was prevented by the browser:', error);
        });
      }
    }
  });
});

// Expose functions globally
window.showTitleScreen = showTitleScreen;
window.showMainMenu = showMainMenu;
window.showGameScreen = showGameScreen;
window.showEndScreen = showEndScreen;
window.startGame = startGame;
window.restartGame = restartGame;
window.toggleSound = toggleSound;