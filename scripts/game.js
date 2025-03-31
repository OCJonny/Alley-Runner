// Main game logic
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isRunning = false;
    this.init();
  }

  init() {
    // Initialize game objects and variables
    console.log('Game initialized');
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.loop();
      console.log('Game started');
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Game stopped');
  }

  loop() {
    // Main game loop
    if (!this.isRunning) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw a simple placeholder
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(
      this.canvas.width / 2 - 50,
      this.canvas.height / 2 - 50,
      100,
      100
    );

    // Request next frame
    requestAnimationFrame(this.loop.bind(this));
  }
}

// Export the Game class
export default Game;