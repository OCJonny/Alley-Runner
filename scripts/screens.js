// screens.js

// 🔊 Global Music (shared across screens)
let bgMusic = new Audio("sounds/Game Music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

window.soundEnabled = true;
let resizeListenerAdded = false;

// 🔁 Auto-play music on load
document.addEventListener("DOMContentLoaded", () => {
  bgMusic.play().catch((error) => {
    console.log("Audio playback failed:", error);
  });
  document.getElementById("soundToggle").textContent = "🔊";
});

// 🎚 Toggle sound
function toggleSound() {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    bgMusic.play();
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
  if (soundEnabled) bgMusic.play();
}

// 🧭 Main menu
function showMainMenu() {
  showScreen("mainMenu");
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

  if (soundEnabled) bgMusic.play();
  showMainMenu();

  if (canvas) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  document.getElementById("soundToggle").textContent = soundEnabled
    ? "🔊"
    : "🔇";
}
