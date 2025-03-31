// Main game logic
let game = null;

// Initialize the game with the selected element
function initGame(canvas, elementType) {
  game = new Game(canvas, elementType);
}

// Game class
class Game {
  constructor(canvas, elementType) {
    // 🧠 State tracking
    this.lastSpeedTier = 1;
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

    this.loadCharacterSprites(this.elementType).then(sprites => {
      this.runFrames = sprites.runFrames;
      this.jumpFrames = sprites.jumpFrames;
      this.characterIdleImage = sprites.idle;
      this.characterJumpImage = sprites.jump;
      this.characterDefeatImage = sprites.defeat;
      this.init();
      this.start();
    });
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

  // 🌩 Load character sprites based on selected element (domain)
  async loadCharacterSprites(domain) {
    const capital = domain.charAt(0).toUpperCase() + domain.slice(1);
    const folder = `images/${capital} Sprites`;

    const runPaths = Array.from({ length: 4 }, (_, i) => `${folder}/${capital}_Character_Run ${i + 1}.png`);
    const jumpPaths = Array.from({ length: 6 }, (_, i) => `${folder}/${capital}_Character_Jump ${i + 1}.png`);

    const [runFrames, jumpFrames, idle, jump, defeat] = await Promise.all([
      this.preloadImages(runPaths),
      this.preloadImages(jumpPaths),
      this.preloadImage(`${folder}/${capital}_Character_Idle.png`),
      this.preloadImage(`${folder}/${capital}_Character_Jump.png`),
      this.preloadImage(`${folder}/${capital}_Character_Defeat.png`)
    ]);

    return { runFrames, jumpFrames, idle, jump, defeat };
  }

  // Show speed-up message temporarily
  showSpeedUpMessage() {
    const message = document.getElementById("speedUpMessage");
    message.style.opacity = 1;
    setTimeout(() => {
      message.style.opacity = 0;
    }, 1000);
  }

  spawnObstacle() {
    const obstacleImage = new Image();
    obstacleImage.src = `images/Obstacle_${this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1)}.png`;

    const width = 64;
    const height = 64;
    const x = this.canvas.width;
    const y = this.canvas.height - height - 50;

    this.obstacles.push({ x, y, width, height, speed: 4 + Math.random() * 2, image: obstacleImage });
  }

  init() {
    this.scoreTimer = 0;
    this.scoreInterval = 200;
    this.speedScale = 0.75;
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnInterval = 2000;
    this.currentFrameIndex = 0;
    this.frameTimer = 0;
    this.frameInterval = 500;
    this.jumpFrameIndex = 0;
    this.jumpFrameTimer = 0;
    this.jumpFrameInterval = 300;
    this.hasCollided = false;

    window.addEventListener("keydown", (e) => {
      if ((e.code === "Space" || e.code === "ArrowUp") && !this.isJumping) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpFrameIndex = 0;
      }
    });

    this.canvas.addEventListener("click", () => {
      if (!this.isJumping) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpFrameIndex = 0;
      }
    });

    document.getElementById("highScore").textContent = `High: ${this.highScore}`;

    this.backgroundImage = new Image();
    this.backgroundImage.src = `images/BG_${this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1)}.png`;
    this.obstacleImage = new Image();
    this.obstacleImage.src = `images/Obstacle_${this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1)}.png`;
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.score = 0;
      this.updateScore();
      this.loop();
    }
  }

  stop() {
    this.isRunning = false;
    this.hasCollided = true;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.scoreKey, this.highScore);
    }
    document.getElementById("highScore").textContent = `High: ${this.highScore}`;
    showEndScreen(this.score);
  }

  updateScore() {
    document.getElementById("score").textContent = `Score: ${this.score}`;
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.backgroundImage.complete) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.hasCollided && this.characterDefeatImage.complete) {
      this.ctx.drawImage(this.characterDefeatImage, this.characterX, this.characterY, this.characterWidth, this.characterHeight);
      return;
    }

    if (!this.isRunning) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.backgroundImage.complete) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    // ⚙ Speed up logic
    if (this.score % 150 === 0 && this.score !== 0 && !this.recentlySpedUp) {
      this.speedScale = Math.min(this.speedScale + 0.05, 2.0);
      this.showSpeedUpMessage();
      this.recentlySpedUp = true;
      setTimeout(() => this.recentlySpedUp = false, 500);
    }

    // 🔵 Speed Bar UI
    const barWidth = ((this.speedScale - 1) / 1) * 100;
    document.getElementById("speedBar").style.width = `${barWidth}%`;

    const tier = Math.floor(this.speedScale * 10) / 2;
    if (tier > this.lastSpeedTier) {
      this.lastSpeedTier = tier;
      this.showSpeedUpMessage();
    }

    const speedBar = document.getElementById("speedBar");
    speedBar.style.backgroundColor = this.speedScale < 1.3 ? "#4CAF50" : this.speedScale < 1.6 ? "#FFC107" : "#F44336";

    // 🕹 Character Physics
    this.velocityY += this.gravity;
    this.characterY += this.velocityY;
    const groundY = this.canvas.height - this.characterHeight - 50;
    if (this.characterY > groundY) {
      this.characterY = groundY;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // 🎞 Animation
    if (this.isJumping) {
      this.jumpFrameTimer += 16;
      if (this.jumpFrameTimer >= this.jumpFrameInterval) {
        this.jumpFrameIndex = (this.jumpFrameIndex + 1) % this.jumpFrames.length;
        this.jumpFrameTimer = 0;
      }
      const currentJumpFrame = this.jumpFrames[this.jumpFrameIndex];
      if (currentJumpFrame.complete) {
        this.ctx.drawImage(currentJumpFrame, this.characterX, this.characterY, this.characterWidth, this.characterHeight);
      }
    } else {
      this.frameTimer += 16;
      if (this.frameTimer >= this.frameInterval) {
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.runFrames.length;
        this.frameTimer = 0;
      }
      const currentRunFrame = this.runFrames[this.currentFrameIndex];
      if (currentRunFrame.complete) {
        this.ctx.drawImage(currentRunFrame, this.characterX, this.characterY, this.characterWidth, this.characterHeight);
      }
    }

    // 🚧 Obstacles
    this.obstacleSpawnTimer += 16;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
      this.obstacleSpawnInterval = 2000 + Math.random() * 1500;
    }

    this.obstacles.forEach((obstacle, index) => {
      obstacle.x -= obstacle.speed * this.speedScale;
      if (obstacle.image.complete) {
        this.ctx.drawImage(obstacle.image, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }

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
        this.stop();
      }

      if (obstacle.x + obstacle.width < 0) {
        this.obstacles.splice(index, 1);
      }
    });

    // 🧮 Score
    this.scoreTimer += 16 * this.speedScale;
    if (this.scoreTimer >= this.scoreInterval) {
      this.score++;
      this.updateScore();
      this.scoreTimer = 0;
    }

    requestAnimationFrame(this.loop.bind(this));
  }
}
