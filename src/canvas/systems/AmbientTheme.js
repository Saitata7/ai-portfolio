/* ─── AMBIENT THEME ───
   Time-of-day atmospheric effects drawn on canvas.
   Sun and moon arc across the sky based on real local time.
   Agents work 24/7 — the sky proves it.
   ───────────────────── */

export default class AmbientTheme {
  constructor() {
    this._refreshTime();
    this.hourCheckTimer = 0;

    // Stars (pre-generated for night/evening)
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.55,
        r: Math.random() * 1.5 + 0.3,
        twinkleSpeed: 1 + Math.random() * 3,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    // Clouds
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random(),
        y: 0.08 + Math.random() * 0.25,
        w: 80 + Math.random() * 120,
        h: 25 + Math.random() * 20,
        speed: 0.002 + Math.random() * 0.003,
        opacity: 0.03 + Math.random() * 0.04,
      });
    }

    // Rain state
    this.isRaining = false;
    this.rainTimer = 30 + Math.random() * 120;
    this.rainDrops = [];
    this.rainIntensity = 0;

    // Moon phase (rough, based on day of month)
    this.moonPhase = (new Date().getDate() % 30) / 30;
  }

  /* ─── TIME MATH ─── */

  _refreshTime() {
    const now = new Date();
    this.hour = now.getHours();
    this.minute = now.getMinutes();
    // Fractional hour: 14:30 → 14.5
    this.timeF = this.hour + this.minute / 60;
    this.period = this._getPeriod(this.hour);
  }

  _getPeriod(hour) {
    if (hour >= 6 && hour <= 11) return 'morning';
    if (hour >= 12 && hour <= 16) return 'afternoon';
    if (hour >= 17 && hour <= 20) return 'evening';
    return 'night';
  }

  // Sun arc: rises 6am (left horizon), peaks noon (top center), sets 6pm (right horizon)
  // Returns { x: 0-1, y: 0-1 } in normalized screen coords
  _getSunPos() {
    // Sun visible roughly 6:00 → 18:00
    // Map 6→0, 12→0.5, 18→1 for the arc parameter
    const t = (this.timeF - 6) / 12; // 0 at 6am, 1 at 6pm
    const clamped = Math.max(0, Math.min(1, t));
    // x: left (0.1) to right (0.9)
    const x = 0.1 + clamped * 0.8;
    // y: parabolic arc — lowest at edges (horizon), highest at center (noon)
    // sin gives a nice smooth arc: 0→0 at edges, 1 at center
    const arc = Math.sin(clamped * Math.PI);
    // y goes from 0.88 (horizon) to 0.08 (zenith)
    const y = 0.88 - arc * 0.8;
    return { x, y };
  }

  // Moon arc: rises ~19:00, peaks ~1am, sets ~5:00
  _getMoonPos() {
    // Moon visible roughly 19:00 → 5:00 (10 hour window)
    let moonHour = this.timeF;
    if (moonHour >= 19) moonHour -= 19;       // 19→0, 24→5
    else if (moonHour < 5) moonHour += 5;      // 0→5, 5→10
    else return { x: -1, y: -1, visible: false }; // moon below horizon

    const t = moonHour / 10; // 0→1 across the night
    const clamped = Math.max(0, Math.min(1, t));
    const x = 0.1 + clamped * 0.8;
    const arc = Math.sin(clamped * Math.PI);
    const y = 0.85 - arc * 0.75;
    return { x, y, visible: true };
  }

  // How much "sun influence" is there? 1 at noon, 0 at night
  _getSunInfluence() {
    if (this.timeF >= 6 && this.timeF <= 18) {
      const t = (this.timeF - 6) / 12;
      return Math.sin(t * Math.PI); // 0→1→0
    }
    return 0;
  }

  // How dark is it? 1 at midnight, 0 at noon
  _getNightStrength() {
    return 1 - this._getSunInfluence();
  }

  update(dt) {
    // Re-check time every 10 seconds (for smooth sun/moon movement)
    this.hourCheckTimer += dt;
    if (this.hourCheckTimer > 10) {
      this.hourCheckTimer = 0;
      this._refreshTime();
    }

    // Rain cycle
    this.rainTimer -= dt;
    if (this.rainTimer <= 0) {
      this.isRaining = !this.isRaining;
      this.rainTimer = this.isRaining
        ? 15 + Math.random() * 30
        : 60 + Math.random() * 180;
    }

    const targetRain = this.isRaining ? 1 : 0;
    this.rainIntensity += (targetRain - this.rainIntensity) * dt * 0.5;

    // Drift clouds
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > 1.3) c.x = -0.3;
    }

    // Rain drops
    if (this.rainIntensity > 0.05) {
      const spawnRate = Math.floor(this.rainIntensity * 3);
      for (let i = 0; i < spawnRate; i++) {
        if (this.rainDrops.length < 100) {
          this.rainDrops.push({
            x: Math.random(),
            y: -0.02,
            speed: 0.8 + Math.random() * 0.4,
            length: 8 + Math.random() * 12,
          });
        }
      }
      for (const d of this.rainDrops) d.y += d.speed * dt;
      this.rainDrops = this.rainDrops.filter(d => d.y < 1.1);
    } else {
      this.rainDrops = [];
    }
  }

  draw(ctx, W, H, time) {
    // Sky gradient — blended based on continuous time, not discrete periods
    this._drawSky(ctx, W, H);

    // Stars — fade in as night strength increases
    const night = this._getNightStrength();
    if (night > 0.15) {
      this._drawStars(ctx, W, H, time, night);
    }

    // Sun — visible during day
    const sunInf = this._getSunInfluence();
    if (sunInf > 0.02) {
      this._drawSun(ctx, W, H, sunInf);
    }

    // Moon — visible at night
    this._drawMoon(ctx, W, H, night);

    // Clouds (all periods)
    this._drawClouds(ctx, W, H);

    // Rain
    if (this.rainIntensity > 0.05) {
      this._drawRain(ctx, W, H);
    }
  }

  /* ─── SKY ─── */

  _drawSky(ctx, W, H) {
    const t = this.timeF;
    const grad = ctx.createLinearGradient(0, 0, 0, H);

    if (t >= 6 && t < 9) {
      // Sunrise → morning
      const f = (t - 6) / 3; // 0→1
      grad.addColorStop(0, this._lerp('rgba(15,10,30,0.8)', 'rgba(20,25,55,0.65)', f));
      grad.addColorStop(0.4, this._lerp('rgba(60,25,45,0.4)', 'rgba(30,35,60,0.3)', f));
      grad.addColorStop(0.7, this._lerp('rgba(130,60,25,0.25)', 'rgba(20,25,45,0.2)', f));
      grad.addColorStop(1, this._lerp('rgba(180,90,35,0.2)', 'rgba(15,20,40,0.15)', f));
    } else if (t >= 9 && t < 17) {
      // Day
      grad.addColorStop(0, 'rgba(15,25,60,0.6)');
      grad.addColorStop(0.5, 'rgba(20,30,55,0.3)');
      grad.addColorStop(1, 'rgba(10,15,35,0.2)');
    } else if (t >= 17 && t < 20) {
      // Sunset
      const f = (t - 17) / 3; // 0→1
      grad.addColorStop(0, this._lerp('rgba(20,20,55,0.65)', 'rgba(10,8,25,0.7)', f));
      grad.addColorStop(0.3, this._lerp('rgba(80,20,55,0.35)', 'rgba(20,12,35,0.3)', f));
      grad.addColorStop(0.6, this._lerp('rgba(140,50,25,0.25)', 'rgba(10,8,20,0.2)', f));
      grad.addColorStop(1, this._lerp('rgba(100,30,15,0.2)', 'rgba(5,5,15,0.15)', f));
    } else {
      // Night
      grad.addColorStop(0, 'rgba(5,8,20,0.5)');
      grad.addColorStop(0.5, 'rgba(8,12,25,0.3)');
      grad.addColorStop(1, 'rgba(5,8,15,0.2)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Simple RGBA string lerp
  _lerp(c1, c2, f) {
    const p = (s) => s.match(/[\d.]+/g).map(Number);
    const a = p(c1), b = p(c2);
    const r = a.map((v, i) => Math.round(v + (b[i] - v) * f));
    return `rgba(${r[0]},${r[1]},${r[2]},${r[3]})`;
  }

  /* ─── SUN ─── */

  _drawSun(ctx, W, H, influence) {
    const pos = this._getSunPos();
    const sx = pos.x * W;
    const sy = pos.y * H;

    // How close to horizon? Warmer color near edges
    const altitude = 1 - pos.y; // higher = more altitude
    const nearHorizon = Math.max(0, 1 - altitude * 2.5);

    // Outer warm glow (large, very visible)
    const outerR = 80 + influence * 40;
    const og = ctx.createRadialGradient(sx, sy, 0, sx, sy, outerR);
    if (nearHorizon > 0.3) {
      // Warm orange glow near horizon (sunrise/sunset)
      og.addColorStop(0, `rgba(255,160,60,${0.15 * influence})`);
      og.addColorStop(0.3, `rgba(255,120,40,${0.08 * influence})`);
      og.addColorStop(0.6, `rgba(255,80,30,${0.03 * influence})`);
    } else {
      // White-yellow glow when high
      og.addColorStop(0, `rgba(255,245,220,${0.18 * influence})`);
      og.addColorStop(0.3, `rgba(255,230,180,${0.08 * influence})`);
      og.addColorStop(0.6, `rgba(255,220,150,${0.03 * influence})`);
    }
    og.addColorStop(1, 'transparent');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow ring
    const innerR = 25 + influence * 15;
    const ig = ctx.createRadialGradient(sx, sy, 0, sx, sy, innerR);
    ig.addColorStop(0, `rgba(255,250,230,${0.25 * influence})`);
    ig.addColorStop(0.5, `rgba(255,240,200,${0.12 * influence})`);
    ig.addColorStop(1, 'transparent');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(sx, sy, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Sun core (bright dot)
    const coreR = 5 + influence * 3;
    ctx.fillStyle = `rgba(255,250,235,${0.3 * influence})`;
    ctx.beginPath();
    ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
    ctx.fill();

    // Tiny bright center
    ctx.fillStyle = `rgba(255,255,255,${0.4 * influence})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Horizon glow (warm light spills when sun is low)
    if (nearHorizon > 0.2) {
      const hg = ctx.createRadialGradient(sx, H, 0, sx, H, H * 0.4);
      hg.addColorStop(0, `rgba(255,140,50,${0.06 * nearHorizon * influence})`);
      hg.addColorStop(0.5, `rgba(255,100,40,${0.02 * nearHorizon * influence})`);
      hg.addColorStop(1, 'transparent');
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ─── MOON ─── */

  _drawMoon(ctx, W, H, nightStrength) {
    const pos = this._getMoonPos();
    if (!pos.visible || nightStrength < 0.1) return;

    const mx = pos.x * W;
    const my = pos.y * H;
    const r = 16;
    const alpha = Math.min(1, nightStrength * 1.3);

    // Outer glow (large, silvery)
    const outerR = r * 5;
    const og = ctx.createRadialGradient(mx, my, 0, mx, my, outerR);
    og.addColorStop(0, `rgba(180,200,240,${0.07 * alpha})`);
    og.addColorStop(0.3, `rgba(150,175,220,${0.03 * alpha})`);
    og.addColorStop(1, 'transparent');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(mx, my, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    const ig = ctx.createRadialGradient(mx, my, r * 0.5, mx, my, r * 2.5);
    ig.addColorStop(0, `rgba(200,215,245,${0.1 * alpha})`);
    ig.addColorStop(0.5, `rgba(170,190,230,${0.04 * alpha})`);
    ig.addColorStop(1, 'transparent');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(mx, my, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Moon body
    ctx.fillStyle = `rgba(210,220,240,${0.15 * alpha})`;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();

    // Moon edge highlight
    ctx.strokeStyle = `rgba(220,230,250,${0.12 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.stroke();

    // Crescent shadow (phase-based)
    const off = r * (1 - this.moonPhase * 2);
    ctx.fillStyle = `rgba(5,8,18,${0.14 * alpha})`;
    ctx.beginPath();
    ctx.arc(mx + off, my, r * 0.88, 0, Math.PI * 2);
    ctx.fill();

    // Subtle surface detail (craters)
    ctx.fillStyle = `rgba(180,190,210,${0.04 * alpha})`;
    ctx.beginPath();
    ctx.arc(mx - 3, my - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx + 5, my + 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx - 1, my + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ─── STARS ─── */

  _drawStars(ctx, W, H, time, nightStrength) {
    const alpha = Math.min(1, nightStrength * 1.5);

    for (const star of this.stars) {
      const px = star.x * W;
      const py = star.y * H;
      const twinkle = 0.3 + Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.25;
      const a = twinkle * alpha;

      // Star glow
      const sg = ctx.createRadialGradient(px, py, 0, px, py, star.r * 3);
      sg.addColorStop(0, `rgba(200,220,255,${a * 0.3})`);
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(px, py, star.r * 3, 0, Math.PI * 2);
      ctx.fill();

      // Star core
      ctx.fillStyle = `rgba(220,230,255,${a})`;
      ctx.beginPath();
      ctx.arc(px, py, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ─── CLOUDS ─── */

  _drawClouds(ctx, W, H) {
    const night = this._getNightStrength();
    const opacityMul = 1 - night * 0.5;
    const colorMap = {
      morning:   (a) => `rgba(120,80,60,${a})`,
      afternoon: (a) => `rgba(80,90,120,${a})`,
      evening:   (a) => `rgba(100,50,40,${a})`,
      night:     (a) => `rgba(30,35,55,${a})`,
    };
    const colorFn = colorMap[this.period] || colorMap.afternoon;

    for (const c of this.clouds) {
      const cx = c.x * W;
      const cy = c.y * H;
      const a = c.opacity * opacityMul;
      ctx.fillStyle = colorFn(a);

      ctx.beginPath();
      ctx.ellipse(cx, cy, c.w * 0.5, c.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - c.w * 0.3, cy + 2, c.w * 0.3, c.h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + c.w * 0.25, cy + 1, c.w * 0.35, c.h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + c.w * 0.05, cy - c.h * 0.15, c.w * 0.25, c.h * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ─── RAIN ─── */

  _drawRain(ctx, W, H) {
    ctx.strokeStyle = `rgba(100,140,200,${0.15 * this.rainIntensity})`;
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';

    for (const d of this.rainDrops) {
      const x = d.x * W;
      const y = d.y * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1, y + d.length);
      ctx.stroke();
    }
  }
}
