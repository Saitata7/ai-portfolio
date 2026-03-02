/* ─── BULLET ───
   Fast projectile from agent gun to bug.
   Bright tracer with muzzle flash and impact spark.
   ─────────────── */

export default class Bullet {
  constructor(agent, bug) {
    this.agent = agent;
    this.bug = bug;
    this.color = agent.color;

    // Start at gun tip (agent's right hand area in world space)
    const facing = agent.facing;
    const s = agent.size;
    this.x = agent.x + facing * s * 0.55;
    this.y = agent.y + agent.bobY - s * 0.15;

    // Target
    this.tx = bug.x;
    this.ty = bug.y;

    // Flight
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    this.speed = 600; // pixels/sec — fast
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
    this.totalDist = dist;
    this.traveled = 0;

    this.life = 1; // seconds max
    this.hit = false;
    this.hitTimer = 0;

    // Muzzle flash
    this.flashTimer = 0.08;

    // Trail history (last 5 positions)
    this.trail = [];

    this.zIndex = 3;
  }

  update(dt) {
    this.flashTimer -= dt;

    if (!this.hit) {
      // Store trail
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 6) this.trail.shift();

      // Move bullet
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.traveled += this.speed * dt;

      // Check if reached target
      const dx = this.bug.x - this.x;
      const dy = this.bug.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 12 || this.traveled > this.totalDist + 20) {
        this.hit = true;
        this.hitTimer = 0.25;
        // Damage the bug
        this.bug.life -= 0.35;
        this.bug.hitFlash = 1;
      }

      this.life -= dt;
    } else {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) this.life = 0;
    }
  }

  draw(ctx, time) {
    if (this.life <= 0) return;

    // Muzzle flash at origin
    if (this.flashTimer > 0) {
      const fx = this.agent.x + this.agent.facing * this.agent.size * 0.55;
      const fy = this.agent.y + this.agent.bobY - this.agent.size * 0.15;
      const flashR = 8 + (0.08 - this.flashTimer) * 80;
      const flashAlpha = this.flashTimer / 0.08;

      // Flash burst
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, flashR);
      fg.addColorStop(0, `rgba(255,255,255,${0.5 * flashAlpha})`);
      fg.addColorStop(0.3, this.color.slice(0, 7) + Math.round(80 * flashAlpha).toString(16).padStart(2, '0'));
      fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, flashR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!this.hit) {
      // Bullet trail
      if (this.trail.length > 1) {
        for (let i = 0; i < this.trail.length - 1; i++) {
          const t = this.trail[i];
          const alpha = (i / this.trail.length) * 0.3;
          ctx.strokeStyle = this.color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Bullet head — bright dot with glow
      const bg = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 6);
      bg.addColorStop(0, 'rgba(255,255,255,0.8)');
      bg.addColorStop(0.4, this.color + 'cc');
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Impact spark burst
      const progress = 1 - (this.hitTimer / 0.25);
      const sparkR = 5 + progress * 20;
      const sparkAlpha = (1 - progress) * 0.6;

      // Expanding ring
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = sparkAlpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.bug.x, this.bug.y, sparkR, 0, Math.PI * 2);
      ctx.stroke();

      // Inner flash
      const ig = ctx.createRadialGradient(
        this.bug.x, this.bug.y, 0,
        this.bug.x, this.bug.y, sparkR * 0.6,
      );
      ig.addColorStop(0, `rgba(255,255,255,${sparkAlpha * 0.5})`);
      ig.addColorStop(0.5, this.color + Math.round(sparkAlpha * 100).toString(16).padStart(2, '0'));
      ig.addColorStop(1, 'transparent');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.arc(this.bug.x, this.bug.y, sparkR * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Spark lines (flying debris)
      const sparks = 6;
      for (let i = 0; i < sparks; i++) {
        const angle = (i / sparks) * Math.PI * 2 + time * 3;
        const len = 4 + progress * 15;
        const sx = this.bug.x + Math.cos(angle) * sparkR * 0.5;
        const sy = this.bug.y + Math.sin(angle) * sparkR * 0.5;
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = sparkAlpha * 0.8;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  }
}
