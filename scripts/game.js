import { detectRectCollision, loadImage, getRandomInt } from './utils.js';
import { updateDomainStats } from './api.js';

/**
 * Initializes the game
 * @param {HTMLCanvasElement} canvas - Canvas element for the game
 * @param {string} elementType - Type of element (lightning, fire, water, earth)
 * @returns {Promise<Game>} - Game instance
 */
async function initGame(canvas, elementType) {
  const ctx = canvas.getContext('2d');
  const game = new Game(canvas, elementType, ctx);
  await game.init();
  return game;
}

/**
 * Main game class
 */
class Game {
  constructor(canvas, elementType, ctx) {
    // Canvas setup
    this.canvas = canvas;
    this.ctx = ctx;
    this.elementType = elementType;
    
    // Game state
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.paused = false;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.beanCount = 0;
    this.obstacleCount = 0;
    this.totalBeansCollected = 0;
    
    // Game over callback
    this.onGameOver = null;
    
    // Game elements
    this.player = {
      x: canvas.width / 2 - 25,
      y: canvas.height - 70,
      width: 50,
      height: 50,
      speed: 0,
      maxSpeed: this.isMobile() ? 2.5 : 3.5, // Increased max speed
      acceleration: 0.1,
      sprites: []
    };
    
    this.beans = [];
    this.obstacles = [];
    this.currentSprite = 0;
    this.spriteChangeTime = 0;
    
    // Health up message
    this.healthUpMessage = { active: false, time: 0 };
    
    // Speed up message
    this.speedUpMessage = { active: false, time: 0 };
    
    // Game metrics
    this.spawnRate = { bean: 1500, obstacle: 2000 };
    this.lastSpawn = { bean: 0, obstacle: 0 };
    this.difficulty = 1;
    this.difficultyIncreaseInterval = 10000; // 10 seconds
    this.lastDifficultyIncrease = 0;
    
    // Input handling
    this.keys = { left: false, right: false };
  }
  
  /**
   * Initialize the game
   */
  async init() {
    // Load character sprites
    await this.loadCharacterSprites(this.elementType);
    
    // Preload other game images
    await this.preloadImages([
      'images/Bean.png',
      'images/Bean_Green.png',
      'images/Obstacle.png',
      `images/Background_${this.elementType}.png`
    ]);
    
    // Set up input handlers
    this.setupInputHandlers();
    
    return this;
  }
  
  /**
   * Start the game loop
   */
  start() {
    if (this.animationFrameId) return;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Save stats to server
    this.saveDomainStats();
    
    // Call game over callback if provided
    if (this.gameOver && typeof this.onGameOver === 'function') {
      this.onGameOver();
    }
  }
  
  /**
   * Update score display
   */
  updateScore() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
      scoreElement.textContent = this.score;
    }
  }
  
  /**
   * Update lives display
   */
  updateLivesDisplay() {
    const livesContainer = document.getElementById('lives-container');
    if (livesContainer) {
      livesContainer.innerHTML = '';
      for (let i = 0; i < this.lives; i++) {
        const lifeIcon = document.createElement('img');
        lifeIcon.src = 'images/Bean.png';
        lifeIcon.style.width = '30px';
        lifeIcon.style.height = '30px';
        lifeIcon.style.marginRight = '5px';
        livesContainer.appendChild(lifeIcon);
      }
    }
  }
  
  /**
   * Spawn a new bean
   */
  spawnBean() {
    const beanSize = 30;
    const isGreenBean = this.beanCount > 0 && this.beanCount % 6 === 0; // Every 6th bean is green (health)
    
    this.beans.push({
      x: getRandomInt(0, this.canvas.width - beanSize),
      y: -beanSize,
      width: beanSize,
      height: beanSize,
      speed: 2 + this.difficulty * 0.5,
      isGreen: isGreenBean
    });
    
    this.beanCount++;
  }
  
  /**
   * Spawn a new obstacle
   */
  spawnObstacle() {
    const obstacleSize = 40;
    
    this.obstacles.push({
      x: getRandomInt(0, this.canvas.width - obstacleSize),
      y: -obstacleSize,
      width: obstacleSize,
      height: obstacleSize,
      speed: 3 + this.difficulty * 0.7
    });
    
    this.obstacleCount++;
  }
  
  /**
   * Check for collision between two rectangles
   * @param {Object} r1 - First rectangle
   * @param {Object} r2 - Second rectangle
   * @returns {boolean} - True if collision
   */
  checkCollision(r1, r2) {
    // Apply 60% hitbox size for fairer collision detection
    const shrinkFactor = 0.6;
    const adjustedWidth = r1.width * shrinkFactor;
    const adjustedHeight = r1.height * shrinkFactor;
    const xOffset = (r1.width - adjustedWidth) / 2;
    const yOffset = (r1.height - adjustedHeight) / 2;
    
    const adjustedR1 = {
      x: r1.x + xOffset,
      y: r1.y + yOffset,
      width: adjustedWidth,
      height: adjustedHeight
    };
    
    return detectRectCollision(adjustedR1, r2);
  }
  
  /**
   * Game loop
   * @param {number} timestamp - Current timestamp
   */
  async loop(timestamp) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    if (!this.paused && !this.gameOver) {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw background image
      const backgroundImage = this.backgroundImage;
      if (backgroundImage) {
        this.ctx.drawImage(backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
      }
      
      // Handle player movement
      if (this.keys.left) {
        this.player.speed = Math.max(-this.player.maxSpeed, this.player.speed - this.player.acceleration);
      } else if (this.keys.right) {
        this.player.speed = Math.min(this.player.maxSpeed, this.player.speed + this.player.acceleration);
      } else {
        // Apply deceleration when no keys are pressed
        if (Math.abs(this.player.speed) < 0.1) {
          this.player.speed = 0;
        } else if (this.player.speed > 0) {
          this.player.speed -= this.player.acceleration;
        } else {
          this.player.speed += this.player.acceleration;
        }
      }
      
      // Update player position
      this.player.x += this.player.speed;
      
      // Keep player within canvas bounds
      if (this.player.x < 0) {
        this.player.x = 0;
        this.player.speed = 0;
      } else if (this.player.x + this.player.width > this.canvas.width) {
        this.player.x = this.canvas.width - this.player.width;
        this.player.speed = 0;
      }
      
      // Change sprite based on time or direction
      if (timestamp - this.spriteChangeTime > 150) {
        this.currentSprite = (this.currentSprite + 1) % this.player.sprites.length;
        this.spriteChangeTime = timestamp;
      }
      
      // Draw player
      const sprite = this.player.sprites[this.currentSprite];
      if (sprite) {
        this.ctx.drawImage(sprite, this.player.x, this.player.y, this.player.width, this.player.height);
      } else {
        // Fallback if sprite isn't loaded
        this.ctx.fillStyle = '#00f';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
      }
      
      // Spawn beans and obstacles based on timing
      if (timestamp - this.lastSpawn.bean > this.spawnRate.bean) {
        this.spawnBean();
        this.lastSpawn.bean = timestamp;
      }
      
      if (timestamp - this.lastSpawn.obstacle > this.spawnRate.obstacle) {
        this.spawnObstacle();
        this.lastSpawn.obstacle = timestamp;
      }
      
      // Update and draw beans
      for (let i = this.beans.length - 1; i >= 0; i--) {
        const bean = this.beans[i];
        bean.y += bean.speed;
        
        // Draw bean
        const beanImage = bean.isGreen ? this.greenBeanImage : this.beanImage;
        if (beanImage) {
          this.ctx.drawImage(beanImage, bean.x, bean.y, bean.width, bean.height);
        } else {
          // Fallback
          this.ctx.fillStyle = bean.isGreen ? '#0f0' : '#ff0';
          this.ctx.fillRect(bean.x, bean.y, bean.width, bean.height);
        }
        
        // Check for collision with player
        if (this.checkCollision(this.player, bean)) {
          // Bean collected
          this.beans.splice(i, 1);
          
          if (bean.isGreen && this.lives < 3) {
            // Green bean restores life (max 3)
            this.lives++;
            this.updateLivesDisplay();
            this.showHealthUpMessage();
          } else {
            // Regular bean increases score
            this.score += 10;
            this.updateScore();
          }
          
          this.totalBeansCollected++;
          continue;
        }
        
        // Remove beans that go offscreen
        if (bean.y > this.canvas.height) {
          this.beans.splice(i, 1);
        }
      }
      
      // Update and draw obstacles
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obstacle = this.obstacles[i];
        obstacle.y += obstacle.speed;
        
        // Draw obstacle
        if (this.obstacleImage) {
          this.ctx.drawImage(this.obstacleImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else {
          // Fallback
          this.ctx.fillStyle = '#f00';
          this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
        
        // Check for collision with player
        if (this.checkCollision(this.player, obstacle)) {
          // Hit by obstacle
          this.obstacles.splice(i, 1);
          this.lives--;
          this.updateLivesDisplay();
          
          if (this.lives <= 0) {
            this.gameOver = true;
            this.stop();
            break;
          }
          
          continue;
        }
        
        // Remove obstacles that go offscreen
        if (obstacle.y > this.canvas.height) {
          this.obstacles.splice(i, 1);
        }
      }
      
      // Increase difficulty over time
      if (timestamp - this.lastDifficultyIncrease > this.difficultyIncreaseInterval) {
        this.difficulty += 0.1;
        this.spawnRate.bean = Math.max(500, this.spawnRate.bean - 50);
        this.spawnRate.obstacle = Math.max(1000, this.spawnRate.obstacle - 100);
        this.lastDifficultyIncrease = timestamp;
        
        // At certain difficulty thresholds, increase player speed
        if (Math.floor(this.difficulty * 10) % 5 === 0) {
          const oldMaxSpeed = this.player.maxSpeed;
          this.player.maxSpeed = Math.min(
            this.isMobile() ? 4 : 5,
            this.player.maxSpeed + 0.1
          );
          
          if (this.player.maxSpeed > oldMaxSpeed) {
            this.showSpeedUpMessage();
          }
        }
      }
      
      // Draw health up message if active
      if (this.healthUpMessage.active) {
        if (timestamp - this.healthUpMessage.time < 2000) {
          this.ctx.font = 'bold 24px Arial';
          this.ctx.fillStyle = '#0f0';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('Health +1', this.canvas.width / 2, this.canvas.height / 2 - 50);
        } else {
          this.healthUpMessage.active = false;
        }
      }
      
      // Draw speed up message if active
      if (this.speedUpMessage.active) {
        if (timestamp - this.speedUpMessage.time < 2000) {
          this.ctx.font = 'bold 24px Arial';
          this.ctx.fillStyle = '#ff0';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('Speed Up!', this.canvas.width / 2, this.canvas.height / 2 - 80);
        } else {
          this.speedUpMessage.active = false;
        }
      }
    }
    
    if (!this.gameOver) {
      this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    } else {
      this.saveDomainStats();
    }
  }
  
  /**
   * Show speed up message
   */
  showSpeedUpMessage() {
    this.speedUpMessage.active = true;
    this.speedUpMessage.time = performance.now();
  }
  
  /**
   * Show health up message
   */
  showHealthUpMessage() {
    this.healthUpMessage.active = true;
    this.healthUpMessage.time = performance.now();
  }
  
  /**
   * Preload an image
   * @param {string} src - Image source
   * @returns {Promise<HTMLImageElement>} - Loaded image
   */
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        resolve(null); // Resolve with null to allow the game to continue
      };
      img.src = src;
    });
  }
  
  /**
   * Preload multiple images
   * @param {string[]} paths - Array of image paths
   */
  async preloadImages(paths) {
    try {
      const images = await Promise.all(paths.map(path => this.preloadImage(path)));
      
      this.beanImage = images[0];
      this.greenBeanImage = images[1];
      this.obstacleImage = images[2];
      this.backgroundImage = images[3];
    } catch (error) {
      console.error('Error preloading images:', error);
    }
  }
  
  /**
   * Load character sprites for the given domain
   * @param {string} domain - Element domain
   */
  async loadCharacterSprites(domain) {
    try {
      this.player.sprites = await Promise.all([
        this.preloadImage(`images/Character_${domain}_1.png`),
        this.preloadImage(`images/Character_${domain}_2.png`),
        this.preloadImage(`images/Character_${domain}_3.png`),
        this.preloadImage(`images/Character_${domain}_4.png`)
      ]);
    } catch (error) {
      console.error('Error loading character sprites:', error);
      this.player.sprites = [];
    }
  }
  
  /**
   * Save domain stats to server
   */
  saveDomainStats() {
    // Update server with latest stats
    updateDomainStats(this.elementType, this.score, this.totalBeansCollected)
      .then(response => {
        console.log('Domain stats updated:', response);
      })
      .catch(error => {
        console.error('Failed to update domain stats:', error);
      });
  }
  
  /**
   * Set up input handlers for keyboard and touch
   */
  setupInputHandlers() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = true;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = false;
      }
    });
    
    // Touch controls for mobile
    if (this.isMobile()) {
      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const x = touch.clientX;
        
        if (x < this.canvas.width / 2) {
          this.keys.left = true;
          this.keys.right = false;
        } else {
          this.keys.right = true;
          this.keys.left = false;
        }
      });
      
      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const x = touch.clientX;
        
        if (x < this.canvas.width / 2) {
          this.keys.left = true;
          this.keys.right = false;
        } else {
          this.keys.right = true;
          this.keys.left = false;
        }
      });
      
      this.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.left = false;
        this.keys.right = false;
      });
    }
    
    // Visibility change handling (pause game when tab is not active)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.paused = true;
      } else {
        this.paused = false;
      }
    });
  }
  
  /**
   * Check if the device is mobile
   * @returns {boolean} - True if mobile device
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}

// Export for use in other modules
export { initGame, Game };