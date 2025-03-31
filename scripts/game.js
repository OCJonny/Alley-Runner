// Main game logic
let game = null;

// Initialize the game with the selected element
function initGame(canvas, elementType) {
  // Create a new game instance
  game = new Game(canvas, elementType);
  game.start();
}

// Game class
class Game {
  constructor(canvas, elementType) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isRunning = false;
    this.elementType = elementType;
    this.score = 0;
    this.highScore = localStorage.getItem('highScore') || 0;
    this.init();
  }

  init() {
    // Initialize game objects and variables
    console.log(`Game initialized with ${this.elementType} element`);
    
    // Update the high score display
    document.getElementById('highScore').textContent = `High: ${this.highScore}`;
    
    // Load the background image based on element type
    this.backgroundImage = new Image();
    this.backgroundImage.src = `images/BG_${this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1)}.png`;
    
    // Load obstacle image
    this.obstacleImage = new Image();
    this.obstacleImage.src = `images/Obstacle_${this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1)}.png`;
    
    // Load character images
    this.characterIdleImage = new Image();
    this.characterIdleImage.src = 'images/Character_Idle.png';
    
    this.characterRunImage = new Image();
    this.characterRunImage.src = 'images/Character_Run.png';
    
    this.characterJumpImage = new Image();
    this.characterJumpImage.src = 'images/Character_Jump.png';
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.score = 0;
      this.updateScore();
      this.loop();
      console.log('Game started');
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Game stopped');
    
    // Check if we have a new high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('highScore', this.highScore);
      document.getElementById('highScore').textContent = `High: ${this.highScore}`;
    }
  }

  updateScore() {
    document.getElementById('score').textContent = `Score: ${this.score}`;
  }

  loop() {
    // Main game loop
    if (!this.isRunning) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    if (this.backgroundImage.complete) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw a character placeholder (using the idle image for now)
    if (this.characterIdleImage.complete) {
      this.ctx.drawImage(
        this.characterIdleImage,
        this.canvas.width / 2 - 25,
        this.canvas.height / 2 - 25,
        50,
        50
      );
    } else {
      // Fallback if image isn't loaded
      this.ctx.fillStyle = '#FF0000';
      this.ctx.fillRect(
        this.canvas.width / 2 - 25,
        this.canvas.height / 2 - 25,
        50,
        50
      );
    }

    // Request next frame
    requestAnimationFrame(this.loop.bind(this));
  }
}