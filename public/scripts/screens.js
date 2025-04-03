// screens.js

// 🌐 API base URL (use current host for both local and deployed environments)
const API_BASE_URL = window.location.origin;

// 🔊 Global Music (shared across screens)
let bgMusic = new Audio("sounds/Game_Music.wav");
bgMusic.loop = true;
bgMusic.volume = 0.5;

window.soundEnabled = true;
let resizeListenerAdded = false;

// 🔁 Set sound toggle icon on load
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("soundToggle").textContent = "🔊";
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
      .catch(err => console.warn("Music play blocked:", err));
    document.getElementById("soundToggle").textContent = "🔊";
  } else {
    bgMusic.pause();
    document.getElementById("soundToggle").textContent = "🔇";
  }

  if (game) {
    game.soundEnabled = soundEnabled;
  }
}

// 🖥 Screen utilities
function showScreen(screenId) {
  document
    .querySelectorAll(".screen")
    .forEach((screen) => screen.classList.add("hidden"));

  const screenToShow = document.getElementById(screenId);
  if (screenToShow) {
    screenToShow.classList.remove("hidden");
  }
}

// ⏮ Title screen
function showTitleScreen() {
  showScreen("titleScreen");

  if (soundEnabled && bgMusic.paused) {
    bgMusic.volume = 0;
    bgMusic.play()
      .then(() => fadeInMusic(bgMusic))
      .catch(err => console.warn("Music play blocked:", err));
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
      .catch(err => console.warn("Music play blocked:", err));
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
      .catch(err => console.warn("Music play blocked:", err));
  }

  showMainMenu();

  if (canvas) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  document.getElementById("soundToggle").textContent = soundEnabled
    ? "🔊"
    : "🔇";
}

// Domain stats display update
// Use the current host for API calls (works with both local and deployed environments)
const API_BASE_URL = window.location.origin;

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
      label.innerHTML = `Score: ${score}<br>Beans: ${beans}`;
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
          label.innerHTML = `Score: ${item.total_score}<br>Beans: ${item.total_beans}`;
          
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
        .catch(err => console.warn("Resume blocked:", err));
    }
  }
});
