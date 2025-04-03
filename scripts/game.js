// game.js

let game = null;

// Initialize the game with the selected element
async function initGame(canvas, elementType) {
  // Get the game container dimensions
  const gameContainer = canvas.parentElement;
  const containerRect = gameContainer.getBoundingClientRect();
  
  // Calculate dimensions while maintaining aspect ratio and handling mobile
  const isMobile = window.innerWidth <= 768;
  const aspectRatio = isMobile ? 9/16 : 16/9; // Portrait for mobile, landscape for desktop
  let width = containerRect.width;
  let height = containerRect.height;
  
  if (isMobile) {
    // For mobile, use full height and calculate width
    height = containerRect.height;
    width = height * aspectRatio;
    
    // Adjust character size for mobile
    this.characterWidth = 64;  // Halved from 128
    this.characterHeight = 64; // Halved from 128
  } else {
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
  }
  
  // Set canvas size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  // Set actual canvas resolution
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  game = new Game(canvas, elementType, ctx);
  await game.init();
  game.start();
}

class Game {
  spawnBean() {
    const beanImage = new Image();
    beanImage.src = "images/RedBean.png";

    const width = 64;
    const height = 64;
    const x = this.canvas.width;
    const y = this.canvas.height - height - 180 - Math.random() * 50; // adjusted for larger size

    this.beans.push({
      x,
      y,
      width,
      height,
      speed: 3 + Math.random() * 2,
      image: beanImage,
    });
  }

  constructor(canvas, elementType, ctx, soundEnabled) {
    // BEAN COUNTER
    this.beanCount = 0;
    this.beanKey = `${elementType}_beans`; // e.g. fire_beans
    this.savedBeanCount = localStorage.getItem(this.beanKey) || 0;

    // Check if mobile
    this.isMobile = window.innerWidth <= 768;

    // === CHARACTER PROPERTIES ===
    this.characterX = this.isMobile ? 50 : 150; // Move character more to the left on mobile
    this.characterY = canvas.height - (this.isMobile ? 150 : 250); // Adjust Y position for mobile
    this.characterWidth = this.isMobile ? 96 : 128; // Slightly smaller on mobile
    this.characterHeight = this.isMobile ? 96 : 128;
    this.velocityY = 0;
    this.gravity = this.isMobile ? 0.20 : 0.24;
    this.jumpForce = this.isMobile ? -10 : -12;
    this.isJumping = false;

    // ADDING BEAN
    this.beans = []; // List of red beans
    this.beanSpawnTimer = 0;
    this.beanSpawnInterval = 3000; // Adjust as needed

    // === CANVAS & CONTEXT ===
    this.canvas = canvas;
    this.ctx = ctx; // use the one we scaled

    // === GAME STATE ===
    this.isRunning = false;
    this.hasCollided = false;
    this.elementType = elementType;

    // === SCORING ===
    this.score = 0;
    this.scoreKey = `${elementType}_score`; // store by element
    this.highScore = localStorage.getItem(this.scoreKey) || 0;

    // === SPEED ===
    this.speedScale = 1; // ⬆ starting speed (try 0.5 for slower)
    this.lastSpeedTier = 1;
    this.recentlySpedUp = false;
    this.lastSpeedTier = 0;

    // === OBSTACLE ===
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnInterval = 2000; // ⬆ spawn delay in ms

    // === ANIMATION ===
    this.currentFrameIndex = 0;
    this.frameTimer = 0;
    this.frameInterval = 150; // Faster run animation (was 500)

    this.jumpFrameIndex = 0;
    this.jumpFrameTimer = 0;
    this.jumpFrameInterval = 400; // Back to slower jump animation
  }

  async init() {
    this.scoreTimer = 0;
    this.scoreInterval = 200;

    // 🟡 FIX: Define capital
    const capital =
      this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1);

    // Controls
    window.addEventListener("keydown", (e) => {
      if ((e.code === "Space" || e.code === "ArrowUp") && !this.isJumping) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpFrameIndex = 0;
        if (this.soundEnabled) this.jumpSound?.play();
      }
    });

    this.canvas.addEventListener("click", () => {
      if (!this.isJumping) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpFrameIndex = 0;
        if (this.soundEnabled) this.jumpSound?.play();
      }
    });

    // Load background and obstacle
    this.backgroundImage = new Image();
    this.backgroundImage.src = `images/BG_${capital}.png`;

    this.obstacleImage = new Image();
    this.obstacleImage.src = `images/Obstacle_${capital}.png`;

    // Load character sprites
    const sprites = await this.loadCharacterSprites(this.elementType);
    this.runFrames = sprites.runFrames;
    this.jumpFrames = sprites.jumpFrames;
    this.characterIdleImage = sprites.idle;
    this.characterJumpImage = sprites.jump;
    this.characterDefeatImage = sprites.defeat;
    console.log("Loading sprites for", capital);

    // Load sounds
    this.jumpSound = new Audio("sounds/Jump.wav");
    this.beanSound = new Audio("sounds/Bean.wav");
    this.deathSound = new Audio("sounds/Death.wav");

    document.getElementById("highScore").textContent =
      `High: ${this.highScore}`;

    console.log(`Game initialized with ${this.elementType}`);

    // 🔊 Load sound effects
    this.jumpSound = new Audio("sounds/Jump.wav");
    this.beanSound = new Audio("sounds/Bean.wav");
    this.deathSound = new Audio("sounds/Death.wav");

    // 👂 Setup toggle button
    this.soundEnabled = soundEnabled; // Use global sound setting

    document.getElementById("soundToggle").addEventListener("click", () => {
      this.soundEnabled = !this.soundEnabled;

      if (this.soundEnabled) {
        this.music.play();
        document.getElementById("soundToggle").textContent = "🔊";
      } else {
        this.music.pause();
        document.getElementById("soundToggle").textContent = "🔇";
      }
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
    this.hasCollided = true;

    if (this.soundEnabled) {
      this.deathSound?.play();
      bgMusic?.pause(); // Using the bgMusic from screens.js
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.scoreKey, this.highScore);
    }

    // Save beans
    const totalBeans = parseInt(this.savedBeanCount) + this.beanCount;
    localStorage.setItem(this.beanKey, totalBeans);

    document.getElementById("highScore").textContent =
      `High: ${this.highScore}`;
    showEndScreen(this.score);
  }

  updateScore() {
    document.getElementById("score").textContent = `Score: ${this.score}`;
  }

  spawnObstacle() {
    const obstacleImage = new Image();
    obstacleImage.src = this.obstacleImage.src;

    const width = this.isMobile ? 96 : 128;
    const height = this.isMobile ? 96 : 128;
    const x = this.canvas.width;
    const y = this.canvas.height - height - (this.isMobile ? 30 : 50);

    this.obstacles.push({
      x,
      y,
      width,
      height,
      speed: this.isMobile ? (2.0 + Math.random() * 1.2) : (4 + Math.random() * 2), // Slightly faster on mobile
      image: obstacleImage,
    });
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
    console.log("Game loop running");
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.backgroundImage.complete) {
      this.ctx.drawImage(
        this.backgroundImage,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
    }

    if (this.hasCollided && this.characterDefeatImage.complete) {
      this.ctx.drawImage(
        this.characterDefeatImage,
        this.characterX,
        this.characterY,
        this.characterWidth,
        this.characterHeight,
      );
      return;
    }

    if (!this.isRunning) return;

    // Speed Up
    const tier = Math.floor(this.score / 100);
    if (tier > this.lastSpeedTier && !this.recentlySpedUp) {
      const speedIncrease = this.isMobile ? 0.025 : 0.05;
      const maxSpeed = this.isMobile ? 1.4 : 2.0;
      this.speedScale = Math.min(this.speedScale + speedIncrease, maxSpeed);
      this.showSpeedUpMessage();
      this.recentlySpedUp = true;
      this.lastSpeedTier = tier;

      setTimeout(() => {
        this.recentlySpedUp = false;
      }, 500);
    }

    // Speed bar update
    const barWidth = ((this.speedScale - 0.9) / (2.0 - 0.9)) * 100;
    document.getElementById("speedBar").style.width = `${barWidth}%`;
    const speedBar = document.getElementById("speedBar");
    speedBar.style.backgroundColor =
      this.speedScale < 1.3
        ? "#4CAF50"
        : this.speedScale < 1.6
          ? "#FFC107"
          : "#F44336";

    // Physics
    this.velocityY += this.gravity;
    this.characterY += this.velocityY;
    const groundY = this.canvas.height - this.characterHeight - 50;
    if (this.characterY > groundY) {
      this.characterY = groundY;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // Animation
    const currentFrame = this.isJumping
      ? this.jumpFrames[this.jumpFrameIndex]
      : this.runFrames[this.currentFrameIndex];
    if (this.isJumping) {
      this.jumpFrameTimer += 16;
      if (this.jumpFrameTimer >= this.jumpFrameInterval) {
        this.jumpFrameIndex =
          (this.jumpFrameIndex + 1) % this.jumpFrames.length;
        this.jumpFrameTimer = 0;
      }
    } else {
      this.frameTimer += 16;
      if (this.frameTimer >= this.frameInterval) {
        this.currentFrameIndex =
          (this.currentFrameIndex + 1) % this.runFrames.length;
        this.frameTimer = 0;
      }
    }

    if (currentFrame?.complete) {
      this.ctx.drawImage(
        currentFrame,
        this.characterX,
        this.characterY,
        this.characterWidth,
        this.characterHeight,
      );
    }

    // Obstacles
    this.obstacleSpawnTimer += 16;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
      this.obstacleSpawnInterval = this.isMobile ? 
        (3000 + Math.random() * 2000) : // Slower spawn on mobile
        (2000 + Math.random() * 1500);
    }

    this.obstacles.forEach((obstacle, index) => {
      obstacle.x -= obstacle.speed * this.speedScale;
      if (obstacle.image.complete) {
        this.ctx.drawImage(
          obstacle.image,
          obstacle.x,
          obstacle.y,
          obstacle.width,
          obstacle.height,
        );
      }

      const playerRect = {
        x: this.characterX,
        y: this.characterY,
        width: this.characterWidth,
        height: this.characterHeight,
      };

      const obstacleRect = {
        x: obstacle.x + obstacle.width * 0.075,
        y: obstacle.y + obstacle.height * 0.075,
        width: obstacle.width * 0.85,
        height: obstacle.height * 0.85 * 0.85, // Further reduce height by 15%
      };

      if (this.checkCollision(playerRect, obstacleRect)) this.stop();
      if (obstacle.x + obstacle.width < 0) this.obstacles.splice(index, 1);
    });

    // === RED BEANS ===
    this.beanSpawnTimer += 16;
    if (this.beanSpawnTimer >= this.beanSpawnInterval) {
      this.spawnBean();
      this.beanSpawnTimer = 0;
      this.beanSpawnInterval = this.isMobile ?
        (4500 + Math.random() * 3000) : // Slower spawn on mobile
        (3000 + Math.random() * 2000);
    }

    this.beans.forEach((bean, index) => {
      bean.x -= bean.speed * this.speedScale;

      if (bean.image.complete) {
        this.ctx.drawImage(bean.image, bean.x, bean.y, bean.width, bean.height);
      }

      // Collision with character
      const playerRect = {
        x: this.characterX,
        y: this.characterY,
        width: this.characterWidth,
        height: this.characterHeight,
      };

      const beanRect = {
        x: bean.x,
        y: bean.y,
        width: bean.width,
        height: bean.height,
      };

      if (this.checkCollision(playerRect, beanRect)) {
        if (this.soundEnabled) this.beanSound?.play();
        this.score += 10;
        this.beanCount++;
        this.updateScore();
        this.beans.splice(index, 1);
      }

      // Remove if off screen
      if (bean.x + bean.width < 0) {
        this.beans.splice(index, 1);
      }
    });

    // Score
    this.scoreTimer += 16 * this.speedScale;
    if (this.scoreTimer >= this.scoreInterval) {
      this.score++;
      this.updateScore();
      this.scoreTimer = 0;
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  // Utility: show message
  showSpeedUpMessage() {
    const message = document.getElementById("speedUpMessage");
    message.style.opacity = 1;
    setTimeout(() => {
      message.style.opacity = 0;
    }, 1000);
  }

  // Preload helpers
  preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
    });
  }

  preloadImages(srcArray) {
    return Promise.all(srcArray.map((src) => this.preloadImage(src)));
  }

  async loadCharacterSprites(domain) {
    const capital = domain.charAt(0).toUpperCase() + domain.slice(1);
    const folder = "images";

    const runPaths = Array.from(
      { length: 4 },
      (_, i) => `${folder}/${capital}_Run ${i + 1}.png`,
    );
    const jumpPaths = Array.from(
      { length: 6 },
      (_, i) => `${folder}/${capital}_Jump ${i + 1}.png`,
    );

    const [runFrames, jumpFrames, idle, jump, defeat] = await Promise.all([
      this.preloadImages(runPaths),
      this.preloadImages(jumpPaths),
      this.preloadImage(`${folder}/${capital}_Character_Idle.png`),
      this.preloadImage(`${folder}/${capital}_Character_Jump.png`),
      this.preloadImage(`${folder}/${capital}_Character_Defeat.png`),
    ]);

    return { runFrames, jumpFrames, idle, jump, defeat };
  }
}
