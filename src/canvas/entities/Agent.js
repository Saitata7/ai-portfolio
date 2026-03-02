/* ─── AI AGENT ENTITY ───
   Sleek humanoid robot with state machine, dt-based movement,
   DPR-correct eye tracking, and mechanical design details.
   ─────────────────────── */

export const AGENT_STATES = {
  IDLE: 'idle',
  WALK_TO_PICKUP: 'walk_to_pickup',
  PICKUP: 'pickup',
  CARRYING: 'carrying',
  DROPOFF: 'dropoff',
  WALK_HOME: 'walk_home',
  NAV_WALKING: 'nav_walking',
  NAV_ARRIVED: 'nav_arrived',
  BUG_CHASE: 'bug_chase',
};

export default class Agent {
  constructor(homeNode, id, nodes) {
    this.homeNode = homeNode;
    this.id = id;
    const n = nodes[homeNode];
    this.x = n.x + (id === 0 ? -35 : 35);
    this.y = n.y + n.h / 2 + 40 + Math.random() * 15;
    this.homeX = this.x;
    this.homeY = this.y;
    this.size = 28;
    this.color = n.color;
    this.state = AGENT_STATES.IDLE;
    this.targetX = this.x;
    this.targetY = this.y;
    this.facing = id === 0 ? 1 : -1;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.bobY = 0;
    this.idleTimer = 15 + Math.random() * 40;
    this.destNode = -1;
    this.hasPackage = false;
    this.pkgColor = '#00f0ff';
    this.pkgBob = 0;
    this.zIndex = 2;

    // Eyes
    this.eyeAngle = 0;
    this.tEyeAngle = 0;
    this.blinkTimer = Math.random() * 3;
    this.isBlinking = false;
    this.eyeWide = 0;
    this.pupilConstrict = 0;

    // Surprise
    this.surprise = 0;
    this.armSwing = 0;

    // Office silence freeze
    this.freezeDelay = 0;
    this.frozenYet = false;

    // Bug chase
    this.chasingBug = null;
    this.weaponType = null; // 'beam' | 'sword' | 'shield'
  }

  navToNode(idx, nodes) {
    const n = nodes[idx];
    this.targetX = n.x + (Math.random() - 0.5) * 80;
    this.targetY = n.y + n.h / 2 + 15 + Math.random() * 25;
    this.state = AGENT_STATES.NAV_WALKING;
    this.hasPackage = false;
  }

  returnHome() {
    this.targetX = this.homeX;
    this.targetY = this.homeY;
    this.state = AGENT_STATES.WALK_HOME;
    this.chasingBug = null;
    this.weaponType = null;
  }

  update(dt, time, world) {
    const { gState, mouse, nodes, conns } = world;

    // Blink
    this.blinkTimer += dt;
    if (!this.isBlinking && this.blinkTimer > 2.5 + Math.random() * 3) {
      this.isBlinking = true;
      this.blinkTimer = 0;
    }
    if (this.isBlinking && this.blinkTimer > 0.12) {
      this.isBlinking = false;
      this.blinkTimer = 0;
    }

    // Eye wide (surprised look when watching)
    const wantWide = gState === 'watching' ? 1 : 0;
    this.eyeWide += (wantWide - this.eyeWide) * 0.12;

    // Pupil constriction when surprised
    const wantConstrict = gState === 'watching' ? 0.3 : 0;
    this.pupilConstrict += (wantConstrict - this.pupilConstrict) * 0.1;

    // Surprise "!" pop
    if (gState === 'watching' && this.frozenYet && this.surprise < 1)
      this.surprise = Math.min(1, this.surprise + 0.09);
    else if (gState !== 'watching' && this.surprise > 0)
      this.surprise = Math.max(0, this.surprise - 0.05);

    this._updateEyes(dt, gState, mouse, nodes);

    // Freeze delay for cinematic ripple
    if (gState === 'watching' && !this.frozenYet) {
      this.freezeDelay -= dt;
      if (this.freezeDelay <= 0) {
        this.frozenYet = true;
        this.surprise = 0;
        // Snap 60% toward target instantly
        let d = this.tEyeAngle - this.eyeAngle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.eyeAngle += d * 0.6;
      }
      return; // Keep walking until freeze delay expires
    }

    // Freeze position when watching (but eyes still track)
    if (gState === 'watching') {
      this.bobY = Math.sin(time * 0.8 + this.id * 3) * 0.5; // Subtle weight shift
      return;
    }

    // Reset freeze state when leaving watching
    if (gState !== 'watching') {
      this.frozenYet = false;
    }

    this._updateStateMachine(dt, time, gState, nodes, conns);
  }

  _updateEyes(dt, gState, mouse, nodes) {
    if (gState === 'watching') {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      this.tEyeAngle = Math.atan2(dy, dx);
    } else if (
      [AGENT_STATES.NAV_WALKING, AGENT_STATES.CARRYING,
       AGENT_STATES.WALK_TO_PICKUP, AGENT_STATES.WALK_HOME,
       AGENT_STATES.BUG_CHASE].includes(this.state)
    ) {
      this.tEyeAngle = Math.atan2(
        this.targetY - this.y,
        this.targetX - this.x,
      );
    } else {
      const n = nodes[this.homeNode];
      this.tEyeAngle = Math.atan2(n.y - this.y, n.x - this.x);
    }

    // Smooth eye tracking — fast snap then smooth settle
    let d = this.tEyeAngle - this.eyeAngle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.eyeAngle += d * 0.25;
  }

  _updateStateMachine(dt, time, gState, nodes, conns) {
    switch (this.state) {
      case AGENT_STATES.IDLE:
        this.bobY = Math.sin(time * 2 + this.id * 3) * 2;
        this.idleTimer -= dt * 60;
        if (this.idleTimer <= 0 && gState === 'working') {
          const possible = conns
            .filter(c => c.from === this.homeNode || c.to === this.homeNode)
            .map(c => (c.from === this.homeNode ? c.to : c.from));
          if (possible.length > 0) {
            this.destNode = possible[Math.floor(Math.random() * possible.length)];
            const hn = nodes[this.homeNode];
            this.targetX = hn.x + (Math.random() - 0.5) * 20;
            this.targetY = hn.y + hn.h / 2 + 8;
            this.state = AGENT_STATES.WALK_TO_PICKUP;
          } else this.idleTimer = 30;
        }
        break;

      case AGENT_STATES.WALK_TO_PICKUP:
        if (this._walkTo(dt, 1.5)) {
          this.state = AGENT_STATES.PICKUP;
          this.idleTimer = 18;
        }
        break;

      case AGENT_STATES.PICKUP:
        this.bobY = Math.sin(time * 8) * 3;
        this.idleTimer -= dt * 60;
        if (this.idleTimer <= 0) {
          this.hasPackage = true;
          this.pkgColor = nodes[this.homeNode].color;
          const dn = nodes[this.destNode];
          this.targetX = dn.x + (Math.random() - 0.5) * 20;
          this.targetY = dn.y + dn.h / 2 + 8;
          this.state = AGENT_STATES.CARRYING;
        }
        break;

      case AGENT_STATES.CARRYING:
        this.pkgBob = Math.sin(time * 4) * 2;
        if (this._walkTo(dt, 1.1)) {
          this.state = AGENT_STATES.DROPOFF;
          this.idleTimer = 15;
        }
        break;

      case AGENT_STATES.DROPOFF:
        this.bobY = Math.sin(time * 8) * 3;
        this.idleTimer -= dt * 60;
        if (this.idleTimer <= 0) {
          this.hasPackage = false;
          this.targetX = this.homeX;
          this.targetY = this.homeY;
          this.state = AGENT_STATES.WALK_HOME;
        }
        break;

      case AGENT_STATES.WALK_HOME:
        if (this._walkTo(dt, 1.4)) {
          this.state = AGENT_STATES.IDLE;
          this.idleTimer = 20 + Math.random() * 50;
        }
        break;

      case AGENT_STATES.NAV_WALKING:
        if (this._walkTo(dt, 2.2)) {
          this.state = AGENT_STATES.NAV_ARRIVED;
        }
        break;

      case AGENT_STATES.NAV_ARRIVED:
        this.bobY = Math.sin(time * 3) * 3;
        break;

      case AGENT_STATES.BUG_CHASE:
        if (this.chasingBug) {
          this.targetX = this.chasingBug.x;
          this.targetY = this.chasingBug.y;
          if (this._walkTo(dt, 1.8)) {
            // Close enough to zap
          }
        }
        break;
    }
  }

  _walkTo(dt, speedMult) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) return true;

    const speed = 120 * speedMult; // pixels per second
    const step = Math.min(speed * dt, dist); // never overshoot
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.walkPhase += dt * 12;
    this.facing = dx > 0 ? 1 : -1;
    this.bobY = Math.abs(Math.sin(this.walkPhase)) * -4;
    this.armSwing = Math.sin(this.walkPhase) * 0.45;
    return false;
  }

  draw(ctx, time, world) {
    const s = this.size;
    ctx.save();
    ctx.translate(this.x, this.y + this.bobY);

    const sb = 1 + Math.sin(this.surprise * Math.PI) * 0.08;
    ctx.scale(this.facing, 1);
    ctx.scale(sb, sb);

    this._drawShadow(ctx, s);
    this._drawLegs(ctx, s, time);
    this._drawBody(ctx, s, time);
    this._drawArms(ctx, s, time);
    if (this.weaponType) this._drawWeapon(ctx, s, time);
    this._drawHead(ctx, s, time);
    this._drawSurpriseIndicator(ctx, s, time);
    this._drawCarryingIndicator(ctx, s, world.gState);

    ctx.restore();
  }

  _drawShadow(ctx, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.85, s * 0.35, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawLegs(ctx, s, time) {
    const isWalking = [
      AGENT_STATES.WALK_TO_PICKUP, AGENT_STATES.CARRYING,
      AGENT_STATES.WALK_HOME, AGENT_STATES.NAV_WALKING,
      AGENT_STATES.BUG_CHASE,
    ].includes(this.state);

    const lsw = isWalking ? Math.sin(this.walkPhase) * 0.35 : 0;
    ctx.strokeStyle = '#15203a';
    ctx.lineWidth = s * 0.12;
    ctx.lineCap = 'round';

    // Left leg — thigh + shin
    ctx.save();
    ctx.translate(-s * 0.14, s * 0.42);
    ctx.rotate(lsw);
    // Thigh
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s * 0.2);
    ctx.stroke();
    // Knee joint
    ctx.fillStyle = this.color + '33';
    ctx.beginPath();
    ctx.arc(0, s * 0.2, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // Shin
    ctx.beginPath();
    ctx.moveTo(0, s * 0.2);
    ctx.lineTo(0, s * 0.42);
    ctx.stroke();
    // Foot — rectangular
    ctx.fillStyle = '#1a2845';
    ctx.beginPath();
    ctx.roundRect(-s * 0.06, s * 0.4, s * 0.12, s * 0.05, 2);
    ctx.fill();
    ctx.restore();

    // Right leg
    ctx.save();
    ctx.translate(s * 0.14, s * 0.42);
    ctx.rotate(-lsw);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s * 0.2);
    ctx.stroke();
    ctx.fillStyle = this.color + '33';
    ctx.beginPath();
    ctx.arc(0, s * 0.2, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, s * 0.2);
    ctx.lineTo(0, s * 0.42);
    ctx.stroke();
    ctx.fillStyle = '#1a2845';
    ctx.beginPath();
    ctx.roundRect(-s * 0.06, s * 0.4, s * 0.12, s * 0.05, 2);
    ctx.fill();
    ctx.restore();
  }

  _drawBody(ctx, s, time) {
    // Trapezoidal torso — wider at shoulders, narrower at waist
    const shoulderW = s * 0.55;
    const waistW = s * 0.42;
    const torsoH = s * 0.5;
    const torsoTop = -s * 0.1;

    ctx.beginPath();
    ctx.moveTo(-shoulderW / 2, torsoTop);
    ctx.lineTo(shoulderW / 2, torsoTop);
    ctx.lineTo(waistW / 2, torsoTop + torsoH);
    ctx.lineTo(-waistW / 2, torsoTop + torsoH);
    ctx.closePath();

    const bg = ctx.createLinearGradient(
      -shoulderW / 2, torsoTop, shoulderW / 2, torsoTop + torsoH,
    );
    bg.addColorStop(0, '#1a2540');
    bg.addColorStop(1, '#0f1828');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = this.color + '44';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Chest plate seam
    ctx.strokeStyle = this.color + '22';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-shoulderW * 0.35, torsoTop + torsoH * 0.35);
    ctx.lineTo(shoulderW * 0.35, torsoTop + torsoH * 0.35);
    ctx.stroke();

    // Belt line
    ctx.strokeStyle = this.color + '33';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-waistW / 2 - 2, torsoTop + torsoH - 1);
    ctx.lineTo(waistW / 2 + 2, torsoTop + torsoH - 1);
    ctx.stroke();

    // Chest glow core
    const cp = 0.35 + Math.sin(time * 3 + this.id) * 0.2;
    const glowR = s * 0.065;
    const coreY = torsoTop + torsoH * 0.25;
    // Glow via radial gradient (cheaper than shadowBlur)
    const coreGlow = ctx.createRadialGradient(0, coreY, glowR * 0.3, 0, coreY, glowR * 3);
    coreGlow.addColorStop(0, this.color + '66');
    coreGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(0, coreY, glowR * 3, 0, Math.PI * 2);
    ctx.fill();
    // Core dot
    ctx.fillStyle = this.color;
    ctx.globalAlpha = cp;
    ctx.beginPath();
    ctx.arc(0, coreY, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Shoulder pads
    ctx.fillStyle = '#1e2d50';
    ctx.strokeStyle = this.color + '33';
    ctx.lineWidth = 0.8;
    [-1, 1].forEach(side => {
      ctx.beginPath();
      const sx = side * shoulderW / 2;
      ctx.moveTo(sx, torsoTop);
      ctx.lineTo(sx + side * s * 0.08, torsoTop + s * 0.06);
      ctx.lineTo(sx, torsoTop + s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }

  _drawArms(ctx, s, time) {
    const isWalking = [
      AGENT_STATES.WALK_TO_PICKUP, AGENT_STATES.CARRYING,
      AGENT_STATES.WALK_HOME, AGENT_STATES.NAV_WALKING,
      AGENT_STATES.BUG_CHASE,
    ].includes(this.state);

    const asw = isWalking
      ? this.armSwing
      : Math.sin(time * 2 + this.id) * 0.06;

    const shoulderY = -s * 0.08;

    // Left arm
    ctx.save();
    ctx.translate(-s * 0.3, shoulderY);
    ctx.rotate(-0.1 + asw);
    ctx.strokeStyle = '#15203a';
    ctx.lineWidth = s * 0.1;
    ctx.lineCap = 'round';
    // Upper arm
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.05, s * 0.22);
    ctx.stroke();
    // Elbow joint
    ctx.fillStyle = this.color + '33';
    ctx.beginPath();
    ctx.arc(-s * 0.05, s * 0.22, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
    // Forearm
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, s * 0.22);
    ctx.lineTo(-s * 0.02, s * 0.38);
    ctx.stroke();
    // Hand
    ctx.fillStyle = '#1e2d50';
    ctx.beginPath();
    ctx.arc(-s * 0.02, s * 0.4, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right arm + package
    const cAsw = this.hasPackage ? -0.6 : asw;
    ctx.save();
    ctx.translate(s * 0.3, shoulderY);
    ctx.rotate(0.1 + cAsw);
    ctx.strokeStyle = '#15203a';
    ctx.lineWidth = s * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.05, s * 0.22);
    ctx.stroke();
    ctx.fillStyle = this.color + '33';
    ctx.beginPath();
    ctx.arc(s * 0.05, s * 0.22, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.05, s * 0.22);
    ctx.lineTo(s * 0.02, s * 0.38);
    ctx.stroke();
    ctx.fillStyle = '#1e2d50';
    ctx.beginPath();
    ctx.arc(s * 0.02, s * 0.4, s * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Package in hand
    if (this.hasPackage) {
      this._drawPackage(ctx, s, time);
    }
    ctx.restore();
  }

  _drawWeapon(ctx, s, time) {
    ctx.save();
    // Position weapon at right hand area
    ctx.translate(s * 0.35, s * 0.15);

    switch (this.weaponType) {
      case 'beam': {
        // Energy beam gun — barrel + glow tip
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        // Gun barrel
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.4, -s * 0.1);
        ctx.stroke();
        // Gun body block
        ctx.fillStyle = '#1a2845';
        ctx.strokeStyle = this.color + '66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-s * 0.04, -s * 0.05, s * 0.16, s * 0.1, 2);
        ctx.fill();
        ctx.stroke();
        // Barrel tip glow
        const gunGlow = ctx.createRadialGradient(
          s * 0.4, -s * 0.1, 0, s * 0.4, -s * 0.1, s * 0.12,
        );
        gunGlow.addColorStop(0, this.color + 'aa');
        gunGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = gunGlow;
        ctx.beginPath();
        ctx.arc(s * 0.4, -s * 0.1, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        // Tip dot pulsing
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6 + Math.sin(time * 10) * 0.4;
        ctx.beginPath();
        ctx.arc(s * 0.4, -s * 0.1, s * 0.035, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'sword': {
        // Energy sword — glowing blade from hilt
        const swordAngle = -0.6 + Math.sin(time * 3) * 0.15;
        ctx.save();
        ctx.rotate(swordAngle);
        // Hilt
        ctx.fillStyle = '#1a2845';
        ctx.strokeStyle = this.color + '88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-s * 0.03, -s * 0.04, s * 0.06, s * 0.12, 1);
        ctx.fill();
        ctx.stroke();
        // Cross-guard
        ctx.fillStyle = this.color + '44';
        ctx.beginPath();
        ctx.roundRect(-s * 0.08, -s * 0.045, s * 0.16, s * 0.025, 1);
        ctx.fill();
        // Blade — glowing energy
        const bladeLen = s * 0.55;
        const bladeGrad = ctx.createLinearGradient(0, -s * 0.04, 0, -s * 0.04 - bladeLen);
        bladeGrad.addColorStop(0, this.color + 'cc');
        bladeGrad.addColorStop(0.7, this.color + '88');
        bladeGrad.addColorStop(1, this.color + '22');
        ctx.fillStyle = bladeGrad;
        ctx.beginPath();
        ctx.moveTo(-s * 0.025, -s * 0.04);
        ctx.lineTo(s * 0.025, -s * 0.04);
        ctx.lineTo(s * 0.008, -s * 0.04 - bladeLen);
        ctx.lineTo(-s * 0.008, -s * 0.04 - bladeLen);
        ctx.closePath();
        ctx.fill();
        // Blade glow aura
        const auraGrad = ctx.createLinearGradient(0, -s * 0.04, 0, -s * 0.04 - bladeLen);
        auraGrad.addColorStop(0, this.color + '33');
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.moveTo(-s * 0.06, -s * 0.04);
        ctx.lineTo(s * 0.06, -s * 0.04);
        ctx.lineTo(s * 0.015, -s * 0.04 - bladeLen);
        ctx.lineTo(-s * 0.015, -s * 0.04 - bladeLen);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'shield': {
        // Energy shield — translucent arc barrier
        ctx.save();
        ctx.translate(s * 0.08, -s * 0.1);
        const shieldPulse = 0.7 + Math.sin(time * 4) * 0.15;
        // Shield arc
        const shieldGrad = ctx.createRadialGradient(0, 0, s * 0.08, 0, 0, s * 0.35);
        shieldGrad.addColorStop(0, this.color + '11');
        shieldGrad.addColorStop(0.5, this.color + '22');
        shieldGrad.addColorStop(1, this.color + '05');
        ctx.fillStyle = shieldGrad;
        ctx.globalAlpha = shieldPulse;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.35, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        // Shield edge ring
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = shieldPulse * 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.35, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();
        // Inner hex pattern
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 3; i++) {
          const hr = s * 0.12 + i * s * 0.08;
          ctx.beginPath();
          ctx.arc(0, 0, hr, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }

  _drawPackage(ctx, s, time) {
    const py = this.pkgBob;
    ctx.save();
    ctx.translate(s * 0.02, s * 0.28 + py);

    // Glow aura
    const pkgGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.18);
    pkgGlow.addColorStop(0, this.pkgColor + '33');
    pkgGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = pkgGlow;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Box
    const ps = s * 0.12;
    ctx.fillStyle = this.pkgColor + '77';
    ctx.strokeStyle = this.pkgColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-ps, -ps, ps * 2, ps * 2, 3);
    ctx.fill();
    ctx.stroke();

    // Cross lines
    ctx.strokeStyle = this.pkgColor;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-ps, 0);
    ctx.lineTo(ps, 0);
    ctx.moveTo(0, -ps);
    ctx.lineTo(0, ps);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Orbiting sparkles
    for (let i = 0; i < 3; i++) {
      const sa = time * 3 + (i * Math.PI * 2) / 3;
      const sr = s * 0.18 + Math.sin(time * 5 + i) * 2;
      ctx.fillStyle = this.pkgColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  _drawHead(ctx, s, time) {
    const isWalking = [
      AGENT_STATES.WALK_TO_PICKUP, AGENT_STATES.CARRYING,
      AGENT_STATES.WALK_HOME, AGENT_STATES.NAV_WALKING,
      AGENT_STATES.BUG_CHASE,
    ].includes(this.state);

    // Head tilt toward eye target
    const htx = Math.cos(this.eyeAngle * this.facing) * s * 0.04;
    const hty = Math.sin(this.eyeAngle) * s * 0.03;
    ctx.save();
    ctx.translate(htx, hty);

    // Neck
    ctx.fillStyle = '#15203a';
    ctx.beginPath();
    ctx.roundRect(-s * 0.07, -s * 0.18, s * 0.14, s * 0.1, 2);
    ctx.fill();

    // Head — helmet-like (rounded top, flatter bottom)
    const headW = s * 0.6;
    const headH = s * 0.5;
    const headTop = -s * 0.7;

    const hg = ctx.createLinearGradient(-headW / 2, headTop, headW / 2, headTop + headH);
    hg.addColorStop(0, '#1e2d50');
    hg.addColorStop(1, '#141f38');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.roundRect(-headW / 2, headTop, headW, headH, [s * 0.15, s * 0.15, s * 0.06, s * 0.06]);
    ctx.fill();
    ctx.strokeStyle = this.color + '44';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Visor — slightly rectangular
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(-headW * 0.42, headTop + headH * 0.18, headW * 0.84, headH * 0.52, s * 0.06);
    ctx.fill();

    // Eyes
    const blinkY = this.isBlinking ? 0.08 : 1;
    const eyeR = s * 0.13 * (1 + this.eyeWide * 0.35);
    const maxMove = eyeR * 0.45;
    const eix = Math.cos(this.eyeAngle * this.facing) * maxMove;
    const eiy = Math.sin(this.eyeAngle) * maxMove;

    [-1, 1].forEach(side => {
      ctx.save();
      ctx.translate(side * s * 0.14, headTop + headH * 0.42);
      ctx.scale(1, blinkY);

      // Socket
      ctx.fillStyle = '#080e1a';
      ctx.beginPath();
      ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Ring glow — gradient instead of shadowBlur
      const ringGlow = ctx.createRadialGradient(0, 0, eyeR * 0.7, 0, 0, eyeR * 1.5);
      ringGlow.addColorStop(0, this.color + '55');
      ringGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = ringGlow;
      ctx.beginPath();
      ctx.arc(0, 0, eyeR * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Ring stroke
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7 + this.eyeWide * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Iris
      const irisR = eyeR * 0.65;
      const ig = ctx.createRadialGradient(eix, eiy, 0, eix, eiy, irisR);
      ig.addColorStop(0, this.color);
      ig.addColorStop(0.6, this.color + '88');
      ig.addColorStop(1, this.color + '11');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.arc(eix, eiy, irisR, 0, Math.PI * 2);
      ctx.fill();

      // Pupil — constricts when surprised
      const pupilR = eyeR * (0.35 - this.pupilConstrict * 0.12);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(eix, eiy, pupilR, 0, Math.PI * 2);
      ctx.fill();

      // Highlights
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(eix - eyeR * 0.15, eiy - eyeR * 0.18, eyeR * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(eix + eyeR * 0.1, eiy + eyeR * 0.1, eyeR * 0.07, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Mouth
    const mouthY = headTop + headH * 0.78;
    if (this.eyeWide > 0.3) {
      // Surprised O mouth
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = this.eyeWide;
      ctx.beginPath();
      ctx.arc(0, mouthY, s * 0.04 + this.eyeWide * s * 0.02, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // Normal mouth — thin line
      const mw = s * 0.18 + Math.sin(time * 4) * s * 0.01;
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.roundRect(-mw / 2, mouthY - s * 0.015, mw, s * 0.03, 1.5);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Antenna
    ctx.strokeStyle = this.color + '44';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, headTop);
    ctx.lineTo(0, headTop - s * 0.18);
    ctx.stroke();

    const ap = 0.4 + Math.sin(time * 5 + this.homeNode) * 0.4;
    // Antenna tip glow
    const tipGlow = ctx.createRadialGradient(0, headTop - s * 0.2, 0, 0, headTop - s * 0.2, s * 0.08);
    tipGlow.addColorStop(0, this.color + '88');
    tipGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = tipGlow;
    ctx.beginPath();
    ctx.arc(0, headTop - s * 0.2, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // Tip dot
    ctx.fillStyle = this.color;
    ctx.globalAlpha = ap;
    ctx.beginPath();
    ctx.arc(0, headTop - s * 0.2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore(); // head tilt
  }

  _drawSurpriseIndicator(ctx, s, time) {
    if (this.surprise > 0.4) {
      const surpriseScale = this.surprise < 0.7
        ? (this.surprise / 0.7) * 1.3
        : 1.3 - ((this.surprise - 0.7) / 0.3) * 0.3;

      ctx.globalAlpha = (this.surprise - 0.3) * 1.2;
      ctx.fillStyle = '#ff00aa';
      ctx.font = `bold ${s * 0.45 * surpriseScale}px 'Outfit',sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', s * 0.4 * this.facing, -s * 0.95);
      ctx.globalAlpha = 1;
    }
  }

  _drawCarryingIndicator(ctx, s, gState) {
    if (this.hasPackage && gState === 'working') {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7;
      ctx.fillText('📦', 0, -s * 1.1);
      ctx.globalAlpha = 1;
    }
  }
}
