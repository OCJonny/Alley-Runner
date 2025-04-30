// game.js

let game = null;

// Initialize the game with the selected element
async function initGame(canvas, elementType) {
  if (!canvas || !elementType) {
    console.error("Missing required parameters:", { canvas, elementType });
    return;
  }

  const gameContainer = canvas.parentElement;
  const containerRect = gameContainer.getBoundingClientRect();

  const isMobile = window.innerWidth <= 768;
  const aspectRatio = isMobile ? 9 / 16 : 16 / 9;
  const mobileScaleFactor = 0.8; // Scale factor for mobile elements
  let width = containerRect.width;
  let height = containerRect.height;

  if (isMobile) {
    height = containerRect.height * 0.85; // Use 85% of container height
    width = window.innerWidth; // Use the actual screen width
  } else {
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
  }

  // Ensure the canvas fits within the viewport
  const maxHeight = window.innerHeight * 0.9;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  game = new Game(canvas, elementType, ctx);
  await game.init();
  game.start();
}

class Game {
  constructor(canvas, elementType, ctx) {
    this.soundEnabled =
      window.soundEnabled !== undefined ? window.soundEnabled : true;

    this.beanCount = 0;
    this.beanKey = `${elementType}_beans`;
    this.savedBeanCount = localStorage.getItem(this.beanKey) || 0;

    this.isMobile = window.innerWidth <= 768;

    this.characterX = this.isMobile ? 50 : 150;
    const groundOffset = this.isMobile ? canvas.height * 0.2 : canvas.height * 0.25;
    this.characterY = canvas.height - groundOffset;
    const mobileScaleFactor = 0.8;
    this.characterWidth = this.isMobile ? 154 * mobileScaleFactor : 205;
    this.characterHeight = this.isMobile ? 154 * mobileScaleFactor : 205;
    this.velocityY = 0;
    this.gravity = this.isMobile ? 0.269 : 0.317;  // Mobile gravity reduced by 15%
    this.jumpForce = this.isMobile ? -11.88 : -14.04;  // Reduced by 10%
    this.isJumping = false;

    this.beans = [];
    this.beanSpawnTimer = 0;
    this.beanSpawnInterval = 3000;

    this.canvas = canvas;
    this.ctx = ctx;

    this.isRunning = false;
    this.hasCollided = false;
    this.lives = 3; // Start with 3 lives
    this.elementType = elementType;

    this.score = 0;
    this.scoreKey = `${elementType}_score`;
    this.highScore = localStorage.getItem(this.scoreKey) || 0;

    this.speedScale = this.isMobile ? 2.07 : 2.0;  // Mobile starts 15% faster
    this.lastSpeedTier = 0;
    this.recentlySpedUp = false;

    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnInterval = 2000;

    this.currentFrameIndex = 0;
    this.frameTimer = 0;
    this.frameInterval = 150;

    this.jumpFrameIndex = 0;
    this.jumpFrameTimer = 0;
    this.jumpFrameInterval = 400;

    // Flashing effect variables for hit feedback
    this.isFlashing = false;
    this.flashTimer = 0;
    this.flashDuration = 1000; // 1 second of flashing/invulnerability

    // Background scrolling
    this.bgScrollX = 0; // for horizontal scroll

    // Bean tracking for green life-refill beans
    this.totalBeansSpawned = 0;

    this.updateScore(); // Initialize the HUD
  }

  async init() {
    this.scoreTimer = 0;
    this.scoreInterval = 200;

    const capital =
      this.elementType.charAt(0).toUpperCase() + this.elementType.slice(1);

    window.addEventListener("keydown", (e) => {
      if ((e.code === "Space" || e.code === "ArrowUp") && !this.isJumping) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpFrameIndex = 0;
        if (this.soundEnabled) this.jumpSound?.play().catch(() => {});
      }
    });

    this.canvas.addEventListener("click", () => {
      if (!this.isJumping) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpFrameIndex = 0;
        if (this.soundEnabled) this.jumpSound?.play().catch(() => {});
      }
    });

    this.backgroundImage = await this.preloadImage(`images/BG_${capital}.png`);
    this.obstacleImage = await this.preloadImage(
      `images/Obstacle_${capital}.png`,
    );

    const sprites = await this.loadCharacterSprites(this.elementType);
    if (!sprites || !sprites.runFrames.length) {
      console.error("Failed to load character sprites", sprites);
    }
    this.runFrames = sprites.runFrames;
    this.jumpFrames = sprites.jumpFrames;
    this.characterIdleImage = sprites.idle;
    this.characterJumpImage = sprites.jump;
    this.characterDefeatImage = sprites.defeat;

    // Create separate audio context for sound effects to prevent affecting background music
    this.jumpSound = new Audio("sounds/Jump.wav");
    this.jumpSound.mozAudioChannelType = 'normal';  // Firefox
    this.jumpSound.webkitMediaClass = 'ambient';    // Webkit

    this.beanSound = new Audio("sounds/Bean.wav");
    this.beanSound.mozAudioChannelType = 'normal';
    this.beanSound.webkitMediaClass = 'ambient';

    this.deathSound = new Audio("sounds/Death.wav");
    this.deathSound.mozAudioChannelType = 'normal';
    this.deathSound.webkitMediaClass = 'ambient';

    this.healthSound = new Audio("sounds/Health_Up.wav");
    this.healthSound.mozAudioChannelType = 'normal';
    this.healthSound.webkitMediaClass = 'ambient';

    document.getElementById("highScore").textContent =
      `High: ${this.highScore}`;
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.score = 0;
      this.updateScore();
      this.updateLivesDisplay();
      this.lastTime = null;
      // Bind loop to preserve this context
      this.boundLoop = (timestamp) => this.loop(timestamp);
      requestAnimationFrame(this.boundLoop);
      console.log("Animation loop started");
    }
  }

  stop() {
    this.isRunning = false;
    this.hasCollided = true;
    
    // Clear all game timers and intervals
    if (this.boundLoop) {
      cancelAnimationFrame(this.boundLoop);
      this.boundLoop = null;
    }
    
    // Reset all game state to prevent background updates
    this.obstacles = [];
    this.beans = [];
    this.beanSpawnTimer = 0;
    this.obstacleSpawnTimer = 0;

    if (this.soundEnabled) {
      this.deathSound?.play().catch(() => {});
      if (window.bgMusic) window.bgMusic.pause();
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.scoreKey, this.highScore);
    }

    const totalBeans = parseInt(this.savedBeanCount) + this.beanCount;
    localStorage.setItem(this.beanKey, totalBeans);

    // Update cumulative domain score
    const domainScoreKey = `${this.elementType}_cumulative_score`;
    const prevScore = parseInt(localStorage.getItem(domainScoreKey)) || 0;
    localStorage.setItem(domainScoreKey, prevScore + this.score);

    document.getElementById("highScore").textContent =
      `High: ${this.highScore}`;
    // 🌐 Send score and beans to server
    fetch(`${API_BASE_URL}/api/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: this.elementType,
        score: this.score,
        beans: this.beanCount,
      }),
    })
      .then((res) => res.json())
      .then((data) => console.log("Leaderboard updated:", data))
      .catch((err) => console.error("Failed to update leaderboard:", err));

    showEndScreen(this.score);
  }

  updateScore() {
    document.getElementById("score").textContent = `Score: ${this.score}`;
    document.getElementById("highScore").textContent = `High Score: ${this.highScore}`;
    document.getElementById("beansCollected").textContent = `Beans Collected: ${this.beanCount}`;
  }

  updateLivesDisplay() {
    const container = document.getElementById("livesContainer");
    container.innerHTML = ""; // Clear existing

    for (let i = 0; i < this.lives; i++) {
      const img = document.createElement("img");
      img.src = "images/GreenBean.png";
      img.classList.add("life-icon");
      container.appendChild(img);
    }
  }

  spawnBean() {
    this.totalBeansSpawned++;

    // Every 6th bean is green (gives extra life)
    const isGreen = this.totalBeansSpawned % 6 === 0;
    const beanImage = new Image();
    beanImage.src = isGreen ? "images/GreenBean.png" : "images/RedBean.png";

    const width = 64;
    const height = 64;
    const x = this.canvas.width;
    const y = this.canvas.height - height - 275 - Math.random() * 50;

    const bean = {
      x,
      y,
      width,
      height,
      speed: this.isMobile ? 2.0 : 4.0,
      image: beanImage,
      isGreen,
    };

    this.beans.push(bean);
  }

  spawnObstacle() {
    const obstacleImage = new Image();
    obstacleImage.src = this.obstacleImage.src;

    const mobileScaleFactor = 0.8;
    const width = this.isMobile ? 154 * mobileScaleFactor : 205;
    const height = this.isMobile ? 154 * mobileScaleFactor : 205;
    const x = this.canvas.width + (this.isMobile ? this.canvas.width * 0.2 : 0);
    const y = this.canvas.height - height - (this.isMobile ? 30 : 50);

    this.obstacles.push({
      x,
      y,
      width,
      height,
      speed: this.isMobile ? 2.0 : 4.0,
      image: obstacleImage,
    });
  }

  checkCollision(r1, r2) {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  }

  async loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const delta = Math.min((timestamp - this.lastTime) / 16.67, 2);
    this.lastTime = timestamp;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // === Background Scrolling ===
    const bgRatio = this.backgroundImage.width / this.backgroundImage.height;
    const bgWidth = this.canvas.height * bgRatio;
    const baseSpeed = this.isMobile ? 2.0 : 4.0;
    const gameSpeed = baseSpeed * this.speedScale * delta;

    this.bgScrollX -= gameSpeed;

    if (this.bgScrollX <= -bgWidth) {
      this.bgScrollX = 0;
    }

    // Draw two images side by side to loop seamlessly
    this.ctx.drawImage(
      this.backgroundImage,
      this.bgScrollX,
      0,
      bgWidth,
      this.canvas.height,
    );
    this.ctx.drawImage(
      this.backgroundImage,
      this.bgScrollX + bgWidth,
      0,
      bgWidth,
      this.canvas.height,
    );

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

    const tier = Math.floor(this.score / 100);
    if (tier > this.lastSpeedTier && !this.recentlySpedUp) {
      const inc = this.isMobile ? 0.092 : 0.092;  // Made mobile increment same as desktop
      const tierMaxSpeed = this.isMobile ? 6.0 : 7.0;  // Increased mobile max speed
      const newSpeed = Math.min(this.speedScale + inc, tierMaxSpeed);
      // Only show speed up message if we haven't reached max speed
      if (newSpeed < tierMaxSpeed) {
        this.showSpeedUpMessage();
      }
      this.speedScale = newSpeed;
      this.recentlySpedUp = true;
      this.lastSpeedTier = tier;
      setTimeout(() => (this.recentlySpedUp = false), 500);
    }

    const maxSpeed = this.isMobile ? 5.0 : 7.0;  // Doubled from 2.5/3.5
    const initialSpeed = this.isMobile ? 2.07 : 2.0;
    document.getElementById("speedBar").style.width =
      `${((this.speedScale - initialSpeed) / (maxSpeed - initialSpeed)) * 100}%`;

    // Gradient from green to red based on speed
    const red = Math.min(255, Math.floor((this.speedScale - 1) * 255));
    const green = Math.max(0, 255 - Math.floor((this.speedScale - 1) * 255));
    document.getElementById("speedBar").style.backgroundColor =
      `rgb(${red}, ${green}, 50)`;

    this.velocityY += this.gravity * delta;
    this.characterY += this.velocityY * delta;
    const groundY = this.canvas.height - this.characterHeight - 50;
    if (this.characterY > groundY) {
      this.characterY = groundY;
      this.velocityY = 0;
      this.isJumping = false;
    }

    const currentFrame = this.isJumping
      ? this.jumpFrames[this.jumpFrameIndex]
      : this.runFrames[this.currentFrameIndex];
    if (this.isJumping) {
      this.jumpFrameTimer += 16 * delta;
      if (this.jumpFrameTimer >= this.jumpFrameInterval) {
        this.jumpFrameIndex =
          (this.jumpFrameIndex + 1) % this.jumpFrames.length;
        this.jumpFrameTimer = 0;
      }
    } else {
      this.frameTimer += 16 * delta;
      if (this.frameTimer >= this.frameInterval) {
        this.currentFrameIndex =
          (this.currentFrameIndex + 1) % this.runFrames.length;
        this.frameTimer = 0;
      }
    }

    if (!currentFrame) {
      console.error("Current frame is null or undefined");
      return;
    }
    if (!currentFrame.complete) {
      console.error("Current frame not completely loaded");
      return;
    }

    // Handle flashing effect when player is hit
    if (this.isFlashing) {
      // Update flash timer
      this.flashTimer -= 16 * delta;

      // Toggle visibility for flashing effect (visible every other 100ms)
      const shouldDraw = Math.floor(this.flashTimer / 100) % 2 === 0;

      // End flashing state when timer runs out
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
      }

      // Only draw character on certain frames for blinking effect
      if (shouldDraw) {
        this.ctx.drawImage(
          currentFrame,
          this.characterX,
          this.characterY,
          this.characterWidth,
          this.characterHeight,
        );
      }
    } else {
      // Normal character drawing when not flashing
      this.ctx.drawImage(
        currentFrame,
        this.characterX,
        this.characterY,
        this.characterWidth,
        this.characterHeight,
      );
    }

    this.obstacleSpawnTimer += 16 * delta;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
      this.obstacleSpawnInterval = this.isMobile
        ? 3000 + Math.random() * 2000
        : 1800 + Math.random() * 1200;
    }

    this.obstacles.forEach((ob, i) => {
      ob.x -= ob.speed * this.speedScale * delta;
      if (ob.image.complete) {
        this.ctx.drawImage(ob.image, ob.x, ob.y, ob.width, ob.height);
      }

      // Shrink and center obstacle hitboxes
      const shrinkFactor = 0.45; // Reduced by 25% from original 0.6

      const obstacleRect = {
        x: ob.x + (ob.width * (1 - shrinkFactor)) / 2,
        y: ob.y + (ob.height * (1 - shrinkFactor)) / 2,
        width: ob.width * shrinkFactor,
        height: ob.height * shrinkFactor,
      };

      // Debug: Draw hitbox rectangle (uncomment to visualize hitboxes)
      /*
      this.ctx.strokeStyle = 'lime';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        obstacleRect.x,
        obstacleRect.y,
        obstacleRect.width,
        obstacleRect.height
      );
      */

      if (
        this.checkCollision(
          {
            x: this.characterX,
            y: this.characterY,
            width: this.characterWidth,
            height: this.characterHeight,
          },
          obstacleRect,
        ) &&
        !this.isFlashing // Only take damage if not in flashing/invulnerable state
      ) {
        this.lives--;
        this.updateLivesDisplay();

        if (this.soundEnabled) this.deathSound?.play().catch(() => {});

        this.obstacles.splice(i, 1); // Remove obstacle so player doesn't get hit again instantly

        if (this.lives <= 0) {
          this.stop();
        } else {
          // Start flashing effect for temporary invulnerability
          this.isFlashing = true;
          this.flashTimer = this.flashDuration;
        }
      }
      if (ob.x + ob.width < 0) this.obstacles.splice(i, 1);
    });

    this.beanSpawnTimer += 16 * delta;
    if (this.beanSpawnTimer >= this.beanSpawnInterval) {
      this.spawnBean();
      this.beanSpawnTimer = 0;
      this.beanSpawnInterval = this.isMobile
        ? 4500 + Math.random() * 3000
        : 3000 + Math.random() * 2000;
    }

    this.beans.forEach((bean, index) => {
      bean.x -= bean.speed * this.speedScale * delta;
      if (bean.image.complete) {
        this.ctx.drawImage(bean.image, bean.x, bean.y, bean.width, bean.height);
      }
      if (
        this.checkCollision(
          {
            x: this.characterX,
            y: this.characterY,
            width: this.characterWidth,
            height: this.characterHeight,
          },
          { x: bean.x, y: bean.y, width: bean.width, height: bean.height },
        )
      ) {
        if (bean.isGreen) {
          // Green bean collected!
          if (this.lives < 3) {
            this.lives++;
            this.updateLivesDisplay(); // Update the lives display with new bean
            this.showHealthUpMessage(); // Show the +1 health message
            if (this.soundEnabled) this.healthSound?.play().catch(() => {}); // Play the health up sound
          } else {
            // Still play normal bean sound if already at max health
            if (this.soundEnabled) this.beanSound?.play().catch(() => {});
          }
        } else {
          // Regular bean sound for red beans
          if (this.soundEnabled) this.beanSound?.play().catch(() => {});
        }

        this.score += 10;
        this.beanCount++;
        this.updateScore();
        this.beans.splice(index, 1);
      }
      if (bean.x + bean.width < 0) this.beans.splice(index, 1);
    });

    this.scoreTimer += 16 * this.speedScale * delta;
    if (this.scoreTimer >= this.scoreInterval) {
      this.score++;
      this.updateScore();
      this.scoreTimer = 0;
    }

    if (this.isRunning) {
      requestAnimationFrame(this.boundLoop);
    }
  }

  showSpeedUpMessage() {
    const msg = document.getElementById("speedUpMessage");
    msg.style.opacity = 1;
    setTimeout(() => (msg.style.opacity = 0), 1000);
  }

  showHealthUpMessage() {
    const message = document.getElementById("healthUpMessage");
    if (!message) return;

    message.style.opacity = 1;
    setTimeout(() => {
      message.style.opacity = 0;
    }, 1000);
  }

  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.onload = () => {
        console.log(`Successfully loaded image: ${src}`);
        resolve(img);
      };
      img.src = src;
    });
  }

  preloadImages(paths) {
    return Promise.all(paths.map((p) => this.preloadImage(p)));
  }

  async loadCharacterSprites(domain) {
    const capital = domain.charAt(0).toUpperCase() + domain.slice(1);
    const base = "images";
    const run = Array.from(
      { length: 4 },
      (_, i) => `${base}/${capital}_Run%20${i + 1}.png`,
    );
    const jump = Array.from(
      { length: 6 },
      (_, i) => `${base}/${capital}_Jump%20${i + 1}.png`,
    );
    const [runFrames, jumpFrames, idle, jumpStill, defeat] = await Promise.all([
      this.preloadImages(run),
      this.preloadImages(jump),
      this.preloadImage(`${base}/${capital}_Character_Idle.png`),
      this.preloadImage(`${base}/${capital}_Character_Jump.png`),
      this.preloadImage(`${base}/${capital}_Character_Defeat.png`),
    ]);
    return { runFrames, jumpFrames, idle, jump: jumpStill, defeat };
  }
}