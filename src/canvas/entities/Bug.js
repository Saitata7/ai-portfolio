/* ─── BUG ENTITY ───
   Digital vulnerability insect. Angular body, circuit-pattern,
   red-orange color. States: contained → escaping → fleeing → being_zapped → returning
   ─────────────────── */

export default class Bug {
  constructor(x, y, vaultCenter) {
    this.x = x;
    this.y = y;
    this.size = 6 + Math.random() * 4;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.state = 'contained'; // contained | escaping | fleeing | being_zapped | returning
    this.legPhase = Math.random() * Math.PI * 2;
    this.wiggle = Math.random() * 100;
    this.health = 1;
    this.targetAgent = null;
    this.stunTimer = 0;
    this.life = 1; // for fade out
    this.hitFlash = 0; // white flash when shot
    this.vaultCenter = vaultCenter;

    // Return path
    this.returnStartX = 0;
    this.returnStartY = 0;
    this.returnProgress = 0;

    // Color in red-orange spectrum
    this.hue = Math.random() * 30 + 5;
    this.color = `hsl(${this.hue}, 85%, 50%)`;
    this.glitchTimer = 0;
    this.isBoss = false;
  }

  escape(vaultX, vaultY) {
    this.state = 'escaping';
    const angleFromCenter = Math.atan2(this.y - vaultY, this.x - vaultX);
    this.angle = angleFromCenter + (Math.random() - 0.5) * Math.PI * 1.2;
    this.speed = 360 + Math.random() * 240; // pixels/sec — Fast initial burst
    this.wiggle = 0;
  }

  startReturn(targetX, targetY) {
    this.state = 'returning';
    this.returnStartX = this.x;
    this.returnStartY = this.y;
    this.returnProgress = 0;
    this.vaultCenter = { x: targetX, y: targetY };
  }

  update(dt, time, world) {
    this.legPhase += dt * 18;
    this.glitchTimer += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt * 5;

    switch (this.state) {
      case 'contained':
        // Crawl actively inside vault — bugs are restless
        this.wiggle += dt * 5;
        this.angle += Math.sin(this.wiggle * 2.3) * 0.15 + Math.cos(this.wiggle * 4.1) * 0.08;
        this.x += Math.cos(this.angle) * 36 * dt;
        this.y += Math.sin(this.angle) * 36 * dt;
        // Keep inside vault bounds if vault center is known
        if (this.vaultCenter) {
          const dx = this.x - this.vaultCenter.x;
          const dy = this.y - this.vaultCenter.y;
          if (Math.abs(dx) > 30) this.angle = Math.PI - this.angle;
          if (Math.abs(dy) > 18) this.angle = -this.angle;
        }
        break;

      case 'escaping': {
        this.wiggle += dt * 10;
        // Burst decays slowly, stays fast to reach distant workstations
        this.speed = Math.max(180, this.speed - dt * 30);
        const noiseE = Math.sin(this.wiggle * 3.7) * 0.6 + Math.sin(this.wiggle * 7.3) * 0.4
          + Math.sin(this.wiggle * 1.1) * 0.3;

        if (this.attackTarget) {
          // Strong steering toward target workstation
          const toTargetAngle = Math.atan2(
            this.attackTarget.y - this.y,
            this.attackTarget.x - this.x,
          );
          let angleDiff = toTargetAngle - this.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          // Stronger steering (0.12) so bugs actually reach targets
          this.angle += angleDiff * 0.12 + noiseE * dt * 2;
        } else {
          this.angle += noiseE * dt * 4;
        }

        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;

        // Switch to fleeing when an agent starts chasing
        if (this.targetAgent) {
          this.state = 'fleeing';
        }
        this._clampToCanvas(world.W, world.H);
        break;
      }

      case 'fleeing':
        this.wiggle += dt * 18;
        if (this.targetAgent) {
          const fleeAngle = Math.atan2(
            this.y - this.targetAgent.y,
            this.x - this.targetAgent.x,
          );
          const noiseF = Math.sin(this.wiggle * 3.7) * 0.9
            + Math.sin(this.wiggle * 7.3) * 0.5
            + Math.sin(this.wiggle * 11.1) * 0.3;
          this.angle = fleeAngle + noiseF;
          // Fast fleeing with random bursts — keeps bugs moving far
          this.speed = 150 + Math.sin(this.wiggle * 5) * 72;
        } else {
          // No chaser — wander all over the canvas
          this.wiggle += dt * 5;
          this.angle += Math.sin(this.wiggle * 2) * 0.08;
          this.speed = 72;
        }
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        this._clampToCanvas(world.W, world.H);
        break;

      case 'being_zapped':
        // Vibrate in place
        this.x += (Math.random() - 0.5) * 2;
        this.y += (Math.random() - 0.5) * 2;
        this.health -= dt * 1.6;
        if (this.health <= 0) {
          this.startReturn(this.vaultCenter.x, this.vaultCenter.y);
        }
        break;

      case 'returning':
        // Float back to vault on smooth curve
        this.returnProgress += dt * 1.5;
        const t = Math.min(1, this.returnProgress);
        const ease = t * t * (3 - 2 * t); // smoothstep
        const cpX = (this.returnStartX + this.vaultCenter.x) / 2;
        const cpY = Math.min(this.returnStartY, this.vaultCenter.y) - 50;
        // Quadratic bezier
        this.x = (1 - ease) * (1 - ease) * this.returnStartX
          + 2 * (1 - ease) * ease * cpX
          + ease * ease * this.vaultCenter.x;
        this.y = (1 - ease) * (1 - ease) * this.returnStartY
          + 2 * (1 - ease) * ease * cpY
          + ease * ease * this.vaultCenter.y;
        this.size *= Math.pow(0.995, dt * 60); // Shrink as returning (dt-independent)
        if (t >= 1) {
          this.life = 0; // Mark for removal
        }
        break;
    }
  }

  _clampToCanvas(W, H) {
    const margin = 30;
    if (this.x < margin) { this.x = margin; this.angle = Math.PI - this.angle + (Math.random() - 0.5); }
    if (this.x > W - margin) { this.x = W - margin; this.angle = Math.PI - this.angle + (Math.random() - 0.5); }
    if (this.y < margin) { this.y = margin; this.angle = -this.angle + (Math.random() - 0.5); }
    if (this.y > H - margin) { this.y = H - margin; this.angle = -this.angle + (Math.random() - 0.5); }
  }

  draw(ctx, time) {
    if (this.life <= 0) return;

    const s = this.size;
    const alpha = this.state === 'returning' ? (1 - this.returnProgress) : 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = alpha;

    // Boss glow aura
    if (this.isBoss) {
      const pulseR = s * 1.8 + Math.sin(time * 6) * s * 0.3;
      const bg = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, pulseR);
      bg.addColorStop(0, `hsla(${this.hue}, 90%, 50%, ${0.25 * alpha})`);
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glitch effect — occasional visual tear
    const glitch = Math.sin(this.glitchTimer * 30) > 0.92;
    if (glitch) ctx.translate((Math.random() - 0.5) * 3, 0);

    // Body — angular hexagonal shape
    ctx.fillStyle = this.hitFlash > 0 ? `rgba(255,255,255,${0.7 + this.hitFlash * 0.3})` : this.color;
    ctx.globalAlpha = alpha * 0.7;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(s * 0.6, -s * 0.5);
    ctx.lineTo(-s * 0.4, -s * 0.4);
    ctx.lineTo(-s * 0.8, 0);
    ctx.lineTo(-s * 0.4, s * 0.4);
    ctx.lineTo(s * 0.6, s * 0.5);
    ctx.closePath();
    ctx.fill();

    // Circuit lines on body
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = alpha * 0.4;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.2);
    ctx.lineTo(s * 0.3, -s * 0.1);
    ctx.lineTo(s * 0.3, s * 0.1);
    ctx.lineTo(-s * 0.2, s * 0.2);
    ctx.stroke();

    // Legs — 3 pairs, animated
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const legX = -s * 0.3 + i * s * 0.35;
      const legAngle = Math.sin(this.legPhase + i * 1.5) * 0.4;
      [-1, 1].forEach(side => {
        ctx.save();
        ctx.translate(legX, 0);
        ctx.rotate(side * (0.5 + legAngle));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, side * s * 0.5);
        ctx.stroke();
        ctx.restore();
      });
    }

    // Eyes — glowing red dots
    ctx.fillStyle = '#ff2200';
    ctx.globalAlpha = alpha * (0.6 + Math.sin(time * 8) * 0.2);
    ctx.beginPath();
    ctx.arc(s * 0.4, -s * 0.15, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.4, s * 0.15, s * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Being zapped — electric sparks
    if (this.state === 'being_zapped') {
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const sa = Math.random() * Math.PI * 2;
        const sr = s * (1 + Math.random());
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
