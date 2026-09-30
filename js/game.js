/**
 * NEON VIPER — Core Game Simulation Engine
 * Handles game loop, snake mechanics, power-ups, portals, obstacles, and canvas rendering.
 */
class SnakeGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Grid settings
    this.gridSize = 24; // 24x24 tiles
    this.tileSize = this.canvas.width / this.gridSize; // 25px per tile

    // Game state
    this.state = 'READY'; // READY, PLAYING, PAUSED, GAMEOVER
    this.score = 0;
    this.highScore = 0;
    this.orbsConsumed = 0;
    this.combo = 1;
    this.maxComboReached = 1;
    this.comboTimer = 0;
    this.comboDuration = 4000; // 4 seconds window for combos
    this.passThroughWalls = true;
    this.mode = 'classic'; // classic, portals, obstacles, frenzy
    this.difficulty = 'normal'; // easy, normal, hard, insane
    this.skin = 'neon-cyan';
    this.isTurbo = false;

    // Movement & Timing
    this.speedMap = {
      easy: 140,
      normal: 100,
      hard: 70,
      insane: 48
    };
    this.baseStepInterval = this.speedMap.normal;
    this.currentStepInterval = this.baseStepInterval;
    this.lastStepTime = 0;
    this.lastFrameTime = 0;

    // Entities
    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.inputQueue = [];
    this.food = null;
    this.specialItem = null;
    this.specialItemTimer = null;
    this.obstacles = [];
    this.portals = [];

    // Active Power-up status timers (duration in ms)
    this.activePowerups = {
      shield: false,
      freeze: 0,
      magnet: 0,
      ghost: 0
    };

    // Visual eye blinking & animation timer
    this.animTime = 0;
    this.eyeBlink = 0;

    // Load High Score from Storage
    this.loadStorage();

    // Bind Game Loop
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  loadStorage() {
    const saved = localStorage.getItem('neon_snake_highscore');
    this.highScore = saved ? parseInt(saved, 10) : 0;
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neon_snake_highscore', this.highScore);
      return true;
    }
    return false;
  }

  init() {
    // Reset snake in center facing right
    const startX = Math.floor(this.gridSize / 2);
    const startY = Math.floor(this.gridSize / 2);

    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];

    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.inputQueue = [];

    this.score = 0;
    this.orbsConsumed = 0;
    this.combo = 1;
    this.maxComboReached = 1;
    this.comboTimer = 0;

    this.baseStepInterval = this.speedMap[this.difficulty] || 100;
    this.currentStepInterval = this.baseStepInterval;

    this.activePowerups = {
      shield: false,
      freeze: 0,
      magnet: 0,
      ghost: 0
    };

    window.particleSystem.reset();
    this.setupObstaclesAndPortals();
    this.spawnFood();
    this.spawnSpecialItemChance(true);
  }

  setupObstaclesAndPortals() {
    this.obstacles = [];
    this.portals = [];

    if (this.mode === 'obstacles') {
      // Spawn 8-12 hazardous cyber barrier blocks not in the center lane
      const count = 10;
      for (let i = 0; i < count; i++) {
        let ox, oy;
        let valid = false;
        while (!valid) {
          ox = Math.floor(Math.random() * (this.gridSize - 4)) + 2;
          oy = Math.floor(Math.random() * (this.gridSize - 4)) + 2;
          // Avoid snake start positions
          if (Math.abs(ox - this.gridSize / 2) > 3 || Math.abs(oy - this.gridSize / 2) > 3) {
            valid = !this.obstacles.some(ob => ob.x === ox && ob.y === oy);
          }
        }
        this.obstacles.push({ x: ox, y: oy });
      }
    } else if (this.mode === 'portals') {
      // 2 pairs of portals (Blue A1 <-> A2, Orange B1 <-> B2)
      this.portals = [
        { id: 1, pairId: 2, x: 3, y: 3, color: '#00f0ff' },
        { id: 2, pairId: 1, x: this.gridSize - 4, y: this.gridSize - 4, color: '#00f0ff' },
        { id: 3, pairId: 4, x: this.gridSize - 4, y: 3, color: '#ff6b00' },
        { id: 4, pairId: 3, x: 3, y: this.gridSize - 4, color: '#ff6b00' }
      ];
    }
  }

  start() {
    this.init();
    this.state = 'PLAYING';
    this.lastStepTime = performance.now();
    window.soundEngine.init();
    if (window.soundEngine.musicEnabled) {
      window.soundEngine.startBGM();
    }
    if (window.uiManager) {
      window.uiManager.onGameStart();
    }
  }

  pause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      if (window.uiManager) window.uiManager.showPauseOverlay(true);
    }
  }

  resume() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastStepTime = performance.now();
      if (window.uiManager) window.uiManager.showPauseOverlay(false);
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') this.pause();
    else if (this.state === 'PAUSED') this.resume();
  }

  gameOver() {
    this.state = 'GAMEOVER';
    window.soundEngine.playDie();
    window.soundEngine.stopBGM();

    // Trigger visual disintegration particles
    const skinColor = this.getSkinColors().head;
    window.particleSystem.createDeathShards(
      this.snake.map(s => ({
        x: s.x * this.tileSize + this.tileSize / 2,
        y: s.y * this.tileSize + this.tileSize / 2
      })),
      skinColor
    );

    // Screen Shake effect
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
      wrapper.classList.remove('screen-shake');
      void wrapper.offsetWidth; // trigger reflow
      wrapper.classList.add('screen-shake');
    }

    const isNewHigh = this.saveHighScore();

    // Record Telemetry
    if (window.uiManager) {
      window.uiManager.recordRunStats({
        score: this.score,
        length: this.snake.length,
        orbs: this.orbsConsumed,
        maxCombo: this.maxComboReached,
        isNewHigh: isNewHigh
      });
      window.uiManager.showGameOverOverlay(true, {
        score: this.score,
        length: this.snake.length,
        orbs: this.orbsConsumed,
        maxCombo: this.maxComboReached,
        isNewHigh: isNewHigh
      });
    }
  }

  // --- Controls & Input Queue ---
  queueDirection(newDir) {
    if (this.state !== 'PLAYING') return;

    const lastDir = this.inputQueue.length > 0 
      ? this.inputQueue[this.inputQueue.length - 1] 
      : this.direction;

    // Prevent immediate 180-degree reversal
    if (newDir.x === -lastDir.x && newDir.y === -lastDir.y) return;
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;

    if (this.inputQueue.length < 3) {
      this.inputQueue.push(newDir);
    }
  }

  setTurbo(isTurbo) {
    this.isTurbo = isTurbo;
  }

  // --- Spawning Logic ---
  getRandomEmptyTile() {
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(`${s.x},${s.y}`));
    this.obstacles.forEach(o => occupied.add(`${o.x},${o.y}`));
    this.portals.forEach(p => occupied.add(`${p.x},${p.y}`));
    if (this.food) occupied.add(`${this.food.x},${this.food.y}`);
    if (this.specialItem) occupied.add(`${this.specialItem.x},${this.specialItem.y}`);

    const freeTiles = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (!occupied.has(`${x},${y}`)) {
          freeTiles.push({ x, y });
        }
      }
    }

    if (freeTiles.length === 0) return { x: 0, y: 0 };
    return freeTiles[Math.floor(Math.random() * freeTiles.length)];
  }

  spawnFood() {
    const pos = this.getRandomEmptyTile();
    this.food = {
      x: pos.x,
      y: pos.y,
      type: 'apple',
      color: '#ff2a5f',
      glow: '#ff0055',
      points: 10
    };
  }

  spawnSpecialItemChance(isInitial = false) {
    if (this.specialItem) return;
    if (!isInitial && Math.random() > 0.35) return;

    const types = ['star', 'shield', 'freeze', 'magnet', 'ghost'];
    const weights = [0.4, 0.2, 0.15, 0.15, 0.1]; // weighted distribution
    
    let rand = Math.random();
    let selectedType = 'star';
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) {
        selectedType = types[i];
        break;
      }
    }

    const pos = this.getRandomEmptyTile();
    const configMap = {
      star: { color: '#ffe600', icon: '⭐', points: 50, duration: 9000 },
      shield: { color: '#00f0ff', icon: '🛡️', points: 20, duration: 8000 },
      freeze: { color: '#80d4ff', icon: '❄️', points: 20, duration: 8000 },
      magnet: { color: '#ff7700', icon: '🧲', points: 20, duration: 8000 },
      ghost: { color: '#b366ff', icon: '👻', points: 30, duration: 7000 }
    };

    const cfg = configMap[selectedType];
    this.specialItem = {
      x: pos.x,
      y: pos.y,
      type: selectedType,
      color: cfg.color,
      icon: cfg.icon,
      points: cfg.points,
      expiresAt: performance.now() + cfg.duration,
      totalDuration: cfg.duration
    };
  }

  // --- Movement & Physics Step ---
  update(deltaTime) {
    if (this.state !== 'PLAYING') return;

    // Update active powerup timers
    if (this.activePowerups.freeze > 0) {
      this.activePowerups.freeze -= deltaTime;
      if (this.activePowerups.freeze <= 0) this.activePowerups.freeze = 0;
    }
    if (this.activePowerups.magnet > 0) {
      this.activePowerups.magnet -= deltaTime;
      if (this.activePowerups.magnet <= 0) this.activePowerups.magnet = 0;
    }
    if (this.activePowerups.ghost > 0) {
      this.activePowerups.ghost -= deltaTime;
      if (this.activePowerups.ghost <= 0) this.activePowerups.ghost = 0;
    }

    // Update Combo Timer
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.comboTimer = 0;
      }
    }

    // Check expiring special item
    if (this.specialItem && performance.now() >= this.specialItem.expiresAt) {
      this.specialItem = null;
    }

    // Determine current step speed
    let speed = this.baseStepInterval;
    if (this.activePowerups.freeze > 0) speed *= 1.45; // Slow down
    if (this.isTurbo) speed *= 0.55; // Turbo boost acceleration
    if (this.mode === 'frenzy') {
      const frenzyBonus = Math.min(this.orbsConsumed * 1.5, 45);
      speed = Math.max(35, speed - frenzyBonus);
    }
    this.currentStepInterval = speed;

    // Magnet pulling effect towards head
    if (this.activePowerups.magnet > 0 && this.food) {
      const head = this.snake[0];
      const dist = Math.hypot(head.x - this.food.x, head.y - this.food.y);
      if (dist <= 4 && dist > 1 && Math.random() < 0.25) {
        // Move food 1 tile closer to head
        const dx = Math.sign(head.x - this.food.x);
        const dy = Math.sign(head.y - this.food.y);
        if (dx !== 0 && !this.isTileOccupied(this.food.x + dx, this.food.y)) {
          this.food.x += dx;
        } else if (dy !== 0 && !this.isTileOccupied(this.food.x, this.food.y + dy)) {
          this.food.y += dy;
        }
      }
    }

    // Time to advance snake by 1 grid tile?
    const now = performance.now();
    if (now - this.lastStepTime >= this.currentStepInterval) {
      this.step();
      this.lastStepTime = now;
    }
  }

  isTileOccupied(x, y) {
    if (this.snake.some(s => s.x === x && s.y === y)) return true;
    if (this.obstacles.some(o => o.x === x && o.y === y)) return true;
    return false;
  }

  step() {
    // Process Next Direction from Input Queue
    if (this.inputQueue.length > 0) {
      this.direction = this.inputQueue.shift();
    }

    const head = this.snake[0];
    let nextX = head.x + this.direction.x;
    let nextY = head.y + this.direction.y;

    // 1. Wall Boundary Handling
    if (this.passThroughWalls) {
      if (nextX < 0) nextX = this.gridSize - 1;
      else if (nextX >= this.gridSize) nextX = 0;
      if (nextY < 0) nextY = this.gridSize - 1;
      else if (nextY >= this.gridSize) nextY = 0;
    } else {
      if (nextX < 0 || nextX >= this.gridSize || nextY < 0 || nextY >= this.gridSize) {
        if (this.handleFatalCollision('Wall Crash!')) return;
      }
    }

    // 2. Portal Teleportation
    if (this.mode === 'portals') {
      const portal = this.portals.find(p => p.x === nextX && p.y === nextY);
      if (portal) {
        const destPortal = this.portals.find(p => p.id === portal.pairId);
        if (destPortal) {
          nextX = (destPortal.x + this.direction.x + this.gridSize) % this.gridSize;
          nextY = (destPortal.y + this.direction.y + this.gridSize) % this.gridSize;
          window.soundEngine.playPortal();
          window.particleSystem.createBurst(
            destPortal.x * this.tileSize + this.tileSize / 2,
            destPortal.y * this.tileSize + this.tileSize / 2,
            portal.color,
            12,
            3
          );
        }
      }
    }

    // 3. Cyber Obstacles Collision
    if (this.activePowerups.ghost <= 0) {
      const hitObstacle = this.obstacles.some(o => o.x === nextX && o.y === nextY);
      if (hitObstacle) {
        if (this.handleFatalCollision('Obstacle Collision!')) return;
      }
    }

    // 4. Self Collision
    if (this.activePowerups.ghost <= 0) {
      // Ignore tail if it will vacate on this step (unless growing)
      const willGrow = (this.food && nextX === this.food.x && nextY === this.food.y) ||
                       (this.specialItem && nextX === this.specialItem.x && nextY === this.specialItem.y);
      const checkLength = willGrow ? this.snake.length : this.snake.length - 1;
      for (let i = 0; i < checkLength; i++) {
        if (this.snake[i].x === nextX && this.snake[i].y === nextY) {
          if (this.handleFatalCollision('Self Collision!')) return;
        }
      }
    }

    // Create Snake Trail Particle
    const skinColor = this.getSkinColors().head;
    window.particleSystem.createTrail(
      head.x * this.tileSize + this.tileSize / 2,
      head.y * this.tileSize + this.tileSize / 2,
      skinColor
    );

    // Advance Head
    const newHead = { x: nextX, y: nextY };
    this.snake.unshift(newHead);

    let hasEaten = false;

    // 5. Food Consumption
    if (this.food && nextX === this.food.x && nextY === this.food.y) {
      hasEaten = true;
      this.orbsConsumed++;
      const pts = this.food.points * this.combo;
      this.score += pts;

      window.soundEngine.playEat();
      window.soundEngine.playCombo(this.combo);

      window.particleSystem.createBurst(
        nextX * this.tileSize + this.tileSize / 2,
        nextY * this.tileSize + this.tileSize / 2,
        this.food.color,
        16,
        4.5
      );

      window.particleSystem.addFloatingText(
        `+${pts}${this.combo > 1 ? ` (x${this.combo})` : ''}`,
        nextX * this.tileSize + this.tileSize / 2,
        nextY * this.tileSize,
        this.food.color,
        14
      );

      // Increase Combo
      this.combo = Math.min(5, this.combo + 1);
      if (this.combo > this.maxComboReached) {
        this.maxComboReached = this.combo;
      }
      this.comboTimer = this.comboDuration;

      // Spawn new food & special chance
      this.spawnFood();
      this.spawnSpecialItemChance();
    }

    // 6. Special Power-up Item Consumption
    if (this.specialItem && nextX === this.specialItem.x && nextY === this.specialItem.y) {
      hasEaten = true;
      const pts = this.specialItem.points * this.combo;
      this.score += pts;

      this.activatePowerup(this.specialItem.type);

      window.particleSystem.createBurst(
        nextX * this.tileSize + this.tileSize / 2,
        nextY * this.tileSize + this.tileSize / 2,
        this.specialItem.color,
        24,
        5.5
      );

      window.particleSystem.addFloatingText(
        `+${pts} ${this.specialItem.type.toUpperCase()}!`,
        nextX * this.tileSize + this.tileSize / 2,
        nextY * this.tileSize,
        this.specialItem.color,
        15
      );

      this.specialItem = null;
    }

    // If no food was eaten, trim the tail
    if (!hasEaten) {
      this.snake.pop();
    }

    // Update HUD
    if (window.uiManager) {
      window.uiManager.updateHUD({
        score: this.score,
        length: this.snake.length,
        combo: this.combo,
        comboPercent: (this.comboTimer / this.comboDuration) * 100,
        highScore: Math.max(this.score, this.highScore),
        activePowerups: this.activePowerups
      });
    }
  }

  activatePowerup(type) {
    if (type === 'star') {
      window.soundEngine.playSuperStar();
      this.combo = 5;
      this.comboTimer = this.comboDuration;
      if (window.uiManager) window.uiManager.showBanner('⭐ SUPER NOVA COMBO x5! ⭐');
    } else if (type === 'shield') {
      window.soundEngine.playPowerup();
      this.activePowerups.shield = true;
      if (window.uiManager) window.uiManager.showBanner('🛡️ KINETIC SHIELD ACTIVATED!');
    } else if (type === 'freeze') {
      window.soundEngine.playPowerup();
      this.activePowerups.freeze = 6000; // 6s
      if (window.uiManager) window.uiManager.showBanner('❄️ CHRONO FREEZE ONLINE!');
    } else if (type === 'magnet') {
      window.soundEngine.playPowerup();
      this.activePowerups.magnet = 7000; // 7s
      if (window.uiManager) window.uiManager.showBanner('🧲 VORTEX MAGNET ACTIVE!');
    } else if (type === 'ghost') {
      window.soundEngine.playPowerup();
      this.activePowerups.ghost = 5500; // 5.5s
      if (window.uiManager) window.uiManager.showBanner('👻 QUANTUM PHASE ENABLED!');
    }
  }

  handleFatalCollision(reason = 'Impact!') {
    // Check if protected by Shield
    if (this.activePowerups.shield) {
      this.activePowerups.shield = false;
      window.soundEngine.playShieldBreak();
      
      const head = this.snake[0];
      window.particleSystem.createBurst(
        head.x * this.tileSize + this.tileSize / 2,
        head.y * this.tileSize + this.tileSize / 2,
        '#00f0ff',
        20,
        4
      );
      if (window.uiManager) window.uiManager.showBanner('🛡️ SHIELD ABSORBED FATAL HIT!');
      return false; // prevented death
    }

    this.gameOver();
    return true; // died
  }

  // --- Skin Colors ---
  getSkinColors() {
    const skinMap = {
      'neon-cyan': { head: '#00f0ff', bodyStart: '#00d4ff', bodyEnd: '#0055ff', eye: '#ffffff', glow: '#00f0ff' },
      'matrix-green': { head: '#00ff66', bodyStart: '#00e65c', bodyEnd: '#006622', eye: '#ffffff', glow: '#00ff66' },
      'laser-pink': { head: '#ff007f', bodyStart: '#ff00aa', bodyEnd: '#7a0099', eye: '#ffffff', glow: '#ff007f' },
      'solar-gold': { head: '#ffe600', bodyStart: '#ffaa00', bodyEnd: '#ff3300', eye: '#ffffff', glow: '#ffaa00' },
      'plasma-purple': { head: '#b366ff', bodyStart: '#8c1aff', bodyEnd: '#330066', eye: '#ffffff', glow: '#b366ff' },
      'rainbow-prism': { head: '#ffffff', bodyStart: '#00f0ff', bodyEnd: '#ff007f', eye: '#000000', glow: '#00f0ff', isChroma: true }
    };
    return skinMap[this.skin] || skinMap['neon-cyan'];
  }

  // --- Rendering ---
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw subtle arena grid background
    this.drawGrid();

    // 2. Draw Portals
    if (this.mode === 'portals') {
      this.drawPortals();
    }

    // 3. Draw Obstacles
    if (this.mode === 'obstacles') {
      this.drawObstacles();
    }

    // 4. Draw Food & Special Items
    this.drawItems();

    // 5. Draw Snake
    this.drawSnake();

    // 6. Draw Particles & Floating texts
    window.particleSystem.render(this.ctx);

    // 7. Draw Active Aura / Screen Borders (Freeze, Ghost, Shield)
    this.drawStatusAuras();
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.canvas.width; x += this.tileSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.canvas.height; y += this.tileSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawPortals() {
    this.ctx.save();
    this.portals.forEach(p => {
      const cx = p.x * this.tileSize + this.tileSize / 2;
      const cy = p.y * this.tileSize + this.tileSize / 2;
      const pulse = Math.sin(this.animTime * 0.005 + p.id) * 3;

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.tileSize * 0.45 + pulse, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = 0.25;
      this.ctx.fill();

      this.ctx.strokeStyle = p.color;
      this.ctx.globalAlpha = 0.85;
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = p.color;
      this.ctx.stroke();

      // Inner Swirl
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.tileSize * 0.2, this.animTime * 0.004, this.animTime * 0.004 + Math.PI);
      this.ctx.stroke();
    });
    this.ctx.restore();
  }

  drawObstacles() {
    this.ctx.save();
    this.obstacles.forEach(o => {
      const px = o.x * this.tileSize;
      const py = o.y * this.tileSize;
      const pad = 2;

      this.ctx.fillStyle = 'rgba(255, 42, 95, 0.25)';
      this.ctx.strokeStyle = '#ff2a5f';
      this.ctx.lineWidth = 1.5;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#ff2a5f';

      this.ctx.fillRect(px + pad, py + pad, this.tileSize - pad * 2, this.tileSize - pad * 2);
      this.ctx.strokeRect(px + pad, py + pad, this.tileSize - pad * 2, this.tileSize - pad * 2);

      // Cyber hazard warning cross
      this.ctx.beginPath();
      this.ctx.moveTo(px + pad + 3, py + pad + 3);
      this.ctx.lineTo(px + this.tileSize - pad - 3, py + this.tileSize - pad - 3);
      this.ctx.moveTo(px + this.tileSize - pad - 3, py + pad + 3);
      this.ctx.lineTo(px + pad + 3, py + this.tileSize - pad - 3);
      this.ctx.stroke();
    });
    this.ctx.restore();
  }

  drawItems() {
    this.ctx.save();

    // Regular Energy Core (Apple)
    if (this.food) {
      const cx = this.food.x * this.tileSize + this.tileSize / 2;
      const cy = this.food.y * this.tileSize + this.tileSize / 2;
      const pulse = Math.sin(this.animTime * 0.008) * 2;

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.tileSize * 0.35 + pulse, 0, Math.PI * 2);
      this.ctx.fillStyle = this.food.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = this.food.glow;
      this.ctx.fill();

      // Inner Core Glow
      this.ctx.beginPath();
      this.ctx.arc(cx - 2, cy - 2, this.tileSize * 0.12, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
    }

    // Special Item
    if (this.specialItem) {
      const cx = this.specialItem.x * this.tileSize + this.tileSize / 2;
      const cy = this.specialItem.y * this.tileSize + this.tileSize / 2;
      const bounce = Math.sin(this.animTime * 0.01) * 3;

      // Rotating glow ring
      this.ctx.save();
      this.ctx.translate(cx, cy + bounce);
      this.ctx.rotate(this.animTime * 0.003);

      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.tileSize * 0.42, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.specialItem.color;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.shadowBlur = 16;
      this.ctx.shadowColor = this.specialItem.color;
      this.ctx.stroke();
      this.ctx.restore();

      // Icon
      this.ctx.font = `${Math.round(this.tileSize * 0.65)}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.specialItem.icon, cx, cy + bounce);
    }

    this.ctx.restore();
  }

  drawSnake() {
    if (this.snake.length === 0) return;

    this.ctx.save();
    const skin = this.getSkinColors();
    const isGhost = this.activePowerups.ghost > 0;
    const isShielded = this.activePowerups.shield;

    // Body segments
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const seg = this.snake[i];
      const cx = seg.x * this.tileSize + this.tileSize / 2;
      const cy = seg.y * this.tileSize + this.tileSize / 2;
      const isHead = i === 0;

      const progress = i / this.snake.length;
      let segColor;

      if (skin.isChroma) {
        // Dynamic rainbow chroma cycling along body
        const hue = (this.animTime * 0.15 + i * 15) % 360;
        segColor = `hsl(${hue}, 100%, 55%)`;
      } else {
        segColor = isHead ? skin.head : skin.bodyStart;
      }

      this.ctx.globalAlpha = isGhost ? 0.45 : 1.0;
      this.ctx.shadowBlur = isHead ? 16 : 8;
      this.ctx.shadowColor = skin.glow;
      this.ctx.fillStyle = segColor;

      const radius = isHead 
        ? this.tileSize * 0.46 
        : this.tileSize * (0.42 - progress * 0.12);

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, Math.max(3, radius), 0, Math.PI * 2);
      this.ctx.fill();

      // Connect segment with previous segment for smooth continuous body look
      if (i > 0) {
        const nextSeg = this.snake[i - 1];
        // Only connect if adjacent (not wrapping over edge)
        if (Math.abs(seg.x - nextSeg.x) <= 1 && Math.abs(seg.y - nextSeg.y) <= 1) {
          const ncx = nextSeg.x * this.tileSize + this.tileSize / 2;
          const ncy = nextSeg.y * this.tileSize + this.tileSize / 2;
          this.ctx.lineWidth = radius * 1.7;
          this.ctx.strokeStyle = segColor;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(cx, cy);
          this.ctx.lineTo(ncx, ncy);
          this.ctx.stroke();
        }
      }

      // Draw Head Details (Eyes & Shield Aura)
      if (isHead) {
        this.drawHeadDetails(cx, cy, radius, skin);
      }
    }

    this.ctx.restore();
  }

  drawHeadDetails(cx, cy, radius, skin) {
    const dir = this.direction;
    const eyeOffset = radius * 0.48;
    const eyeForward = radius * 0.35;

    // Normal vector perpendicular to movement
    const perpX = -dir.y;
    const perpY = dir.x;

    const leftEyeX = cx + dir.x * eyeForward + perpX * eyeOffset;
    const leftEyeY = cy + dir.y * eyeForward + perpY * eyeOffset;

    const rightEyeX = cx + dir.x * eyeForward - perpX * eyeOffset;
    const rightEyeY = cy + dir.y * eyeForward - perpY * eyeOffset;

    // Eyes
    this.ctx.fillStyle = skin.eye;
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = skin.eye;

    const eyeRadius = radius * 0.24;
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
    this.ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Pupils
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX + dir.x * 1.5, leftEyeY + dir.y * 1.5, eyeRadius * 0.55, 0, Math.PI * 2);
    this.ctx.arc(rightEyeX + dir.x * 1.5, rightEyeY + dir.y * 1.5, eyeRadius * 0.55, 0, Math.PI * 2);
    this.ctx.fill();

    // Shield Aura if active
    if (this.activePowerups.shield) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#00f0ff';
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = '#00f0ff';
      this.ctx.stroke();
    }
  }

  drawStatusAuras() {
    // Chrono freeze border glow
    if (this.activePowerups.freeze > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(128, 212, 255, 0.4)';
      this.ctx.lineWidth = 6;
      this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
    // Ghost phase border glow
    if (this.activePowerups.ghost > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(179, 102, 255, 0.4)';
      this.ctx.lineWidth = 6;
      this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }

  // --- Main Animation Frame Loop ---
  loop(timestamp) {
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.animTime += deltaTime;

    // Simulation step
    this.update(deltaTime);

    // Render step
    this.render();

    // Update particles physics continuous
    window.particleSystem.update();

    requestAnimationFrame(this.loop);
  }
}

window.snakeGame = new SnakeGame();
