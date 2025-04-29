// screens.js

function resetAllDomainStats() {
  const domains = ["fire", "earth", "water", "lightning"];
  domains.forEach((domain) => {
    localStorage.setItem(`${domain}_cumulative_score`, "0");
    localStorage.setItem(`${domain}_beans`, "0");
    localStorage.setItem(`${domain}_score`, "0");
  });
  updateDomainStatsDisplay();
}


function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((screen) => screen.classList.add("hidden"));
  const target = document.getElementById(screenId);
  if (target) target.classList.remove("hidden");
}

// 🌐 API base URL (use current host for both local and deployed environments)
const API_BASE_URL = window.location.origin;

// 🔊 Global Music (shared across screens)
let bgMusic = new Audio("sounds/Game_Music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;
bgMusic.mozAudioChannelType = 'content';  // Firefox
bgMusic.webkitMediaClass = 'playback';    // Webkit

bgMusic.preload = "auto";
bgMusic.load();

bgMusic.onerror = (e) => {
  console.error("❌ Failed to load music:", e);
};

window.soundEnabled = true;
let resizeListenerAdded = false;

// 🔁 Initialize game on load
document.addEventListener("DOMContentLoaded", () => {
  showTitleScreen();
  document.getElementById("soundIcon").src = "images/sound-on.png";
  
  // Initialize device type detection
  checkDeviceType();
});

// Helper function for smooth fade-in of audio
function fadeInMusic(audio, duration = 2000) {
  audio.volume = 0;
  const targetVolume = 0.5;
  const step = targetVolume / (duration / 50); // 50ms intervals

  const fade = setInterval(() => {
    if (audio.volume < targetVolume) {
      audio.volume = Math.min(audio.volume + step, targetVolume);
    } else {
      clearInterval(fade);
    }
  }, 50);
}

// 🎚 Toggle sound
function toggleSound() {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    bgMusic.volume = 0; // start silent
    bgMusic.play()
      .then(() => fadeInMusic(bgMusic))
      .catch(() => {/* Silently handle blocked autoplay */});
    document.getElementById("soundIcon").src = "images/sound-on.png";
  } else {
    bgMusic.pause();
    document.getElementById("soundIcon").src = "images/sound-off.png";
  }

  if (game) {
    game.soundEnabled = soundEnabled;
  }
}

// ⏮ Title screen
function showTitleScreen() {
  showScreen("titleScreen");

  if (soundEnabled && bgMusic.paused) {
    bgMusic.volume = 0;
    bgMusic.play()
      .then(() => fadeInMusic(bgMusic))
      .catch(() => {/* Silently handle blocked autoplay */});
  }
}

// 🧭 Main menu
function showMainMenu() {
  showScreen("mainMenu");
  updateDomainStatsDisplay();

  if (soundEnabled && bgMusic.paused) {
    bgMusic.volume = 0;
    bgMusic.play()
      .then(() => fadeInMusic(bgMusic))
      .catch(() => {/* Silently handle blocked autoplay */});
  }
}

// 🎮 Game screen
function showGameScreen() {
  showScreen("gameScreen");
}

// ☠️ End screen
function showEndScreen(score) {
  showScreen("endGameScreen");

  document.getElementById("finalScore").textContent = `Your Score: ${score}`;
  document.getElementById("finalHighScore").textContent =
    `High Score: ${localStorage.getItem(game?.scoreKey) || 0}`;
  document.getElementById("beanCountDisplay").textContent =
    `Beans Collected: ${localStorage.getItem(game?.beanKey) || 0}`;

  if (soundEnabled) bgMusic.pause();

  const defeatSprite = document.getElementById("defeatSprite");
  if (defeatSprite && game?.characterDefeatImage?.src) {
    defeatSprite.src = game.characterDefeatImage.src;
  }
}

// 🧪 Game starter
function startGame(elementType) {
  const canvas = document.getElementById("gameCanvas");

  if (!resizeListenerAdded) {
    window.addEventListener("resize", () => {
      if (canvas && game) {
        initGame(canvas, game.elementType);
      }
    });
    resizeListenerAdded = true;
  }

  console.log(`Starting game with ${elementType}`);
  showGameScreen();

  if (canvas) {
    initGame(canvas, elementType).catch(console.error);
  } else {
    console.error("Game canvas not found");
  }
}

// 🔁 Restart button from end screen
function restartGame() {
  const canvas = document.getElementById("gameCanvas");

  if (soundEnabled) {
    bgMusic.volume = 0;
    bgMusic.play()
      .then(() => fadeInMusic(bgMusic))
      .catch(() => {/* Silently handle blocked autoplay */});
  }

  showMainMenu();

  if (canvas) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  document.getElementById("soundIcon").src = soundEnabled
    ? "images/sound-on.png"
    : "images/sound-off.png";
}

function updateDomainStatsDisplay() {
  // First, show the data from localStorage while we fetch from the server
  const domains = ["fire", "earth", "water", "lightning"];
  domains.forEach((domain) => {
    const scoreKey = `${domain}_cumulative_score`;
    const beanKey = `${domain}_beans`;
    const score = localStorage.getItem(scoreKey) || 0;
    const beans = localStorage.getItem(beanKey) || 0;

    const label = document.getElementById(`${domain}Stats`);
    if (label) {
    label.innerHTML = `Team Score: ${score}<br>Beans Collected: ${beans}`;
    }
  });

  // Now fetch the latest data from the server
  fetch(`${API_BASE_URL}/api/leaderboard`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Update the UI with data from the server
      data.forEach(item => {
        const domain = item.domain;
        const label = document.getElementById(`${domain}Stats`);
        if (label) {
          label.innerHTML = `Team Score: ${item.total_score}<br>Beans Collected: ${item.total_beans}`;

          // Also update localStorage with latest server data
          localStorage.setItem(`${domain}_cumulative_score`, item.total_score);
          localStorage.setItem(`${domain}_beans`, item.total_beans);
        }
      });
    })
    .catch(error => {
      console.error('Failed to fetch domain stats:', error);
      // Continue using localStorage data if server fetch fails
    });
}

// Auto-pause/resume when switching tabs
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (!bgMusic.paused) bgMusic.pause();
  } else {
    if (soundEnabled && bgMusic.paused) {
      bgMusic.volume = 0;
      bgMusic.play()
        .then(() => fadeInMusic(bgMusic, 1000))
        .catch(() => {/* Silently handle blocked autoplay */});
    }
  }
});
// Show lore screen
function showLoreScreen() {
  showScreen("loreScreen");
  // Reset to first page when showing lore screen
  currentLorePage = 1;
  
  // Check if user is on desktop or mobile
  checkDeviceType();
  
  // Update lore pages
  updateLorePages();
}

let currentLorePage = 1;
let isDesktop = false;

// Check if user is on desktop or mobile
function checkDeviceType() {
  isDesktop = window.innerWidth > 768;

  const mobileView = document.querySelector('.lore-pages.mobile-view');
  const desktopView = document.querySelector('.lore-pages.desktop-view');
  const desktopStartButton = document.querySelector('#loreScreen .start-button.desktop-view');
  const mobileStartButton = document.querySelector('#loreScreen .start-button.mobile-view');
  const nextButton = document.querySelector('.next-button.mobile-view');
  
  if (isDesktop) {
    // Desktop view: Show all paragraphs at once with start button
    if (desktopView) desktopView.classList.remove('hidden');
    if (mobileView) mobileView.classList.add('hidden');
    if (desktopStartButton) desktopStartButton.classList.remove('hidden');
    
    // Hide mobile elements
    if (mobileStartButton) mobileStartButton.classList.add('hidden');
    if (nextButton) nextButton.classList.add('hidden');
  } else {
    // Mobile view: Show only the current paragraph
    if (desktopView) desktopView.classList.add('hidden');
    if (mobileView) mobileView.classList.remove('hidden');
    
    // Update the correct page visibility
    document.querySelectorAll('.lore-page').forEach(page => {
      page.classList.add('hidden');
    });
    
    const currentPage = document.querySelector(`.lore-page[data-page="${currentLorePage}"]`);
    if (currentPage) {
      currentPage.classList.remove('hidden');
    }
    
    // Update navigation buttons
    if (currentLorePage === 3) {
      if (nextButton) nextButton.classList.add('hidden');
      if (mobileStartButton) mobileStartButton.classList.remove('hidden');
    } else {
      if (nextButton) nextButton.classList.remove('hidden');
      if (mobileStartButton) mobileStartButton.classList.add('hidden');
    }
    
    // Hide desktop button
    if (desktopStartButton) desktopStartButton.classList.add('hidden');
  }
}

// Add resize listener to handle screen rotations or window resizing
window.addEventListener('resize', checkDeviceType);

function nextLorePage() {
  if (currentLorePage < 3) {
    currentLorePage++;
    updateLorePages();
  }
}

function updateLorePages() {
  // For desktop, we don't need to update anything as all pages are shown
  // For mobile, we need to update the current page and navigation
  if (!isDesktop) {
    // Hide all pages (mobile view)
    document.querySelectorAll('.lore-page').forEach(page => {
      page.classList.add('hidden');
    });
    
    // Show current page (mobile view)
    const currentPage = document.querySelector(`.lore-page[data-page="${currentLorePage}"]`);
    if (currentPage) {
      currentPage.classList.remove('hidden');
    }
    
    // Update navigation for mobile view
    const nextButton = document.querySelector('.next-button.mobile-view');
    const mobileStartButton = document.querySelector('#loreScreen .start-button.mobile-view');
    
    if (nextButton && mobileStartButton) {
      if (currentLorePage === 3) {
        nextButton.style.display = 'none';
        mobileStartButton.classList.remove('hidden');
      } else {
        nextButton.style.display = 'block';
        mobileStartButton.classList.add('hidden');
      }
    }
  }
}

// Export global functions needed in HTML onclick handlers
window.showMainMenu = showMainMenu;
window.showLoreScreen = showLoreScreen;
window.startGame = startGame;
window.restartGame = restartGame;
window.toggleSound = toggleSound;
window.nextLorePage = nextLorePage;