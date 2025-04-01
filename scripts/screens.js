// Global Music (shared across screens)
let bgMusic = new Audio("sounds/Game Music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

let soundEnabled = true; // shared flag

// Screen management functions

// Show a specific screen and hide others
function showScreen(screenId) {
  // Hide all screens
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.classList.add('hidden');
  });
  
  // Show the requested screen
  const screenToShow = document.getElementById(screenId);
  if (screenToShow) {
    screenToShow.classList.remove('hidden');
  }
}

// Show the main menu
function showMainMenu() {
  showScreen('mainMenu');
}

// Show the game screen
function showGameScreen() {
  showScreen('gameScreen');
}

// Show the title screen
function showTitleScreen() {
  showScreen('titleScreen');
  if (soundEnabled) {
    bgMusic.load(); // Ensure music is loaded
    bgMusic.play().catch(error => {
      console.log("Audio playback failed:", error);
    });
  }
}


// Show the end game screen
function showEndScreen(score) {
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("endGameScreen").classList.remove("hidden");

  document.getElementById("finalScore").textContent = `Your Score: ${score}`;
  const highScore = localStorage.getItem(game?.scoreKey) || 0;
  document.getElementById("finalHighScore").textContent = `High Score: ${highScore}`;
  const beanCount = localStorage.getItem(game?.beanKey) || 0;
  document.getElementById("beanCountDisplay").textContent = `Beans Collected: ${beanCount}`;
 
  if (soundEnabled) bgMusic.pause();

  // 👇 Set the defeat sprite based on the current game instance
  const defeatSprite = document.getElementById("defeatSprite");
  if (defeatSprite && game?.characterDefeatImage?.src) {
    defeatSprite.src = game.characterDefeatImage.src;
  }
}

// Game start function that takes the element type
function startGame(elementType) {
  console.log(`Starting game with ${elementType} element`);
  
  // Show the game screen
  showGameScreen();
  
  // Initialize the game with the chosen element
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    // Start the game with the selected element type
    initGame(canvas, elementType);
  } else {
    console.error('Game canvas not found');
  }
}
// ✅ Restart game from end screen
function restartGame() {
  if (soundEnabled) bgMusic.play();
  document.getElementById("endGameScreen").classList.add("hidden");
  document.getElementById("mainMenu").classList.remove("hidden");
}