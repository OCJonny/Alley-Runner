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

// 🌐 API base URL
const API_BASE_URL = window.location.origin;

// 🔊 Global Music
let bgMusic = new Audio("sounds/Game_Music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;
bgMusic.mozAudioChannelType = 'content';
bgMusic.webkitMediaClass = 'playback';

bgMusic.preload = "auto";
bgMusic.load();

bgMusic.onerror = (e) => {
  console.error("❌ Failed to load music:", e);
};

window.soundEnabled = true;
let resizeListenerAdded = false;

document.addEventListener("DOMContentLoaded", () => {
  showTitleScreen();
  document.getElementById("soundIcon").src = "images/sound-on.png";
});

function fadeInMusic(audio, duration = 2000) {
  audio.volume = 0;
  const targetVolume = 0.5;
  const step = targetVolume / (duration / 50);

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
    bgMusic.volume = 0;
    bgMusic.play()
      .then(() => fadeInMusic(bgMusic))
      .catch(() => {});
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
      .catch(() => {});
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
      .catch(() => {});
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

// 🔁 Restart button
function restartGame() {
  const canvas = document.getElementById("gameCanvas");

  if (soundEnabled) {
    bgMusic.volume = 0;
    bgMusic.play()
      .then(() => fadeInMusic(bgMusic))
      .catch(() => {});
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

  fetch(`${API_BASE_URL}/api/leaderboard`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      data.forEach(item => {
        const domain = item.domain;
        const label = document.getElementById(`${domain}Stats`);
        if (label) {
          label.innerHTML = `Team Score: ${item.total_score}<br>Beans Collected: ${item.total_beans}`;
          localStorage.setItem(`${domain}_cumulative_score`, item.total_score);
          localStorage.setItem(`${domain}_beans`, item.total_beans);
        }
      });
    })
    .catch(error => {
      console.error('Failed to fetch domain stats:', error);
    });
}

// Auto-pause/resume music
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (!bgMusic.paused) bgMusic.pause();
  } else {
    if (soundEnabled && bgMusic.paused) {
      bgMusic.volume = 0;
      bgMusic.play()
        .then(() => fadeInMusic(bgMusic, 1000))
        .catch(() => {});
    }
  }
});

// 📜 Lore Scrolling

let currentLorePage = 1;

function hideAllScreens() {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.add('hidden'));
}

function isMobileByAspectRatio() {
  return window.innerHeight > window.innerWidth;
}

function showLoreScreen() {
  hideAllScreens();
  document.getElementById('loreScreen').classList.remove('hidden');

  const allPages = document.querySelectorAll('.lore-page');
  allPages.forEach(page => page.classList.add('hidden'));

  const firstPage = document.querySelector('.lore-page[data-page="1"]');
  if (firstPage) {
    firstPage.classList.remove('hidden');
    firstPage.style.opacity = 1; // Reset fade
  }

  currentLorePage = 1;

  const startButton = document.querySelector('.lore-navigation .start-button');
  const nextButton = document.querySelector('.lore-navigation .next-button');

  if (isMobileByAspectRatio()) {
    startButton.classList.add('hidden');
    nextButton.classList.remove('hidden');
  } else {
    startButton.classList.remove('hidden');
    nextButton.classList.add('hidden');
  }
}

function nextLorePage() {
  const currentPage = document.querySelector(`.lore-page[data-page="${currentLorePage}"]`);
  const nextPage = document.querySelector(`.lore-page[data-page="${currentLorePage + 1}"]`);
  const startButton = document.querySelector('.lore-navigation .start-button');
  const nextButton = document.querySelector('.lore-navigation .next-button');

  if (currentPage) {
    fadeOut(currentPage, () => {
      currentPage.classList.add('hidden');
      if (nextPage) {
        nextPage.classList.remove('hidden');
        fadeIn(nextPage);
      }
    });
  }

  currentLorePage++;

  if (currentLorePage === 3) {
    nextButton.classList.add('hidden');
    startButton.classList.remove('hidden');
  }
}

// 📜 Fade helper functions
function fadeOut(element, callback) {
  element.style.transition = 'opacity 0.5s';
  element.style.opacity = 0;
  setTimeout(() => {
    if (callback) callback();
  }, 500);
}

function fadeIn(element) {
  element.style.transition = 'opacity 0.5s';
  element.style.opacity = 0;
  setTimeout(() => {
    element.style.opacity = 1;
  }, 10);
}

// Responsive on rotation
window.addEventListener('resize', () => {
  if (!document.getElementById('loreScreen')?.classList.contains('hidden')) {
    const startButton = document.querySelector('.lore-navigation .start-button');
    const nextButton = document.querySelector('.lore-navigation .next-button');

    if (isMobileByAspectRatio()) {
      if (currentLorePage < 3) {
        startButton.classList.add('hidden');
        nextButton.classList.remove('hidden');
      } else {
        startButton.classList.remove('hidden');
        nextButton.classList.add('hidden');
      }
    } else {
      startButton.classList.remove('hidden');
      nextButton.classList.add('hidden');
    }
  }
});

// Expose to HTML
window.showMainMenu = showMainMenu;
window.showLoreScreen = showLoreScreen;
window.startGame = startGame;
window.restartGame = restartGame;
window.toggleSound = toggleSound;
window.nextLorePage = nextLorePage;
