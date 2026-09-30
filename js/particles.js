/**
 * NEON VIPER — Particle & Visual FX System
 * High performance 60fps particle physics and floating score popups
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  // Clear all active particles
  reset() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  // Create explosion particles when eating food / collecting power-up
  createBurst(x, y, color = '#00f0ff', count = 18, speed = 4) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const velocity = (Math.random() * 0.7 + 0.5) * speed;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 3 + 2,
        color: color,
        alpha: 1.0,
        decay: Math.random() * 0.025 + 0.02,
        shape: Math.random() > 0.5 ? 'circle' : 'square',
        spin: (Math.random() - 0.5) * 0.2,
        angle: Math.random() * Math.PI * 2
      });
    }

    // Add an expanding shockwave ring
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 4,
      maxRadius: 36,
      color: color,
      alpha: 0.8,
      speed: 2.2
    });
  }

  // Create snake body trail dust/glow
  createTrail(x, y, color = '#00f0ff') {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2.5 + 1.5,
      color: color,
      alpha: 0.6,
      decay: 0.04,
      shape: 'circle'
    });
  }

  // Snake death disintegration into matrix shards
  createDeathShards(snakeSegments, color = '#ff007f') {
    snakeSegments.forEach((seg, idx) => {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 4 + 1;
        this.particles.push({
          x: seg.x,
          y: seg.y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size: Math.random() * 4 + 2,
          color: color,
          alpha: 1.0,
          decay: Math.random() * 0.015 + 0.01,
          shape: 'shard',
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.3
        });
      }
    });
  }

  // Add floating text that floats up & fades (+10, +50, COMBO x2)
  addFloatingText(text, x, y, color = '#ffffff', fontSize = 14) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -1.2,
      alpha: 1.0,
      color: color,
      fontSize: fontSize,
      scale: 1.2
    });
  }

  // Update physics for all active particles
  update() {
    // 1. Update standard particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96; // friction
      p.vy *= 0.96;
      p.alpha -= p.decay;
      if (p.angle !== undefined) p.angle += p.spin || 0;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.vy *= 0.95;
      ft.alpha -= 0.022;
      if (ft.scale > 1.0) ft.scale -= 0.02;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Render everything onto canvas context
  render(ctx) {
    ctx.save();

    // Render Shockwaves
    this.shockwaves.forEach(sw => {
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = sw.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = sw.color;
      ctx.stroke();
    });

    // Render Particles
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'shard') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(0, p.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    });

    // Render Floating Text
    this.floatingTexts.forEach(ft => {
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `800 ${Math.round(ft.fontSize * ft.scale)}px 'Orbitron', sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 12;
      ctx.shadowColor = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    });

    ctx.restore();
  }
}

window.particleSystem = new ParticleSystem();
