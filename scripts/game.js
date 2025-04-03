// Initialize game with canvas element and element type
async function initGame(canvas, elementType) {
  const ctx = canvas.getContext('2d');
  
  // Create and initialize game instance
  window.gameInstance = new Game(canvas, elementType, ctx);
  await window.gameInstance.init();
  window.gameInstance.start();
  
  return window.gameInstance;
}

// Main game class
class Game {
  constructor(canvas, elementType, ctx) {
    // Canvas and rendering
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Game properties
    this.elementType = elementType; // lightning, fire, water, earth
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.paused = false;
    this.beanCount = 0;
    this.collectedBeans = 0;
    
    // Movement and speed
    this.speed = this.isMobile() ? 1.8 : 2.0; // Starting speed
    this.maxSpeed = this.isMobile() ? 2.5 : 3.5; // Maximum speed
    this.speedIncrease = 0.1;
    this.speedIncreaseInterval = 1000; // ms
    this.lastSpeedIncrease = 0;
    
    // Character properties
    this.characterSize = 50;
    this.characterX = this.width / 2 - this.characterSize / 2;
    this.characterY = this.height - this.characterSize * 2;
    this.characterSpeedX = 5;
    this.characterSprites = [];
    this.currentSpriteIndex = 0;
    this.spriteUpdateInterval = 150; // ms
    this.lastSpriteUpdate = 0;
    
    // Game elements
    this.beans = [];
    this.obstacles = [];
    this.lastBeanSpawn = 0;
    this.lastObstacleSpawn = 0;
    this.beanSpawnInterval = 2000; // ms
    this.obstacleSpawnInterval = 1500; // ms
    
    // Animation and timing
    this.animationFrame = null;
    this.lastUpdate = 0;
    
    // Input handling
    this.keys = {};
    this.touches = {};
    this.setupInputHandlers();
    
    // Messages
    this.messages = [];
    this.messageTimeout = 2000; // ms
    
    // Images
    this.images = {
      bean: null,
      healthBean: null,
      obstacle: null,
      life: null,
    };
  }
  
  // Initialize the game assets
  async init() {
    try {
      // Clear any existing animation frame
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      
      // Preload images
      await this.preloadImages([
        'images/Bean.png',
        'images/Health_Bean.png',
        'images/Obstacle.png',
        'images/Life.png'
      ]);
      
      // Load character sprites based on element type
      await this.loadCharacterSprites(this.elementType);
      
      console.log('Game initialized with element type:', this.elementType);
      return true;
    } catch (error) {
      console.error('Error initializing game:', error);
      return false;
    }
  }
  
  // Start or restart the game
  start() {
    // Reset game state
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.paused = false;
    this.beanCount = 0;
    this.collectedBeans = 0;
    this.speed = this.isMobile() ? 1.8 : 2.0;
    this.characterX = this.width / 2 - this.characterSize / 2;
    this.characterY = this.height - this.characterSize * 2;
    this.beans = [];
    this.obstacles = [];
    this.messages = [];
    this.lastSpeedIncrease = 0;
    this.lastBeanSpawn = 0;
    this.lastObstacleSpawn = 0;
    this.lastUpdate = performance.now();
    
    // Update score and lives display
    this.updateScore();
    this.updateLivesDisplay();
    
    // Start game loop
    this.loop(performance.now());
    console.log('Game started');
  }
  
  // Stop the game
  stop() {
    this.gameOver = true;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Save domain stats to local storage
    this.saveDomainStats();
    
    // Update server-side leaderboard if API is available
    if (window.leaderboardAPI) {
      window.leaderboardAPI.update(this.elementType, this.score, this.collectedBeans);
    }
    
    // Show end screen with final score
    window.showEndScreen(this.score);
    console.log('Game over with score:', this.score);
  }
  
  // Update the score display
  updateScore() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
      scoreElement.textContent = this.score;
    }
  }
  
  // Update the lives display
  updateLivesDisplay() {
    const livesContainer = document.getElementById('lives');
    if (livesContainer) {
      livesContainer.innerHTML = '';
      
      for (let i = 0; i < this.lives; i++) {
        const lifeImage = document.createElement('img');
        lifeImage.src = 'images/Life.png';
        lifeImage.alt = 'Life';
        lifeImage.className = 'life-icon';
        livesContainer.appendChild(lifeImage);
      }
    }
  }
  
  // Spawn a bean at random position
  spawnBean() {
    const isHealthBean = this.beanCount > 0 && this.beanCount % 6 === 0;
    const bean = {
      x: Math.random() * (this.width - 30),
      y: -30,
      width: 30,
      height: 30,
      collected: false,
      isHealthBean: isHealthBean
    };
    
    this.beans.push(bean);
    this.beanCount++;
    this.lastBeanSpawn = performance.now();
  }
  
  // Spawn an obstacle at random position
  spawnObstacle() {
    const obstacle = {
      x: Math.random() * (this.width - 40),
      y: -40,
      width: 40,
      height: 40,
      hit: false
    };
    
    this.obstacles.push(obstacle);
    this.lastObstacleSpawn = performance.now();
  }
  
  // Check collision between two rectangles
  checkCollision(r1, r2) {
    // Use a smaller hitbox for more forgiving collision detection (60% of original size)
    const shrinkFactor = 0.6;
    
    // Calculate the center points of each rectangle
    const r1CenterX = r1.x + r1.width / 2;
    const r1CenterY = r1.y + r1.height / 2;
    const r2CenterX = r2.x + r2.width / 2;
    const r2CenterY = r2.y + r2.height / 2;
    
    // Calculate the half-widths and half-heights (with shrink factor)
    const r1HalfWidth = (r1.width * shrinkFactor) / 2;
    const r1HalfHeight = (r1.height * shrinkFactor) / 2;
    const r2HalfWidth = (r2.width * shrinkFactor) / 2;
    const r2HalfHeight = (r2.height * shrinkFactor) / 2;
    
    // Calculate the distance between centers
    const distX = Math.abs(r1CenterX - r2CenterX);
    const distY = Math.abs(r1CenterY - r2CenterY);
    
    // Check if the distance is less than the sum of half-widths and half-heights
    return distX < (r1HalfWidth + r2HalfWidth) && distY < (r1HalfHeight + r2HalfHeight);
  }
  
  // Main game loop
  async loop(timestamp) {
    // Calculate delta time
    const deltaTime = timestamp - this.lastUpdate;
    this.lastUpdate = timestamp;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Skip updating if paused
    if (!this.paused) {
      // Increase speed over time
      if (timestamp - this.lastSpeedIncrease > this.speedIncreaseInterval) {
        if (this.speed < this.maxSpeed) {
          this.speed += this.speedIncrease;
          this.speed = Math.min(this.speed, this.maxSpeed);
          this.lastSpeedIncrease = timestamp;
          this.showSpeedUpMessage();
        }
      }
      
      // Handle character movement
      if (this.keys.ArrowLeft || this.keys.a || this.touches.left) {
        this.characterX = Math.max(0, this.characterX - this.characterSpeedX);
      }
      if (this.keys.ArrowRight || this.keys.d || this.touches.right) {
        this.characterX = Math.min(this.width - this.characterSize, this.characterX + this.characterSpeedX);
      }
      
      // Update sprite animation
      if (timestamp - this.lastSpriteUpdate > this.spriteUpdateInterval) {
        this.currentSpriteIndex = (this.currentSpriteIndex + 1) % this.characterSprites.length;
        this.lastSpriteUpdate = timestamp;
      }
      
      // Spawn beans
      if (timestamp - this.lastBeanSpawn > this.beanSpawnInterval) {
        this.spawnBean();
      }
      
      // Spawn obstacles
      if (timestamp - this.lastObstacleSpawn > this.obstacleSpawnInterval) {
        this.spawnObstacle();
      }
      
      // Update beans
      for (let i = 0; i < this.beans.length; i++) {
        const bean = this.beans[i];
        
        // Move bean down
        bean.y += this.speed;
        
        // Check if bean is collected
        if (!bean.collected) {
          const character = {
            x: this.characterX,
            y: this.characterY,
            width: this.characterSize,
            height: this.characterSize
          };
          
          if (this.checkCollision(bean, character)) {
            bean.collected = true;
            this.score += 10;
            this.collectedBeans++;
            this.updateScore();
            
            // Health bean restores a life
            if (bean.isHealthBean && this.lives < 3) {
              this.lives++;
              this.updateLivesDisplay();
              this.showHealthUpMessage();
              
              // Play health up sound
              if (window.soundEnabled) {
                const healthSound = new Audio('sounds/Health_Up.wav');
                healthSound.volume = 0.5;
                healthSound.play();
              }
            }
          }
        }
        
        // Remove beans that are out of bounds
        if (bean.y > this.height) {
          this.beans.splice(i, 1);
          i--;
        }
      }
      
      // Update obstacles
      for (let i = 0; i < this.obstacles.length; i++) {
        const obstacle = this.obstacles[i];
        
        // Move obstacle down
        obstacle.y += this.speed;
        
        // Check if obstacle hits character
        if (!obstacle.hit) {
          const character = {
            x: this.characterX,
            y: this.characterY,
            width: this.characterSize,
            height: this.characterSize
          };
          
          if (this.checkCollision(obstacle, character)) {
            obstacle.hit = true;
            this.lives--;
            this.updateLivesDisplay();
            
            // Check if game over
            if (this.lives <= 0) {
              this.stop();
              return;
            }
          }
        }
        
        // Remove obstacles that are out of bounds
        if (obstacle.y > this.height) {
          this.obstacles.splice(i, 1);
          i--;
        }
      }
      
      // Update messages
      for (let i = 0; i < this.messages.length; i++) {
        const message = this.messages[i];
        
        if (timestamp - message.timestamp > this.messageTimeout) {
          this.messages.splice(i, 1);
          i--;
        }
      }
    }
    
    // Draw background
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw character
    if (this.characterSprites.length > 0 && this.characterSprites[this.currentSpriteIndex]) {
      this.ctx.drawImage(
        this.characterSprites[this.currentSpriteIndex],
        this.characterX,
        this.characterY,
        this.characterSize,
        this.characterSize
      );
    } else {
      // Fallback if sprite not loaded
      this.ctx.fillStyle = '#f00';
      this.ctx.fillRect(this.characterX, this.characterY, this.characterSize, this.characterSize);
    }
    
    // Draw beans
    for (const bean of this.beans) {
      if (!bean.collected) {
        const beanImage = bean.isHealthBean ? this.images.healthBean : this.images.bean;
        if (beanImage) {
          this.ctx.drawImage(beanImage, bean.x, bean.y, bean.width, bean.height);
        } else {
          this.ctx.fillStyle = bean.isHealthBean ? '#0f0' : '#ff0';
          this.ctx.fillRect(bean.x, bean.y, bean.width, bean.height);
        }
      }
    }
    
    // Draw obstacles
    for (const obstacle of this.obstacles) {
      if (!obstacle.hit) {
        if (this.images.obstacle) {
          this.ctx.drawImage(this.images.obstacle, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else {
          this.ctx.fillStyle = '#00f';
          this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
      }
    }
    
    // Draw messages
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    
    for (const message of this.messages) {
      const alpha = 1 - (timestamp - message.timestamp) / this.messageTimeout;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillText(message.text, this.width / 2, this.height / 2);
    }
    
    this.ctx.globalAlpha = 1;
    
    // Continue the game loop if not game over
    if (!this.gameOver) {
      this.animationFrame = requestAnimationFrame(this.loop.bind(this));
    }
  }
  
  // Show speed up message
  showSpeedUpMessage() {
    this.messages.push({
      text: 'Speed Up!',
      timestamp: performance.now()
    });
  }
  
  // Show health up message
  showHealthUpMessage() {
    this.messages.push({
      text: '+1 Life!',
      timestamp: performance.now()
    });
  }
  
  // Preload image
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }
  
  // Preload multiple images
  async preloadImages(paths) {
    try {
      this.images.bean = await this.preloadImage('images/Bean.png');
      this.images.healthBean = await this.preloadImage('images/Health_Bean.png');
      this.images.obstacle = await this.preloadImage('images/Obstacle.png');
      this.images.life = await this.preloadImage('images/Life.png');
      
      console.log('Images preloaded successfully');
      return true;
    } catch (error) {
      console.error('Error preloading images:', error);
      return false;
    }
  }
  
  // Load character sprites based on domain
  async loadCharacterSprites(domain) {
    try {
      this.characterSprites = [];
      
      // Load all sprites (4 frames per character)
      for (let i = 1; i <= 4; i++) {
        const sprite = await this.preloadImage(`images/Character_${domain}_${i}.png`);
        this.characterSprites.push(sprite);
      }
      
      console.log(`Loaded ${this.characterSprites.length} sprites for ${domain} character`);
      return true;
    } catch (error) {
      console.error(`Error loading sprites for ${domain}:`, error);
      return false;
    }
  }
  
  // Save domain stats to local storage
  saveDomainStats() {
    const storageKey = `domain_${this.elementType}`;
    
    // Get existing stats
    const existingStats = JSON.parse(localStorage.getItem(storageKey)) || {
      highScore: 0,
      totalScore: 0,
      totalBeans: 0
    };
    
    // Update stats
    const newStats = {
      highScore: Math.max(existingStats.highScore, this.score),
      totalScore: existingStats.totalScore + this.score,
      totalBeans: existingStats.totalBeans + this.collectedBeans
    };
    
    // Save to local storage
    localStorage.setItem(storageKey, JSON.stringify(newStats));
    console.log(`Saved stats for ${this.elementType}:`, newStats);
  }
  
  // Setup keyboard and touch input handlers
  setupInputHandlers() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const touchX = touch.clientX;
      
      if (touchX < this.width / 2) {
        this.touches.left = true;
        this.touches.right = false;
      } else {
        this.touches.left = false;
        this.touches.right = true;
      }
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const touchX = touch.clientX;
      
      if (touchX < this.width / 2) {
        this.touches.left = true;
        this.touches.right = false;
      } else {
        this.touches.left = false;
        this.touches.right = true;
      }
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touches.left = false;
      this.touches.right = false;
    });
    
    // Handle visibility change (pause/resume)
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
    });
  }
  
  // Check if running on mobile device
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}