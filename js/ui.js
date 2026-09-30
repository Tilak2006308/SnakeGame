/**
 * NEON VIPER — UI, Events & Achievement Management
 * Handles controls, overlays, modals, achievements, telemetry, and animations.
 */
class UIManager {
  constructor() {
    this.game = window.snakeGame;
    this.sound = window.soundEngine;

    // Theme list
    this.themes = ['cyberpunk', 'matrix', 'synthwave', 'solar', 'retro'];
    this.currentThemeIndex = 0;

    // DOM Elements
    this.hudScore = document.getElementById('hud-score');
    this.hudCombo = document.getElementById('hud-combo');
    this.comboFill = document.getElementById('combo-fill');
    this.hudLength = document.getElementById('hud-length');
    this.hudHighscore = document.getElementById('hud-highscore');
    this.floatingBanner = document.getElementById('floating-banner');
    this.activePowerupsList = document.getElementById('active-powerups-list');

    // Overlays
    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');

    // Game Over stats elements
    this.goScore = document.getElementById('go-final-score');
    this.goLength = document.getElementById('go-final-length');
    this.goOrbs = document.getElementById('go-final-orbs');
    this.goCombo = document.getElementById('go-final-combo');
    this.goRecordBadge = document.getElementById('new-highscore-badge');

    // Modals
    this.statsModal = document.getElementById('stats-modal');
    this.helpModal = document.getElementById('help-modal');

    // Telemetry & Achievements Data
    this.achievements = [
      { id: 'first_core', title: 'Energy Initiate', desc: 'Consume your first Energy Core', icon: '⚡', check: s => s.totalOrbs >= 1 },
      { id: 'centipede', title: 'Cyber Centipede', desc: 'Reach a Viper length of 20 segments', icon: '🐍', check: s => s.maxLength >= 20 },
      { id: 'leviathan', title: 'Neon Leviathan', desc: 'Reach a Viper length of 40 segments', icon: '🐉', check: s => s.maxLength >= 40 },
      { id: 'combo_master', title: 'Hyper Flow', desc: 'Reach maximum x5 Combo Multiplier', icon: '🔥', check: s => s.maxCombo >= 5 },
      { id: 'score_500', title: 'High Roller', desc: 'Score over 500 points in a single run', icon: '🏅', check: s => s.highScore >= 500 },
      { id: 'score_1500', title: 'Matrix God', desc: 'Score over 1,500 points in a single run', icon: '👑', check: s => s.highScore >= 1500 },
      { id: 'veteran', title: 'Grid Veteran', desc: 'Complete 10 total game runs', icon: '🎖️', check: s => s.totalGames >= 10 }
    ];

    this.stats = this.loadStats();

    this.initEventListeners();
    this.initTouchControls();
    this.initTheme();
    this.renderAchievements();
    this.updateHUDInitial();
  }

  // --- Statistics Persistence ---
  loadStats() {
    const defaultStats = {
      highScore: 0,
      totalGames: 0,
      totalOrbs: 0,
      maxLength: 3,
      maxCombo: 1,
      unlockedAchievements: []
    };
    try {
      const data = localStorage.getItem('neon_snake_stats');
      return data ? Object.assign(defaultStats, JSON.parse(data)) : defaultStats;
    } catch (e) {
      return defaultStats;
    }
  }

  saveStats() {
    localStorage.setItem('neon_snake_stats', JSON.stringify(this.stats));
  }

  recordRunStats(runData) {
    this.stats.totalGames++;
    this.stats.totalOrbs += runData.orbs;
    if (runData.score > this.stats.highScore) this.stats.highScore = runData.score;
    if (runData.length > this.stats.maxLength) this.stats.maxLength = runData.length;
    if (runData.maxCombo > this.stats.maxCombo) this.stats.maxCombo = runData.maxCombo;

    this.checkAchievements();
    this.saveStats();
  }

  checkAchievements() {
    let newlyUnlocked = false;
    this.achievements.forEach(ach => {
      if (!this.stats.unlockedAchievements.includes(ach.id)) {
        if (ach.check(this.stats)) {
          this.stats.unlockedAchievements.push(ach.id);
          newlyUnlocked = true;
          this.showBanner(`🏆 ACHIEVEMENT: ${ach.title}!`);
          this.sound.playSuperStar();
        }
      }
    });
    if (newlyUnlocked) {
      this.renderAchievements();
    }
  }

  // --- Event Listeners Setup ---
  initEventListeners() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault(); // Prevent page scrolling
      }

      // Handle Directional Keys
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.game.queueDirection({ x: 0, y: -1 });
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.game.queueDirection({ x: 0, y: 1 });
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.game.queueDirection({ x: -1, y: 0 });
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.game.queueDirection({ x: 1, y: 0 });
      }

      // Turbo Speed Boost (Shift)
      if (e.key === 'Shift') {
        this.game.setTurbo(true);
      }

      // Space / Pause
      if (e.key === ' ' || e.code === 'Space') {
        if (this.game.state === 'READY' || this.game.state === 'GAMEOVER') {
          this.startGame();
        } else {
          this.game.togglePause();
        }
      }

      // Quick Restart (R)
      if (e.key === 'r' || e.key === 'R') {
        if (this.game.state !== 'READY') {
          this.startGame();
        }
      }

      // Enter to start
      if (e.key === 'Enter') {
        if (this.game.state === 'READY' || this.game.state === 'GAMEOVER') {
          this.startGame();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.game.setTurbo(false);
      }
    });

    // Start / Restart Buttons
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());
    document.getElementById('btn-play-again').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume-game').addEventListener('click', () => this.game.resume());
    document.getElementById('btn-restart-from-pause').addEventListener('click', () => this.startGame());

    // Mobile D-Pad Buttons
    const bindDpad = (id, dir) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const handler = (e) => {
        e.preventDefault();
        this.sound.playClick();
        if (this.game.state === 'READY' || this.game.state === 'GAMEOVER') {
          this.startGame();
        }
        this.game.queueDirection(dir);
      };
      btn.addEventListener('touchstart', handler, { passive: false });
      btn.addEventListener('mousedown', handler);
    };

    bindDpad('dpad-up', { x: 0, y: -1 });
    bindDpad('dpad-down', { x: 0, y: 1 });
    bindDpad('dpad-left', { x: -1, y: 0 });
    bindDpad('dpad-right', { x: 1, y: 0 });

    // Mobile Pause & Turbo Buttons
    const btnMobPause = document.getElementById('btn-mobile-pause');
    if (btnMobPause) {
      btnMobPause.addEventListener('click', () => {
        this.sound.playClick();
        this.game.togglePause();
      });
    }

    const btnMobBoost = document.getElementById('btn-mobile-boost');
    if (btnMobBoost) {
      const boostStart = (e) => { e.preventDefault(); this.game.setTurbo(true); };
      const boostEnd = (e) => { e.preventDefault(); this.game.setTurbo(false); };
      btnMobBoost.addEventListener('touchstart', boostStart, { passive: false });
      btnMobBoost.addEventListener('touchend', boostEnd);
      btnMobBoost.addEventListener('mousedown', boostStart);
      btnMobBoost.addEventListener('mouseup', boostEnd);
      btnMobBoost.addEventListener('mouseleave', boostEnd);
    }

    // Header Controls (Theme, Sound, Music, Modals)
    document.getElementById('btn-theme-toggle').addEventListener('click', () => this.cycleTheme());
    
    const btnSound = document.getElementById('btn-sound-toggle');
    btnSound.addEventListener('click', () => {
      const isSound = this.sound.toggleSound();
      btnSound.classList.toggle('active', isSound);
      btnSound.querySelector('.sound-on').classList.toggle('hidden', !isSound);
      btnSound.querySelector('.sound-off').classList.toggle('hidden', isSound);
    });

    const btnMusic = document.getElementById('btn-music-toggle');
    btnMusic.addEventListener('click', () => {
      const isMusic = this.sound.toggleMusic();
      btnMusic.classList.toggle('active', isMusic);
      btnMusic.querySelector('.music-indicator').textContent = isMusic ? 'BGM: ON' : 'BGM: OFF';
    });

    // Modals Trigger
    document.getElementById('btn-stats-modal').addEventListener('click', () => {
      this.sound.playClick();
      this.updateStatsModal();
      this.statsModal.classList.remove('hidden');
      if (this.game.state === 'PLAYING') this.game.pause();
    });

    document.getElementById('btn-close-stats').addEventListener('click', () => {
      this.statsModal.classList.add('hidden');
    });

    document.getElementById('btn-help-modal').addEventListener('click', () => {
      this.sound.playClick();
      this.helpModal.classList.remove('hidden');
      if (this.game.state === 'PLAYING') this.game.pause();
    });

    document.getElementById('btn-close-help').addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
    });

    // Reset Stats
    document.getElementById('btn-reset-stats').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all telemetry and unlocked achievements?')) {
        this.stats = {
          highScore: 0,
          totalGames: 0,
          totalOrbs: 0,
          maxLength: 3,
          maxCombo: 1,
          unlockedAchievements: []
        };
        this.saveStats();
        this.game.highScore = 0;
        localStorage.setItem('neon_snake_highscore', 0);
        this.updateStatsModal();
        this.renderAchievements();
        this.updateHUDInitial();
      }
    });

    // Game Mode Selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.mode = btn.getAttribute('data-mode');
        if (this.game.state === 'PLAYING') this.startGame();
      });
    });

    // Difficulty Selection
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.difficulty = btn.getAttribute('data-diff');
        this.game.baseStepInterval = this.game.speedMap[this.game.difficulty];
      });
    });

    // Wall Pass Toggle
    const wallToggle = document.getElementById('toggle-pass-walls');
    if (wallToggle) {
      wallToggle.addEventListener('change', (e) => {
        this.sound.playClick();
        this.game.passThroughWalls = e.target.checked;
      });
    }

    // Snake Skin Selection
    document.querySelectorAll('.skin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.skin = btn.getAttribute('data-skin');
        localStorage.setItem('neon_snake_skin', this.game.skin);
      });
    });

    // Restore Saved Skin if present
    const savedSkin = localStorage.getItem('neon_snake_skin');
    if (savedSkin) {
      const matchBtn = document.querySelector(`.skin-btn[data-skin="${savedSkin}"]`);
      if (matchBtn) matchBtn.click();
    }
  }

  // --- Touch Swipe Gestures ---
  initTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    const canvasWrapper = document.getElementById('canvas-wrapper');

    canvasWrapper.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    canvasWrapper.addEventListener('touchend', (e) => {
      const diffX = e.changedTouches[0].screenX - touchStartX;
      const diffY = e.changedTouches[0].screenY - touchStartY;
      const minThreshold = 25; // minimum swipe distance

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minThreshold) {
        // Horizontal Swipe
        if (diffX > 0) this.game.queueDirection({ x: 1, y: 0 });
        else this.game.queueDirection({ x: -1, y: 0 });
      } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > minThreshold) {
        // Vertical Swipe
        if (diffY > 0) this.game.queueDirection({ x: 0, y: 1 });
        else this.game.queueDirection({ x: 0, y: -1 });
      }
    }, { passive: true });
  }

  // --- Theme Management ---
  initTheme() {
    const savedTheme = localStorage.getItem('neon_snake_theme') || 'cyberpunk';
    this.currentThemeIndex = this.themes.indexOf(savedTheme);
    if (this.currentThemeIndex === -1) this.currentThemeIndex = 0;
    this.applyTheme(this.themes[this.currentThemeIndex]);
  }

  cycleTheme() {
    this.sound.playClick();
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
    const theme = this.themes[this.currentThemeIndex];
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('neon_snake_theme', theme);
    const themeNameMap = {
      cyberpunk: 'Cyberpunk',
      matrix: 'Matrix',
      synthwave: 'Synthwave',
      solar: 'Solar Blaze',
      retro: 'Retro GB'
    };
    const label = document.getElementById('current-theme-name');
    if (label) label.textContent = themeNameMap[theme] || theme;
  }

  // --- Game Flow UI ---
  startGame() {
    this.sound.playClick();
    this.startOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.game.start();
  }

  onGameStart() {
    this.startOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
  }

  showPauseOverlay(show) {
    this.pauseOverlay.classList.toggle('hidden', !show);
  }

  showGameOverOverlay(show, stats) {
    if (show && stats) {
      this.goScore.textContent = stats.score.toLocaleString();
      this.goLength.textContent = stats.length;
      this.goOrbs.textContent = stats.orbs;
      this.goCombo.textContent = `x${stats.maxCombo}`;
      this.goRecordBadge.classList.toggle('hidden', !stats.isNewHigh);
      this.hudHighscore.textContent = String(Math.max(stats.score, this.game.highScore)).padStart(4, '0');
    }
    this.gameoverOverlay.classList.toggle('hidden', !show);
  }

  // --- HUD Updates ---
  updateHUDInitial() {
    this.hudScore.textContent = '0000';
    this.hudCombo.textContent = 'x1';
    this.comboFill.style.width = '0%';
    this.hudLength.textContent = '3';
    this.hudHighscore.textContent = String(Math.max(this.stats.highScore, this.game.highScore)).padStart(4, '0');
  }

  updateHUD(data) {
    this.hudScore.textContent = String(data.score).padStart(4, '0');
    this.hudCombo.textContent = `x${data.combo}`;
    this.comboFill.style.width = `${Math.max(0, Math.min(100, data.comboPercent))}%`;
    this.hudLength.textContent = data.length;
    this.hudHighscore.textContent = String(data.highScore).padStart(4, '0');

    this.updateActivePowerupsUI(data.activePowerups);
  }

  updateActivePowerupsUI(powerups) {
    if (!this.activePowerupsList) return;

    const activeList = [];
    if (powerups.shield) {
      activeList.push({ name: 'Kinetic Shield', icon: '🛡️', percent: 100 });
    }
    if (powerups.freeze > 0) {
      activeList.push({ name: 'Chrono Freeze', icon: '❄️', percent: (powerups.freeze / 6000) * 100 });
    }
    if (powerups.magnet > 0) {
      activeList.push({ name: 'Vortex Magnet', icon: '🧲', percent: (powerups.magnet / 7000) * 100 });
    }
    if (powerups.ghost > 0) {
      activeList.push({ name: 'Quantum Ghost', icon: '👻', percent: (powerups.ghost / 5500) * 100 });
    }

    if (activeList.length === 0) {
      this.activePowerupsList.innerHTML = '<div class="no-boosts-msg">No active power-ups</div>';
      return;
    }

    this.activePowerupsList.innerHTML = activeList.map(item => `
      <div class="boost-item">
        <div class="boost-info">
          <span>${item.icon}</span>
          <span>${item.name}</span>
        </div>
        <div class="boost-timer-bar">
          <div class="boost-timer-fill" style="width: ${item.percent}%"></div>
        </div>
      </div>
    `).join('');
  }

  // --- In-Game Banner Alerts ---
  showBanner(msg, duration = 2200) {
    if (!this.floatingBanner) return;
    this.floatingBanner.textContent = msg;
    this.floatingBanner.classList.remove('hidden');

    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.floatingBanner.classList.add('hidden');
    }, duration);
  }

  // --- Telemetry & Achievements Render ---
  updateStatsModal() {
    document.getElementById('stat-high-score').textContent = this.stats.highScore.toLocaleString();
    document.getElementById('stat-total-games').textContent = this.stats.totalGames.toLocaleString();
    document.getElementById('stat-total-orbs').textContent = this.stats.totalOrbs.toLocaleString();
    document.getElementById('stat-max-length').textContent = this.stats.maxLength.toLocaleString();
    this.renderAchievements();
  }

  renderAchievements() {
    const list = document.getElementById('achievements-list');
    if (!list) return;

    list.innerHTML = this.achievements.map(ach => {
      const isUnlocked = this.stats.unlockedAchievements.includes(ach.id);
      return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
          <span class="ach-icon">${ach.icon}</span>
          <div class="ach-info">
            <span class="ach-title">${ach.title} ${isUnlocked ? '✓' : ''}</span>
            <span class="ach-desc">${ach.desc}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.uiManager = new UIManager();
});
