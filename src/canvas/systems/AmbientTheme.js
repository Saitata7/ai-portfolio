/* ─── AMBIENT THEME ───
   Time-of-day atmospheric effects drawn on canvas.
   Sun and moon arc across the sky based on real local time.
   Agents work 24/7 — the sky proves it.
   ───────────────────── */

export default class AmbientTheme {
  constructor() {
    this._refreshTime();
    this.hourCheckTimer = 0;
    this.themeOverride = 'night'; // Default to night theme

    // Apply night time values
    this.timeF = 0;
    this.hour = 0;
    this.period = 'night';

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

    // Snow state
    this.isSnowing = false;
    this.snowFlakes = [];
    this.snowIntensity = 0;

    // Moon phase (rough, based on day of month)
    this.moonPhase = (new Date().getDate() % 30) / 30;

    // Cinematic transition state
    this._trans = { active: false, progress: 1, fromDayF: 0, toDayF: 0, toDay: false };
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
    else if (moonHour <= 5) moonHour += 5;     // 0→5, 5→10 (inclusive for smooth set)
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

  setTheme(theme) {
    // Capture pre-transition dayF
    const prevDayF = this._getSunInfluence();

    this.themeOverride = theme === 'auto' ? null : theme;
    this.isRaining = false;
    this.isSnowing = false;

    if (theme === 'day') {
      this.timeF = 12;
      this.hour = 12;
      this.period = 'afternoon';
    } else if (theme === 'night') {
      this.timeF = 0;
      this.hour = 0;
      this.period = 'night';
    } else if (theme === 'rain') {
      this.isRaining = true;
      this.rainTimer = 999;
    } else if (theme === 'snow') {
      this.timeF = 22;
      this.hour = 22;
      this.period = 'night';
      this.isSnowing = true;
    } else {
      this._refreshTime();
    }

    // Start cinematic sweep transition
    const newDayF = this._getSunInfluence();
    this._trans = {
      active: true,
      progress: 0,
      fromDayF: prevDayF,
      toDayF: newDayF,
      toDay: newDayF > prevDayF, // transitioning toward daylight?
    };
  }

  // Transition info for World/Agent to query
  getTransition() {
    return this._trans;
  }

  // How "bright" is the sky? 0 = full dark, 1 = full daylight
  // Smoothly lerps during cinematic transition
  getDayFactor() {
    const raw = this._getSunInfluence();
    if (this._trans.active) {
      const p = this._easeInOut(this._trans.progress);
      return this._trans.fromDayF + (raw - this._trans.fromDayF) * p;
    }
    return raw;
  }

  _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  update(dt) {
    // Advance cinematic transition
    if (this._trans.active) {
      this._trans.progress += dt / 1.8; // 1.8s sweep duration
      if (this._trans.progress >= 1) {
        this._trans.active = false;
        this._trans.progress = 1;
      }
    }

    // Re-check time every 10 seconds (for smooth sun/moon movement)
    if (!this.themeOverride || this.themeOverride === 'rain') {
      this.hourCheckTimer += dt;
      if (this.hourCheckTimer > 10) {
        this.hourCheckTimer = 0;
        if (!this.themeOverride) this._refreshTime();
      }
    }

    // Rain cycle
    if (this.themeOverride === 'rain') {
      this.isRaining = true;
    } else if (this.themeOverride === 'snow') {
      this.isRaining = false;
    } else if (!this.themeOverride) {
      this.rainTimer -= dt;
      if (this.rainTimer <= 0) {
        this.isRaining = !this.isRaining;
        this.rainTimer = this.isRaining
          ? 15 + Math.random() * 30
          : 60 + Math.random() * 180;
      }
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

    // Snow flakes
    const targetSnow = this.isSnowing ? 1 : 0;
    this.snowIntensity += (targetSnow - this.snowIntensity) * dt * 0.3;
    if (this.snowIntensity > 0.05) {
      const spawnRate = Math.floor(this.snowIntensity * 2);
      for (let i = 0; i < spawnRate; i++) {
        if (this.snowFlakes.length < 120) {
          this.snowFlakes.push({
            x: Math.random(),
            y: -0.02,
            speed: 0.05 + Math.random() * 0.08,
            size: 1 + Math.random() * 3,
            drift: (Math.random() - 0.5) * 0.02,
            wobble: Math.random() * Math.PI * 2,
          });
        }
      }
      for (const f of this.snowFlakes) {
        f.y += f.speed * dt;
        f.x += f.drift * dt + Math.sin(f.wobble) * 0.001;
        f.wobble += dt * 2;
      }
      this.snowFlakes = this.snowFlakes.filter(f => f.y < 1.1);
    } else {
      this.snowFlakes = [];
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

    // Snow
    if (this.snowIntensity > 0.05) {
      this._drawSnow(ctx, W, H);
    }
  }

  /* ─── SKY ─── */

  _drawSky(ctx, W, H) {
    const t = this.timeF;
    const grad = ctx.createLinearGradient(0, 0, 0, H);

    // Sky colors — bright & opaque for day, dark & subtle for night
    // Night: dark sky — opaque enough to own the canvas
    const night_top = 'rgba(5,8,22,0.95)';
    const night_mid = 'rgba(8,12,28,0.92)';
    const night_bot = 'rgba(6,10,20,0.90)';

    // Dawn: warm purple → orange horizon — fully opaque
    const dawn_top  = 'rgba(35,25,65,0.98)';
    const dawn_mid  = 'rgba(110,55,75,0.96)';
    const dawn_low  = 'rgba(190,110,55,0.94)';
    const dawn_bot  = 'rgba(230,150,75,0.92)';

    // Day: bright blue sky — fully opaque, no dark bleedthrough
    const day_top   = 'rgba(55,120,200,0.98)';
    const day_mid   = 'rgba(85,150,220,0.97)';
    const day_low   = 'rgba(115,175,235,0.96)';
    const day_bot   = 'rgba(150,200,245,0.94)';

    // Dusk: warm sunset — mostly opaque
    const dusk_top  = 'rgba(20,12,50,0.98)';
    const dusk_mid  = 'rgba(90,35,55,0.96)';
    const dusk_low  = 'rgba(170,75,45,0.94)';
    const dusk_bot  = 'rgba(210,110,55,0.92)';

    let s0, s1, s2, s3;

    if (t >= 5 && t < 7) {
      // Night → Dawn
      const f = (t - 5) / 2;
      s0 = this._lerp(night_top, dawn_top, f);
      s1 = this._lerp(night_mid, dawn_mid, f);
      s2 = this._lerp(night_mid, dawn_low, f);
      s3 = this._lerp(night_bot, dawn_bot, f);
    } else if (t >= 7 && t < 10) {
      // Dawn → Day
      const f = (t - 7) / 3;
      s0 = this._lerp(dawn_top, day_top, f);
      s1 = this._lerp(dawn_mid, day_mid, f);
      s2 = this._lerp(dawn_low, day_low, f);
      s3 = this._lerp(dawn_bot, day_bot, f);
    } else if (t >= 10 && t < 16) {
      // Day — stable bright sky
      s0 = day_top;
      s1 = day_mid;
      s2 = day_low;
      s3 = day_bot;
    } else if (t >= 16 && t < 19) {
      // Day → Dusk
      const f = (t - 16) / 3;
      s0 = this._lerp(day_top, dusk_top, f);
      s1 = this._lerp(day_mid, dusk_mid, f);
      s2 = this._lerp(day_low, dusk_low, f);
      s3 = this._lerp(day_bot, dusk_bot, f);
    } else if (t >= 19 && t < 21) {
      // Dusk → Night
      const f = (t - 19) / 2;
      s0 = this._lerp(dusk_top, night_top, f);
      s1 = this._lerp(dusk_mid, night_mid, f);
      s2 = this._lerp(dusk_low, night_mid, f);
      s3 = this._lerp(dusk_bot, night_bot, f);
    } else {
      // Night — stable dark
      s0 = night_top;
      s1 = night_mid;
      s2 = night_mid;
      s3 = night_bot;
    }

    grad.addColorStop(0, s0);
    grad.addColorStop(0.35, s1);
    grad.addColorStop(0.65, s2);
    grad.addColorStop(1, s3);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Simple RGBA string lerp
  _lerp(c1, c2, f) {
    const p = (s) => s.match(/[\d.]+/g).map(Number);
    const a = p(c1), b = p(c2);
    const r = a.map((v, i) => v + (b[i] - v) * f);
    // Round RGB channels, keep alpha as float
    return `rgba(${Math.round(r[0])},${Math.round(r[1])},${Math.round(r[2])},${r[3].toFixed(3)})`;
  }

  /* ─── SUN ─── */

  _drawSun(ctx, W, H, influence) {
    const pos = this._getSunPos();
    const sx = pos.x * W;
    const sy = pos.y * H;

    // How close to horizon? Warmer color near edges
    const altitude = 1 - pos.y;
    const nearHorizon = Math.max(0, 1 - altitude * 2.5);

    // Outer warm glow — large & vivid
    const outerR = 120 + influence * 60;
    const og = ctx.createRadialGradient(sx, sy, 0, sx, sy, outerR);
    if (nearHorizon > 0.3) {
      og.addColorStop(0, `rgba(255,180,80,${0.35 * influence})`);
      og.addColorStop(0.25, `rgba(255,140,50,${0.18 * influence})`);
      og.addColorStop(0.5, `rgba(255,100,30,${0.06 * influence})`);
    } else {
      og.addColorStop(0, `rgba(255,250,220,${0.40 * influence})`);
      og.addColorStop(0.25, `rgba(255,240,180,${0.18 * influence})`);
      og.addColorStop(0.5, `rgba(255,230,150,${0.06 * influence})`);
    }
    og.addColorStop(1, 'transparent');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Mid glow ring
    const midR = 50 + influence * 25;
    const mg = ctx.createRadialGradient(sx, sy, 0, sx, sy, midR);
    mg.addColorStop(0, `rgba(255,250,230,${0.45 * influence})`);
    mg.addColorStop(0.4, `rgba(255,245,200,${0.20 * influence})`);
    mg.addColorStop(1, 'transparent');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(sx, sy, midR, 0, Math.PI * 2);
    ctx.fill();

    // Sun core — bright visible disc
    const coreR = 10 + influence * 6;
    ctx.fillStyle = `rgba(255,252,240,${0.55 * influence})`;
    ctx.beginPath();
    ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
    ctx.fill();

    // Hot center
    ctx.fillStyle = `rgba(255,255,250,${0.7 * influence})`;
    ctx.beginPath();
    ctx.arc(sx, sy, coreR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Horizon glow (warm spill when sun is low)
    if (nearHorizon > 0.2) {
      const hg = ctx.createRadialGradient(sx, H, 0, sx, H, H * 0.5);
      hg.addColorStop(0, `rgba(255,160,60,${0.10 * nearHorizon * influence})`);
      hg.addColorStop(0.4, `rgba(255,120,40,${0.04 * nearHorizon * influence})`);
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
    const dayF = this.getDayFactor();
    const opacityMul = 0.5 + dayF * 2; // much brighter/whiter clouds during day
    const colorMap = {
      morning:   (a) => `rgba(230,200,170,${a})`,
      afternoon: (a) => `rgba(240,245,255,${a})`,
      evening:   (a) => `rgba(200,130,100,${a})`,
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

  /* ─── SNOW ─── */

  _drawSnow(ctx, W, H) {
    const alpha = this.snowIntensity;
    ctx.fillStyle = `rgba(220,230,250,${0.5 * alpha})`;

    for (const f of this.snowFlakes) {
      const x = f.x * W;
      const y = f.y * H;
      ctx.beginPath();
      ctx.arc(x, y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle ground accumulation glow
    if (alpha > 0.3) {
      const groundGrad = ctx.createLinearGradient(0, H * 0.92, 0, H);
      groundGrad.addColorStop(0, 'transparent');
      groundGrad.addColorStop(1, `rgba(200,210,230,${0.03 * alpha})`);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, H * 0.92, W, H * 0.08);
    }
  }
}
