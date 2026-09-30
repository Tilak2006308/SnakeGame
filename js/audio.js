/**
 * NEON VIPER — Procedural Web Audio API Synthesizer
 * High-fidelity retro chiptune sounds & procedural synthwave BGM
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.musicEnabled = false;
    this.bgmOscs = [];
    this.bgmInterval = null;
    this.musicStep = 0;
    this.masterGain = null;

    // Load saved preferences
    const savedSound = localStorage.getItem('neon_snake_sound');
    if (savedSound !== null) this.soundEnabled = savedSound === 'true';

    const savedMusic = localStorage.getItem('neon_snake_music');
    if (savedMusic !== null) this.musicEnabled = savedMusic === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('neon_snake_sound', this.soundEnabled);
    return this.soundEnabled;
  }

  toggleMusic() {
    this.init();
    this.musicEnabled = !this.musicEnabled;
    localStorage.setItem('neon_snake_music', this.musicEnabled);
    if (this.musicEnabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.musicEnabled;
  }

  // --- Sound Effects ---

  // Standard Food Eat
  playEat() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Combo Chime (Ascending pitch with combo level)
  playCombo(level = 1) {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const baseFreq = 440 * Math.pow(1.2, Math.min(level, 6));

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Golden Star / Super Nova Sound
  playSuperStar() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  // Power-up activation (Shield, Magnet, Ghost, Freeze)
  playPowerup() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.2);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Shield Break / Deflect hit
  playShieldBreak() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Portal Teleportation Whoosh
  playPortal() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.18);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Game Over Crash Sound
  playDie() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    
    // Low noise thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.45);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  // UI Button Click
  playClick() {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.04);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // --- Procedural Synthwave Bassline & Arp Loop ---
  startBGM() {
    if (this.bgmInterval) clearInterval(this.bgmInterval);
    if (!this.musicEnabled || !this.ctx) return;

    // Synthwave 80s chord progression (Am, F, C, G)
    const bassline = [
      110, 110, 110, 164.8, 110, 110, 130.8, 110, // A2, E3, C3
      87.3, 87.3, 87.3, 130.8, 87.3, 87.3, 174.6, 87.3, // F2, C3, F3
      130.8, 130.8, 130.8, 196.0, 130.8, 130.8, 164.8, 130.8, // C3, G3, E3
      98.0, 98.0, 98.0, 146.8, 98.0, 98.0, 196.0, 98.0  // G2, D3, G3
    ];

    const leadArp = [
      440, 523.25, 659.25, 880, 659.25, 523.25,
      349.23, 440, 523.25, 698.46, 523.25, 440,
      523.25, 659.25, 783.99, 1046.5, 783.99, 659.25,
      392.0, 493.88, 587.33, 783.99, 587.33, 493.88
    ];

    this.musicStep = 0;
    this.bgmInterval = setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;

      // Bass note
      const bassFreq = bassline[this.musicStep % bassline.length];
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'sawtooth';
      bOsc.frequency.setValueAtTime(bassFreq, t);

      bGain.gain.setValueAtTime(0.06, t);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      bOsc.connect(bGain);
      bGain.connect(this.masterGain);
      bOsc.start(t);
      bOsc.stop(t + 0.13);

      // Lead arp note on every second step
      if (this.musicStep % 2 === 0) {
        const leadFreq = leadArp[(this.musicStep / 2) % leadArp.length];
        const lOsc = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lOsc.type = 'triangle';
        lOsc.frequency.setValueAtTime(leadFreq, t);

        lGain.gain.setValueAtTime(0.04, t);
        lGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        lOsc.connect(lGain);
        lGain.connect(this.masterGain);
        lOsc.start(t);
        lOsc.stop(t + 0.22);
      }

      this.musicStep++;
    }, 130);
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

window.soundEngine = new SoundEngine();
