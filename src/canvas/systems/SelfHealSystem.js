/* ─── SELF-HEAL SYSTEM ───
   Click an agent to inject a fault → shock → collapse → medic rushes over →
   cinematic treatment (diagnose / defibrillate / stabilize) → recovery.
   Demonstrates AI fault tolerance and self-healing systems.
   ──────────────────────── */

import { AGENT_STATES } from '../entities/Agent.js';
import { isTouchDevice } from '../../utils/responsive.js';

const MAX_HEALS = 2;
const SHOCK_DUR = 0.8;
const COLLAPSE_DUR = 0.6;
const DIAGNOSE_DUR = 0.8;
const DEFIB_DUR = 0.8;
const STABILIZE_DUR = 1.4;
const RECOVERY_DUR = 1.0;
const HEAL_COOLDOWN = 3.0;
const AUTO_RECOVER_TIMEOUT = 6.0;

// States that cannot be shocked
const IMMUNE_STATES = [
  AGENT_STATES.SHOCKED, AGENT_STATES.COLLAPSED, AGENT_STATES.BEING_HEALED,
  AGENT_STATES.RECOVERING, AGENT_STATES.MEDIC_WALKING, AGENT_STATES.MEDIC_HEALING,
  AGENT_STATES.NAV_WALKING, AGENT_STATES.NAV_ARRIVED, AGENT_STATES.BUG_CHASE,
];

// States from which an agent can become a medic
const MEDIC_ELIGIBLE = [
  AGENT_STATES.IDLE, AGENT_STATES.WALK_HOME, AGENT_STATES.WALK_TO_PICKUP,
];

export default class SelfHealSystem {
  constructor(world) {
    this.world = world;
    this.activeHeals = []; // { downedAgent, medicAgent, phase, timer, defibCount }
    this.cooldowns = new Map(); // key → remaining seconds
  }

  get isActive() { return this.activeHeals.length > 0; }

  /* ─── HIT TEST + INITIATE ─── */

  tryShockAgent(cssX, cssY) {
    if (this.activeHeals.length >= MAX_HEALS) return false;

    const { agents } = this.world;
    const hitMul = isTouchDevice() ? 1.5 : 1.2;
    let clicked = null, bestDist = Infinity;

    for (const agent of agents) {
      const r = agent.size * hitMul;
      const dx = cssX - agent.x;
      const dy = cssY - (agent.y + agent.bobY);
      const dist = Math.hypot(dx, dy);
      if (dist < r && dist < bestDist) {
        if (IMMUNE_STATES.includes(agent.state)) continue;
        const key = agent.homeNode + '_' + agent.id;
        if (this.cooldowns.has(key)) continue;
        bestDist = dist;
        clicked = agent;
      }
    }

    if (!clicked) return false;

    // Shock the agent
    clicked.state = AGENT_STATES.SHOCKED;
    clicked.shockTimer = 0;
    clicked.collapseAngle = 0;
    clicked.healProgress = 0;
    clicked.recoveryTimer = 0;
    clicked.hasPackage = false;
    clicked.chasingBug = null;
    clicked.weaponType = null;
    clicked.shockSparks = this._makeSparks(clicked);

    // Find a medic
    const medic = this._findMedic(clicked);

    this.activeHeals.push({
      downedAgent: clicked,
      medicAgent: medic,
      phase: 'shocking',
      timer: 0,
      defibCount: 0,
      noMedicTimer: 0,
      arrivalImpact: 0,  // timer for medic arrival skid effect
    });

    // Notify status
    this.world.callbacks.onStateChange?.(
      this.world.gState, null, undefined, true,
    );

    return true;
  }

  /* ─── FIND MEDIC — rush from far agent ─── */
  _findMedic(downed) {
    const { agents } = this.world;
    let best = null;

    // Pick eligible agent (prefer farthest from different workstation for drama)
    let farBest = null, farDist = 0;
    let nearBest = null, nearDist = Infinity;

    for (const a of agents) {
      if (a === downed) continue;
      if (!MEDIC_ELIGIBLE.includes(a.state)) continue;
      if (a.isMedic) continue;
      if (this.activeHeals.some(h => h.medicAgent === a)) continue;

      const d = Math.hypot(a.x - downed.x, a.y - downed.y);
      if (a.homeNode !== downed.homeNode && d > farDist) {
        farDist = d; farBest = a;
      }
      if (d < nearDist) { nearDist = d; nearBest = a; }
    }

    best = farBest || nearBest;
    if (!best) return null;

    best.isMedic = true;
    best.healTarget = downed;
    best.hasPackage = false;
    best.state = AGENT_STATES.MEDIC_WALKING;
    const side = best.x > downed.x ? 1 : -1;
    best.targetX = downed.x + side * downed.size * 1.8;
    best.targetY = downed.y;

    return best;
  }

  _releaseMedic(medic) {
    if (!medic) return;
    medic.isMedic = false;
    medic.healTarget = null;
    medic._medicTrail = null;
    medic.returnHome();
  }

  /* ─── SPARK PARTICLES ─── */

  _makeSparks(agent) {
    const sparks = [];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      sparks.push({
        x: 0, y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.3 + Math.random() * 0.5,
        maxLife: 0.3 + Math.random() * 0.5,
        size: 1 + Math.random() * 2.5,
      });
    }
    return sparks;
  }

  _updateSparks(sparks, dt) {
    for (const s of sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 200 * dt; // gravity
      s.life -= dt;
    }
  }

  /* ─── MAIN UPDATE ─── */

  update(dt) {
    // Tick cooldowns
    for (const [key, remaining] of this.cooldowns) {
      const v = remaining - dt;
      if (v <= 0) this.cooldowns.delete(key);
      else this.cooldowns.set(key, v);
    }

    for (let i = this.activeHeals.length - 1; i >= 0; i--) {
      const h = this.activeHeals[i];
      h.timer += dt;

      switch (h.phase) {

        /* ── SHOCKING ── */
        case 'shocking':
          h.downedAgent.shockTimer = h.timer;
          this._updateSparks(h.downedAgent.shockSparks, dt);
          if (h.timer >= SHOCK_DUR) {
            h.phase = 'collapsing';
            h.timer = 0;
            h.downedAgent.state = AGENT_STATES.COLLAPSED;
          }
          break;

        /* ── COLLAPSING ── */
        case 'collapsing': {
          const t = Math.min(1, h.timer / COLLAPSE_DUR);
          // Ease-out bounce
          h.downedAgent.collapseAngle = (Math.PI / 2) * this._easeOutBounce(t);
          if (h.timer >= COLLAPSE_DUR) {
            h.phase = 'waiting_medic';
            h.timer = 0;
            if (!h.medicAgent) h.medicAgent = this._findMedic(h.downedAgent);
          }
          break;
        }

        /* ── WAITING FOR MEDIC ── */
        case 'waiting_medic':
          // Tick trail life on medic
          if (h.medicAgent?._medicTrail) {
            for (const tp of h.medicAgent._medicTrail) tp.life -= dt;
          }
          if (h.medicAgent) {
            const dist = Math.hypot(
              h.medicAgent.x - h.downedAgent.x,
              h.medicAgent.y - h.downedAgent.y,
            );
            if (dist < h.downedAgent.size * 2.5) {
              h.phase = 'diagnose';
              h.timer = 0;
              h.arrivalImpact = 0.5; // trigger arrival skid effect
              h.medicAgent.state = AGENT_STATES.MEDIC_HEALING;
              h.medicAgent.facing = h.downedAgent.x > h.medicAgent.x ? 1 : -1;
              h.medicAgent._medicTrail = null; // clear trail
              h.downedAgent.state = AGENT_STATES.BEING_HEALED;
              h.downedAgent.healProgress = 0;
            }
          } else {
            h.noMedicTimer += dt;
            if (h.timer > 1.5) {
              h.medicAgent = this._findMedic(h.downedAgent);
              h.timer = 0;
            }
            // Auto-recover fallback
            if (h.noMedicTimer > AUTO_RECOVER_TIMEOUT) {
              h.phase = 'recovering';
              h.timer = 0;
              h.downedAgent.state = AGENT_STATES.RECOVERING;
              h.downedAgent.recoveryTimer = 0;
            }
          }
          break;

        /* ── DIAGNOSE (medic crouches, scans) ── */
        case 'diagnose':
          if (h.arrivalImpact > 0) h.arrivalImpact -= dt;
          h.downedAgent.healProgress = h.timer / (DIAGNOSE_DUR + DEFIB_DUR + STABILIZE_DUR);
          if (h.timer >= DIAGNOSE_DUR) {
            h.phase = 'defibrillate';
            h.timer = 0;
            h.defibCount = 0;
          }
          break;

        /* ── DEFIBRILLATE (zap jolts) ── */
        case 'defibrillate': {
          const totalHealTime = DIAGNOSE_DUR + DEFIB_DUR + STABILIZE_DUR;
          h.downedAgent.healProgress = (DIAGNOSE_DUR + h.timer) / totalHealTime;
          // Two jolts at 0.25s and 0.55s
          const joltTimes = [0.25, 0.55];
          for (const jt of joltTimes) {
            if (h.timer >= jt && h.defibCount < joltTimes.indexOf(jt) + 1) {
              h.defibCount++;
              h.downedAgent.surprise = 0.6; // body jolt
              // Brief spark burst
              const newSparks = this._makeSparks(h.downedAgent);
              newSparks.forEach(s => { s.life *= 0.4; s.maxLife *= 0.4; s.size *= 0.6; });
              h.downedAgent.shockSparks.push(...newSparks);
            }
          }
          this._updateSparks(h.downedAgent.shockSparks, dt);
          if (h.timer >= DEFIB_DUR) {
            h.phase = 'stabilize';
            h.timer = 0;
          }
          break;
        }

        /* ── STABILIZE (green glow flows in, systems come online) ── */
        case 'stabilize': {
          const totalHealTime = DIAGNOSE_DUR + DEFIB_DUR + STABILIZE_DUR;
          h.downedAgent.healProgress = (DIAGNOSE_DUR + DEFIB_DUR + h.timer) / totalHealTime;
          this._updateSparks(h.downedAgent.shockSparks, dt);
          if (h.timer >= STABILIZE_DUR) {
            h.phase = 'recovering';
            h.timer = 0;
            h.downedAgent.state = AGENT_STATES.RECOVERING;
            h.downedAgent.recoveryTimer = 0;
            this._releaseMedic(h.medicAgent);
          }
          break;
        }

        /* ── RECOVERING (stand up, reboot) ── */
        case 'recovering': {
          h.downedAgent.recoveryTimer = h.timer;
          const t = Math.min(1, h.timer / RECOVERY_DUR);
          h.downedAgent.collapseAngle = (Math.PI / 2) * (1 - this._easeOutBack(t));
          if (h.timer >= RECOVERY_DUR) {
            h.phase = 'done';
            h.downedAgent.state = AGENT_STATES.IDLE;
            h.downedAgent.collapseAngle = 0;
            h.downedAgent.healProgress = 0;
            h.downedAgent.shockSparks = [];
            h.downedAgent._shockDim = 1;
            h.downedAgent.idleTimer = 8 + Math.random() * 15;
            const key = h.downedAgent.homeNode + '_' + h.downedAgent.id;
            this.cooldowns.set(key, HEAL_COOLDOWN);
          }
          break;
        }
      }

      if (h.phase === 'done') {
        this.activeHeals.splice(i, 1);
        if (this.activeHeals.length === 0) {
          this.world.callbacks.onStateChange?.(
            this.world.gState, null, undefined, false,
          );
        }
      }
    }
  }

  /* ─── DRAW EFFECTS ─── */

  drawEffects(ctx, time) {
    for (const h of this.activeHeals) {
      const da = h.downedAgent;
      const ma = h.medicAgent;
      const dayF = this.world.dayF || 0;

      // ── Shock sparks ──
      this._drawSparks(ctx, da);

      // ── Medic speed trail (rushing to patient) ──
      if (ma && h.phase === 'waiting_medic' && ma._medicTrail) {
        this._drawMedicTrail(ctx, ma);
      }

      // ── Medic arrival impact (skid/dust) ──
      if (h.arrivalImpact > 0 && ma) {
        this._drawArrivalImpact(ctx, ma, h.arrivalImpact);
      }

      // ── FAULT indicator above collapsed agent ──
      if (['collapsing', 'waiting_medic', 'diagnose', 'defibrillate'].includes(h.phase)) {
        this._drawFaultLabel(ctx, da, time, dayF);
      }

      // ── Medic hand glow ──
      if (ma && ['diagnose', 'defibrillate', 'stabilize'].includes(h.phase)) {
        this._drawMedicHandGlow(ctx, ma, da, time, h.phase);
      }

      // ── Defibrillator heartbeat ring ──
      if (h.phase === 'defibrillate') {
        this._drawDefibRings(ctx, da, time, h.defibCount);
      }

      // ── Healing flow particles (stabilize phase) ──
      if (h.phase === 'stabilize' && ma) {
        this._drawHealFlow(ctx, ma, da, time);
      }

      // ── Stabilize progress ring ──
      if (['diagnose', 'defibrillate', 'stabilize'].includes(h.phase)) {
        this._drawProgressRing(ctx, da, da.healProgress);
      }

      // ── Recovery burst ──
      if (h.phase === 'recovering') {
        this._drawRecoveryBurst(ctx, da, time);
      }
    }
  }

  _drawSparks(ctx, agent) {
    for (const s of agent.shockSparks) {
      if (s.life <= 0) continue;
      const a = s.life / s.maxLife;
      const px = agent.x + s.x;
      const py = agent.y + agent.bobY + s.y;

      // Spark core
      ctx.fillStyle = '#ffdd00';
      ctx.globalAlpha = a * 0.9;
      ctx.beginPath();
      ctx.arc(px, py, s.size, 0, Math.PI * 2);
      ctx.fill();

      // Mini lightning bolt trail
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = a * 0.5;
      ctx.lineWidth = 0.7;
      const angle = Math.atan2(s.vy, s.vx);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(angle) * s.size * 4, py + Math.sin(angle) * s.size * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawMedicTrail(ctx, medic) {
    const trail = medic._medicTrail;
    if (!trail || trail.length < 2) return;
    const s = medic.size;

    for (let i = 0; i < trail.length; i++) {
      const tp = trail[i];
      if (tp.life <= 0) continue;
      const a = tp.life / 0.35; // normalized alpha

      // Afterimage silhouette (fading green ghost)
      ctx.globalAlpha = a * 0.2;
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.ellipse(tp.x, tp.y, s * 0.35 * a, s * 0.7 * a, 0, 0, Math.PI * 2);
      ctx.fill();

      // Speed line
      ctx.globalAlpha = a * 0.4;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.2;
      const dir = medic.facing;
      ctx.beginPath();
      ctx.moveTo(tp.x - dir * s * 0.5, tp.y - s * 0.2 + i * 2);
      ctx.lineTo(tp.x - dir * s * 1.5, tp.y - s * 0.2 + i * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawArrivalImpact(ctx, medic, timer) {
    const t = 1 - timer / 0.5; // 0→1
    const s = medic.size;

    // Expanding dust ring
    const r = s * (0.8 + t * 2.5);
    ctx.strokeStyle = '#00ff88';
    ctx.globalAlpha = (1 - t) * 0.5;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(medic.x, medic.y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Small dust puffs around landing zone
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 0.5;
      const pr = s * (0.5 + t * 1.8);
      const px = medic.x + Math.cos(angle) * pr;
      const py = medic.y + Math.sin(angle) * pr * 0.4; // flatten vertically
      const da = (1 - t) * 0.3;
      ctx.globalAlpha = da;
      ctx.fillStyle = 'rgba(0,255,136,0.6)';
      ctx.beginPath();
      ctx.arc(px, py, 2 + (1 - t) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  _drawFaultLabel(ctx, agent, time, dayF) {
    const pulse = 0.6 + Math.sin(time * 5) * 0.3;
    const s = agent.size;
    const fx = agent.x;
    const fy = agent.y - s * 0.5;

    // Warning triangle
    ctx.save();
    ctx.translate(fx, fy - s * 0.6);
    ctx.strokeStyle = '#ff3333';
    ctx.fillStyle = '#ff3333';
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 1.5;
    const tr = s * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, -tr);
    ctx.lineTo(-tr * 0.866, tr * 0.5);
    ctx.lineTo(tr * 0.866, tr * 0.5);
    ctx.closePath();
    ctx.stroke();
    // "!" inside
    ctx.font = `bold ${Math.max(7, s * 0.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, tr * 0.05);

    // "FAULT" text
    ctx.font = `bold ${Math.max(8, s * 0.28)}px 'JetBrains Mono',monospace`;
    ctx.globalAlpha = pulse * 0.8;
    ctx.fillText('FAULT', 0, -tr - s * 0.2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawMedicHandGlow(ctx, medic, patient, time, phase) {
    // Glow at medic's extended hand
    const handX = medic.x + medic.facing * medic.size * 0.5;
    const handY = medic.y + medic.bobY + medic.size * 0.15;
    const intensity = phase === 'defibrillate' ? 0.6 + Math.sin(time * 12) * 0.3 : 0.3;
    const r = medic.size * (phase === 'defibrillate' ? 0.6 : 0.4);

    const glow = ctx.createRadialGradient(handX, handY, 0, handX, handY, r);
    glow.addColorStop(0, `rgba(0,255,136,${intensity})`);
    glow.addColorStop(0.5, `rgba(0,255,136,${intensity * 0.3})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(handX, handY, r, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawDefibRings(ctx, agent, time, count) {
    // Expanding heartbeat-style rings on each jolt
    for (let i = 0; i < count; i++) {
      const age = time * 2 + i * 1.5;
      const ringPhase = (age % 1.5) / 1.5;
      if (ringPhase > 0.8) continue;
      const r = agent.size * (0.5 + ringPhase * 3);
      const a = (1 - ringPhase / 0.8) * 0.4;

      ctx.strokeStyle = '#00ff88';
      ctx.globalAlpha = a;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y + agent.bobY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawHealFlow(ctx, medic, patient, time) {
    // Green energy particles streaming from medic toward patient
    const mx = medic.x + medic.facing * medic.size * 0.5;
    const my = medic.y + medic.bobY + medic.size * 0.1;
    const px = patient.x;
    const py = patient.y + patient.bobY;

    for (let i = 0; i < 8; i++) {
      const t = ((time * 1.5 + i * 0.12) % 1);
      const x = mx + (px - mx) * t;
      const y = my + (py - my) * t + Math.sin(t * Math.PI * 3 + i) * 6;
      const a = Math.sin(t * Math.PI) * 0.7;

      ctx.fillStyle = '#00ff88';
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + Math.sin(time * 4 + i) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawProgressRing(ctx, agent, progress) {
    if (progress <= 0) return;
    const s = agent.size;

    // Track ring
    ctx.strokeStyle = 'rgba(0,255,136,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(agent.x, agent.y + agent.bobY, s * 1.0, 0, Math.PI * 2);
    ctx.stroke();

    // Progress arc
    ctx.strokeStyle = '#00ff88';
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(agent.x, agent.y + agent.bobY, s * 1.0,
      -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    // Percentage text
    ctx.fillStyle = '#00ff88';
    ctx.globalAlpha = 0.7;
    ctx.font = `bold ${Math.max(7, s * 0.25)}px 'JetBrains Mono',monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(progress * 100)}%`, agent.x, agent.y - s * 1.25);

    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }

  _drawRecoveryBurst(ctx, agent, time) {
    const t = agent.recoveryTimer / RECOVERY_DUR;
    if (t < 0.2) return;

    // Expanding green ring
    const ringT = Math.min(1, (t - 0.2) / 0.5);
    if (ringT < 1) {
      const r = agent.size * (1 + ringT * 3.5);
      const a = (1 - ringT) * 0.5;
      ctx.strokeStyle = '#00ff88';
      ctx.globalAlpha = a;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow
      const glow = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, r * 0.5);
      glow.addColorStop(0, `rgba(0,255,136,${a * 0.25})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // "ONLINE" text
    if (t > 0.5) {
      const textA = t < 0.7 ? (t - 0.5) / 0.2 : Math.max(0, 1 - (t - 0.8) / 0.2);
      ctx.fillStyle = '#00ff88';
      ctx.globalAlpha = textA * 0.9;
      ctx.font = `bold ${Math.max(9, agent.size * 0.35)}px 'JetBrains Mono',monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('ONLINE', agent.x, agent.y - agent.size * 1.4);
    }

    ctx.globalAlpha = 1;
  }

  /* ─── EASING ─── */

  _easeOutBounce(t) {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }

  _easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
