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