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
  let width = containerRect.width;
  let height = containerRect.height;

  if (isMobile) {
    height = containerRect.height;
    width = height * aspectRatio;
  } else {
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
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
    this.characterY = canvas.height - (this.isMobile ? 150 : 250);
    this.characterWidth = this.isMobile ? 96 : 128;
    this.characterHeight = this.isMobile ? 96 : 128;
    this.velocityY = 0;
    this.gravity = this.isMobile ? 0.25 : 0.29;
    this.jumpForce = this.isMobile ? -10 : -12;
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

    this.speedScale = 1.5;
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

    this.jumpSound = new Audio("sounds/Jump.wav");
    this.beanSound = new Audio("sounds/Bean.wav");
    this.deathSound = new Audio("sounds/Death.wav");

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

    if (this.soundEnabled) {
      this.deathSound?.play();
      if (window.bgMusic) window.bgMusic.pause();
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.scoreKey, this.highScore);
    }

    const totalBeans = parseInt(this.savedBeanCount) + this.beanCount;
    localStorage.setItem(this.beanKey, totalBeans);

    document.getElementById("highScore").textContent =
      `High: ${this.highScore}`;
    showEndScreen(this.score);
  }

  updateScore() {
    document.getElementById("score").textContent = `Score: ${this.score}`;
    document.getElementById("highScore").textContent = `High: ${this.highScore}`;
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
    const beanImage = new Image();
    beanImage.src = "images/RedBean.png";

    const width = 64;
    const height = 64;
    const x = this.canvas.width;
    const y = this.canvas.height - height - 180 - Math.random() * 50;

    this.beans.push({
      x,
      y,
      width,
      height,
      speed: this.isMobile ? 2.5 + Math.random() * 1.5 : 4.5 + Math.random() * 2.5,
      image: beanImage,
    });
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
      speed: this.isMobile ? 2.0 + Math.random() * 1.2 : 4 + Math.random() * 2,
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

    this.ctx.drawImage(
      this.backgroundImage,
      0,
      0,
      this.canvas.width,
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
      const inc = this.isMobile ? 0.04 : 0.08;
      const max = this.isMobile ? 2.0 : 3.0;
      this.speedScale = Math.min(this.speedScale + inc, max);
      this.showSpeedUpMessage();
      this.recentlySpedUp = true;
      this.lastSpeedTier = tier;
      setTimeout(() => (this.recentlySpedUp = false), 500);
    }

    document.getElementById("speedBar").style.width =
      `${((this.speedScale - 1.5) / (2.0 - 1.5)) * 100}%`;

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
      console.error('Current frame is null or undefined');
      return;
    }
    if (!currentFrame.complete) {
      console.error('Current frame not completely loaded');
      return;
    }
    this.ctx.drawImage(
      currentFrame,
      this.characterX,
      this.characterY,
      this.characterWidth,
      this.characterHeight,
    );

    this.obstacleSpawnTimer += 16 * delta;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
      this.obstacleSpawnInterval = this.isMobile
        ? 3000 + Math.random() * 2000
        : 2000 + Math.random() * 1500;
    }

    this.obstacles.forEach((ob, i) => {
      ob.x -= ob.speed * this.speedScale * delta;
      if (ob.image.complete) {
        this.ctx.drawImage(ob.image, ob.x, ob.y, ob.width, ob.height);
      }
      if (
        this.checkCollision(
          {
            x: this.characterX,
            y: this.characterY,
            width: this.characterWidth,
            height: this.characterHeight,
          },
          { x: ob.x, y: ob.y, width: ob.width, height: ob.height },
        )
      ) {
        this.lives--;
        this.updateLivesDisplay();

        if (this.soundEnabled) this.deathSound?.play();

        this.obstacles.splice(i, 1); // Remove obstacle so player doesn't get hit again instantly

        if (this.lives <= 0) {
          this.stop();
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
        if (this.soundEnabled) this.beanSound?.play();
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