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

  // Show speed-up message temporarily
  showSpeedUpMessage() {
    const message = document.getElementById("speedUpMessage");
    message.style.opacity = 1;

    setTimeout(() => {
      message.style.opacity = 0;
    }, 1000);
  }
  
  // 🔁 Preload an array of image paths and return a Promise that resolves when all are loaded
  preloadImages(srcArray) {
    const promises = srcArray.map(src => {
      return new Promise(resolve => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
      });
    });
    return Promise.all(promises);
  }

  spawnObstacle() {
    const obstacleImage = new Image();
    obstacleImage.src = `images/Obstacle_${this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1)}.png`;

    const width = 64;
    const height = 64;
    const x = this.canvas.width;
    const y = this.canvas.height - height - 50; // Same as character ground

    this.obstacles.push({
      x,
      y,
      width,
      height,
      speed: 4 + Math.random() * 2, // Speed varies from 4 to 6
      image: obstacleImage
    });
  }

  constructor(canvas, elementType) {
    this.lastSpeedTier = 1; // Used to track speed tiers hit
    this.characterX = 150;
    this.characterY = canvas.height - 150;
    this.characterWidth = 64;
    this.characterHeight = 64;

    this.velocityY = 0;
    this.gravity = 0.2; // Lower gravity = slower fall, longer airtime
    this.jumpForce = -8; // Bigger negative number = higher jump
    this.isJumping = false; 

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.isRunning = false;
    this.elementType = elementType;
    this.score = 0;
    this.scoreKey = `${elementType}_score`;
    this.highScore = localStorage.getItem(this.scoreKey) || 0;
    this.init();
  }
  
  async loadCharacterSprites(domain) {
    const capital = domain.charAt(0).toUpperCase() + domain.slice(1);
    const folder = `images/${capital} Sprites`;

    // Preload run frames
    const runPaths = Array.from({ length: 4 }, (_, i) => `${folder}/${capital}_Character_Run ${i + 1}.png`);
    const runFrames = await this.preloadImages(runPaths);

    // Preload jump frames
    const jumpPaths = Array.from({ length: 6 }, (_, i) => `${folder}/${capital}_Character_Jump ${i + 1}.png`);
    const jumpFrames = await this.preloadImages(jumpPaths);

    // Preload other states
    const idle = await this.preloadImage(`${folder}/${capital}_Character_Idle.png`);
    const jump = await this.preloadImage(`${folder}/${capital}_Character_Jump.png`);
    const defeat = await this.preloadImage(`${folder}/${capital}_Character_Defeat.png`);

    return { runFrames, jumpFrames, idle, jump, defeat };
  }
  // ✅ Load a single image
  preloadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
    });
  }

  // ✅ Load multiple images
  preloadImages(srcArray) {
    return Promise.all(srcArray.map(src => this.preloadImage(src)));
  }

  init() {
    //Initialize Score
    this.scoreTimer = 0;
    this.scoreInterval = 200; // milliseconds between score ticks (slower = harder)

    //Set Game Speed
    this.speedScale = 0.75; // Base speed multiplier
    this.speedScale = Math.min(this.speedScale, 2.0); // max 2x speed
    console.log("Speed:", this.speedScale.toFixed(2));

    // 🧱 Obstacle storage
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnInterval = 2000; // Spawn every 2 seconds

    this.currentFrameIndex = 0;
    this.frameTimer = 0;
    this.frameInterval = 500; // milliseconds between frames
    
    //Animate Jumping Frames
    this.jumpFrames = [];
    for (let i = 1; i <= 6; i++) {
      const img = new Image();
      img.src = `images/Jump ${i}.png`;
      this.jumpFrames.push(img);
    }

    this.jumpFrameIndex = 0;
    this.jumpFrameTimer = 0;
    this.jumpFrameInterval = 300; // milliseconds between jump frames

    //Add Jumping Function
    window.addEventListener("keydown", (e) => {
      if ((e.code === "Space" || e.code === "ArrowUp") && !this.isJumping) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpFrameIndex = 0; // Reset jump animation to first frame
      }
    });

    this.canvas.addEventListener("click", () => {
      if (!this.isJumping) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpFrameIndex = 0; // Reset jump animation to first frame
      }
    });
    
    this.hasCollided = false; // Track defeat state

    // Initialize game objects and variables
    console.log(`Game initialized with ${this.elementType} element`);

    // Update the high score display
    document.getElementById("highScore").textContent =
      `High: ${this.highScore}`;

    // Load the background image based on element type
    this.backgroundImage = new Image();
    this.backgroundImage.src = `images/BG_${this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1)}.png`;

    // Load obstacle image
    this.obstacleImage = new Image();
    this.obstacleImage.src = `images/Obstacle_${this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1)}.png`;

    // 🌩 Load character sprites based on selected element (domain)
    this.loadCharacterSprites(this.elementType).then(sprites => {
      this.runFrames = sprites.runFrames;
      this.jumpFrames = sprites.jumpFrames;
      this.characterIdleImage = sprites.idle;
      this.characterJumpImage = sprites.jump;
      this.characterDefeatImage = sprites.defeat;
    });
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.score = 0;
      this.updateScore();
      this.loop();
      console.log("Game started");
    }
  }

  stop() {
    this.isRunning = false;
    this.hasCollided = true; // Show defeated sprite
    console.log("Game stopped");

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.scoreKey, this.highScore);
    }
    document.getElementById("highScore").textContent =
      `High: ${this.highScore}`;

    // ✅ Show end game screen with final score
    showEndScreen(this.score);
  }

  updateScore() {
    document.getElementById("score").textContent = `Score: ${this.score}`;
  }
  // 📦 Check if character collides with a given obstacle
  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  loop() {
    // Draw defeat pose even after game stops
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.backgroundImage.complete) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw defeated sprite even if game is not running
    if (this.hasCollided && this.characterDefeatImage.complete) {
      this.ctx.drawImage(
        this.characterDefeatImage,
        this.characterX,
        this.characterY,
        this.characterWidth,
        this.characterHeight
      );
      return; // stop here
    }

    if (!this.isRunning) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    if (this.backgroundImage.complete) {
      this.ctx.drawImage(
        this.backgroundImage,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
    }
    // Gradually increase speed over time
    if (this.score % 150 === 0 && this.score !== 0 && !this.recentlySpedUp) {
      this.speedScale = Math.min(this.speedScale + 0.05, 2.0);
      this.showSpeedUpMessage();
      this.recentlySpedUp = true;

      // Prevent multiple speed-ups on the same frame
      setTimeout(() => {
        this.recentlySpedUp = false;
      }, 500);
    }
    
    // Cap speed
    this.speedScale = Math.min(this.speedScale, 2.0);
    
    // 🟩 Update speed bar (map speedScale 1.0–2.0 → 0%–100%)
    const barWidth = ((this.speedScale - 1) / 1) * 100;
    document.getElementById("speedBar").style.width = `${barWidth}%`;

    // Show "Speed Up!" at new tier (every 0.2 increase)
    const tier = Math.floor(this.speedScale * 10) / 2; // e.g. 1.2, 1.4...
    if (tier > this.lastSpeedTier) {
      this.lastSpeedTier = tier;
      this.showSpeedUpMessage();
    }
    
    // Change colour of speed bar
    const speedBar = document.getElementById("speedBar");

    if (this.speedScale < 1.3) {
      speedBar.style.backgroundColor = "#4CAF50"; // green
    } else if (this.speedScale < 1.6) {
      speedBar.style.backgroundColor = "#FFC107"; // amber
    } else {
      speedBar.style.backgroundColor = "#F44336"; // red
    }
    // ==== CHARACTER PHYSICS (JUMP + GRAVITY) ====
    this.velocityY += this.gravity;
    this.characterY += this.velocityY;

    // Prevent character from falling below ground
    const groundY = this.canvas.height - this.characterHeight - 50;
    if (this.characterY > groundY) {
      this.characterY = groundY;
      this.velocityY = 0;
      this.isJumping = false;
    }
    // === CHARACTER ANIMATION ===
    if (this.isJumping) {
      // 🦘 JUMPING ANIMATION
      this.jumpFrameTimer += 16;
      if (this.jumpFrameTimer >= this.jumpFrameInterval) {
        this.jumpFrameIndex = (this.jumpFrameIndex + 1) % this.jumpFrames.length;
        this.jumpFrameTimer = 0;
      }

      const currentJumpFrame = this.jumpFrames[this.jumpFrameIndex];
      if (currentJumpFrame.complete) {
        this.ctx.drawImage(
          currentJumpFrame,
          this.characterX,
          this.characterY,
          this.characterWidth,
          this.characterHeight
        );
      }
    } else {
      // 🏃 RUNNING ANIMATION
      this.frameTimer += 16;
      if (this.frameTimer >= this.frameInterval) {
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.runFrames.length;
        this.frameTimer = 0;
      }

      const currentRunFrame = this.runFrames[this.currentFrameIndex];
      if (currentRunFrame.complete) {
        this.ctx.drawImage(
          currentRunFrame,
          this.characterX,
          this.characterY,
          this.characterWidth,
          this.characterHeight
        );
      } else {
        // 🔴 Fallback red box
        this.ctx.fillStyle = "#FF0000";
        this.ctx.fillRect(
          this.characterX,
          this.characterY,
          this.characterWidth,
          this.characterHeight
        );
      }
    }

    
    // === OBSTACLE SPAWNING & MOVEMENT ===
    this.obstacleSpawnTimer += 16; // approx frame duration

    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.spawnObstacle(); // spawn a new one
      this.obstacleSpawnTimer = 0;

      // 🎲 Set a new randomized spawn interval (1.5s to 3s)
      this.obstacleSpawnInterval = 2000 + Math.random() * 1500;
    }

    this.obstacles.forEach((obstacle, index) => {
      obstacle.x -= obstacle.speed * this.speedScale;

      // Draw the obstacle
      if (obstacle.image.complete) {
        this.ctx.drawImage(
          obstacle.image,
          obstacle.x,
          obstacle.y,
          obstacle.width,
          obstacle.height
        );
      }

      // ==== COLLISION DETECTION ====
      const playerRect = {
        x: this.characterX,
        y: this.characterY,
        width: this.characterWidth,
        height: this.characterHeight,
      };

      const obstacleRect = {
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
      };

      if (this.checkCollision(playerRect, obstacleRect)) {
        this.stop(); // 💥 Game Over
      }

      // Remove if off-screen
      if (obstacle.x + obstacle.width < 0) {
        this.obstacles.splice(index, 1);
      }
    });

    // ==== SCORE UPDATE ====
    this.scoreTimer += 16 * this.speedScale;
    
    if (this.scoreTimer >= this.scoreInterval) {
      this.score++;
      this.updateScore();
      this.scoreTimer = 0;
    }
    
    // Request next frame
    requestAnimationFrame(this.loop.bind(this));
  }
}