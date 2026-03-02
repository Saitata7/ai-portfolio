/* ─── WORLD — Scene Manager ───
   Single source of truth for all canvas state.
   Owns the animation loop, resize, mouse tracking.
   ────────────────────────────── */

import Agent, { AGENT_STATES } from './entities/Agent.js';
import Bug from './entities/Bug.js';
import { drawWorkstationTheme, drawWorkstationIcon } from './systems/WorkstationThemes.js';
import BugFightSystem from './systems/BugFightSystem.js';
import SelfHealSystem from './systems/SelfHealSystem.js';
import AmbientTheme from './systems/AmbientTheme.js';
import { getLayoutTier, isTouchDevice } from '../utils/responsive.js';

export const SECTION_DEFS = [
  { label: 'VOICE & NLP',        navQ: 'Where is About Me?',     icon: '🎙️', color: '#00f0ff', section: 'sec-about',      backLabel: 'ABOUT ME',     backDesc: 'My story & expertise' },
  { label: 'COMPUTER VISION',    navQ: 'Where are Projects?',    icon: '👁️', color: '#a855f7', section: 'sec-projects',   backLabel: 'PROJECTS',     backDesc: 'What I\'ve built' },
  { label: 'CODE & ENGINEERING', navQ: 'Where are Skills?',      icon: '💻', color: '#00ff88', section: 'sec-skills',     backLabel: 'SKILLS',       backDesc: 'My tech stack' },
  { label: 'ML TRAINING',        navQ: 'Where is Experience?',   icon: '🧠', color: '#ff00aa', section: 'sec-experience', backLabel: 'EXPERIENCE',   backDesc: 'Career timeline' },
  { label: 'DATA & ANALYTICS',   navQ: 'Where are Live Demos?',  icon: '📊', color: '#ffaa00', section: 'sec-demos',      backLabel: 'LIVE DEMOS',   backDesc: 'Try it yourself' },
  { label: 'DEPLOY & CLOUD',     navQ: 'Where is Contact?',      icon: '🚀', color: '#00aaff', section: 'sec-contact',    backLabel: 'CONTACT',      backDesc: 'Let\'s connect' },
];

export const CONN_DEFS = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[0,2],[3,5]];

export default class World {
  constructor(canvas, container, callbacks) {
    this.canvas = canvas;
    this.container = container;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;

    // Single source of truth
    this.gState = 'working'; // 'working' | 'watching' | 'navigating' | 'nav_scrolling'
    this.mouse = { x: -999, y: -999 };
    this.time = 0;
    this.W = 0;
    this.H = 0;
    this.dpr = 1;
    this.canvasRect = null;

    // Entity pools
    this.agents = [];
    this.nodes = [];
    this.conns = [];
    this.bgDots = [];

    // Bug system
    this.bugZone = null;
    this.bugs = [];
    this.beams = [];
    this.bugFightActive = false;
    this.bugFightSystem = new BugFightSystem(this);
    this.selfHealSystem = new SelfHealSystem(this);
    this.bugZoneShake = 0;
    this.bugZoneHintShown = false;

    // Responsive
    this.layoutTier = 'lg';
    this._isTouch = isTouchDevice();

    // Ambient theme
    this.ambientTheme = new AmbientTheme();

    // Transition / navigation
    this.trans = 0;       // 0 = working, 1 = watching (visual dim)
    this.navTarget = -1;
    this.navTimer = 0;
    this.clickPoint = { x: 0, y: 0 };

    // Workstation flip state (Phase 4)
    this.flipProgress = 0;
    this.flipTarget = -1;

    // Animation
    this.raf = null;
    this.lastT = 0;

    // Bind methods
    this._loop = this._loop.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onMouse = this._onMouse.bind(this);
    this._onScroll = this._onScroll.bind(this);
  }

  /* ─── LIFECYCLE ─── */

  start() {
    this._onResize();
    window.addEventListener('resize', this._onResize);
    document.addEventListener('mousemove', this._onMouse);
    window.addEventListener('scroll', this._onScroll, { passive: true });
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this._loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('mousemove', this._onMouse);
    window.removeEventListener('scroll', this._onScroll);
  }

  setTheme(theme) {
    this.ambientTheme.setTheme(theme);
  }

  pause() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  resume() {
    if (!this.raf) {
      this.lastT = performance.now();
      this.raf = requestAnimationFrame(this._loop);
    }
  }

  /* ─── DISPATCH — State transitions ─── */

  dispatch(action, payload) {
    switch (action) {
      case 'SET_WATCHING':
        if (this.gState !== 'working') return;
        this.gState = 'watching';
        this.clickPoint = { x: payload?.x ?? this.W / 2, y: payload?.y ?? this.H / 2 };
        // Distance-based freeze delay
        this.agents.forEach(a => {
          const dist = Math.hypot(a.x - this.clickPoint.x, a.y - this.clickPoint.y);
          a.freezeDelay = dist / 800;
          a.frozenYet = false;
        });
        this.callbacks.onStateChange('watching');
        break;

      case 'SET_WORKING': {
        this.gState = 'working';
        this.navTarget = -1;
        this.flipTarget = -1;
        this.flipProgress = 0;
        // Don't interrupt self-heal states
        const protectedStates = [AGENT_STATES.SHOCKED, AGENT_STATES.COLLAPSED,
          AGENT_STATES.BEING_HEALED, AGENT_STATES.RECOVERING,
          AGENT_STATES.MEDIC_WALKING, AGENT_STATES.MEDIC_HEALING];
        this.agents.forEach(a => {
          if (!protectedStates.includes(a.state)) a.returnHome();
        });
        this.callbacks.onStateChange('working');
        break;
      }

      case 'NAVIGATE':
        if (this.gState === 'navigating' || this.gState === 'nav_scrolling') return;
        this.gState = 'navigating';
        this.navTarget = payload.nodeIndex;
        this.navTimer = 0;
        this.flipTarget = payload.nodeIndex;
        this.flipProgress = 0;
        this.agents.forEach(a => a.navToNode(payload.nodeIndex, this.nodes));
        this.callbacks.onStateChange('navigating', SECTION_DEFS[payload.nodeIndex].label);
        break;

      case 'BUG_BREACH':
        this.bugFightActive = true;
        this.callbacks.onStateChange(this.gState, null, true); // pass bugFight flag
        break;

      case 'BUG_CONTAINED':
        this.bugFightActive = false;
        this.agents.forEach(a => {
          if (a.state === 'bug_chase') a.returnHome();
        });
        this.callbacks.onStateChange(this.gState, null, false);
        break;
    }
  }

  /* ─── LAYOUT ─── */

  _buildNodes(W, H) {
    const t = this.layoutTier;
    let cols, rows, nodeW, nodeH;
    if (t === 'xs')      { cols = 2; rows = 3; nodeW = 90;  nodeH = 56; }
    else if (t === 'sm') { cols = 2; rows = 3; nodeW = 100; nodeH = 62; }
    else if (t === 'md') { cols = 3; rows = 2; nodeW = 110; nodeH = 70; }
    else                 { cols = 3; rows = 2; nodeW = 130; nodeH = 80; }

    const marginX = t === 'xs' ? 80 : t === 'sm' ? 120 : 220;
    const marginY = t === 'xs' ? 200 : t === 'sm' ? 220 : 280;
    const maxGx = t === 'xs' ? 160 : t === 'sm' ? 200 : 280;
    const maxGy = t === 'xs' ? 130 : t === 'sm' ? 150 : 200;
    const gx = Math.min(maxGx, (W - marginX) / cols);
    const gy = Math.min(maxGy, (H - marginY) / rows);
    const sx = (W - gx * (cols - 1)) / 2;
    const sy = (H - gy * (rows - 1)) / 2 + 10;

    return SECTION_DEFS.map((sd, i) => ({
      x: sx + (i % cols) * gx,
      y: sy + Math.floor(i / cols) * gy,
      w: nodeW,
      h: nodeH,
      ...sd,
      progress: Math.random(),
      pSpeed: 0.003 + Math.random() * 0.005,
      phase: Math.random() * Math.PI * 2,
      flipProgress: 0,
    }));
  }

  _initLayout(W, H) {
    this.nodes = this._buildNodes(W, H);
    this.conns = CONN_DEFS.map(([a, b]) => ({ from: a, to: b }));

    const t = this.layoutTier;
    const agentsPerNode = t === 'xs' ? 1 : 2;
    const agentSize = t === 'xs' ? 18 : t === 'sm' ? 22 : 28;

    this.agents = [];
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = 0; j < agentsPerNode; j++) {
        this.agents.push(new Agent(i, j, this.nodes, agentSize));
      }
    }

    const dotCount = t === 'xs' ? 20 : t === 'sm' ? 35 : 60;
    this.bgDots = [];
    for (let i = 0; i < dotCount; i++) {
      this.bgDots.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.2 + 0.3,
      });
    }

    // Security Vault — bottom right
    this._initBugZone(W, H);

  }

  _updateLayout(W, H) {
    const newNodes = this._buildNodes(W, H);

    // Preserve node state, update positions
    newNodes.forEach((nn, i) => {
      const old = this.nodes[i];
      if (old) {
        nn.progress = old.progress;
        nn.pSpeed = old.pSpeed;
        nn.phase = old.phase;
        nn.flipProgress = old.flipProgress;
      }
    });

    const oldNodes = this.nodes;
    this.nodes = newNodes;

    // Shift agents by position delta — no teleporting
    this.agents.forEach(a => {
      const oldNode = oldNodes[a.homeNode];
      const newNode = newNodes[a.homeNode];
      if (oldNode && newNode) {
        const dx = newNode.x - oldNode.x;
        const dy = newNode.y - oldNode.y;
        a.x += dx;
        a.y += dy;
        const off = newNode.w * 0.27;
        a.homeX = newNode.x + (a.id === 0 ? -off : off);
        a.homeY = newNode.y + newNode.h / 2 + (this.layoutTier === 'xs' ? 28 : 40);
        a.targetX += dx;
        a.targetY += dy;
      }
    });

    // Keep bgDots, clamp to new bounds
    this.bgDots.forEach(d => {
      if (d.x > W) d.x = Math.random() * W;
      if (d.y > H) d.y = Math.random() * H;
    });

    // Update bug zone position
    this._initBugZone(W, H);
  }

  _initBugZone(W, H) {
    const t = this.layoutTier;
    const zw = t === 'xs' ? 60 : t === 'sm' ? 75 : 90;
    const zh = t === 'xs' ? 40 : t === 'sm' ? 50 : 60;
    const mr = t === 'xs' ? 10 : 30;
    const mb = t === 'xs' ? 50 : 80;
    this.bugZone = {
      x: W - zw - mr,
      y: H - zh - mb,
      w: zw,
      h: zh,
      lidOpen: 0,
      targetLidOpen: 0,
      alarmPulse: 0,
      shakeTimer: Math.random() * 10,
      containsPoint(px, py) {
        return px >= this.x - 10 && px <= this.x + this.w + 10
          && py >= this.y - 10 && py <= this.y + this.h + 10;
      },
    };

    // Seed contained bugs (visual only)
    if (this.bugs.length === 0 && !this.bugFightActive) {
      const cx = this.bugZone.x + zw / 2;
      const cy = this.bugZone.y + zh / 2;
      const seedCount = t === 'xs' ? 2 : 4;
      for (let i = 0; i < seedCount; i++) {
        const b = new Bug(
          cx + (Math.random() - 0.5) * zw * 0.6,
          cy + (Math.random() - 0.5) * zh * 0.4,
          { x: cx, y: cy },
        );
        b.state = 'contained';
        b.size = 4 + Math.random() * 2;
        this.bugs.push(b);
      }
    }
  }

  /* ─── EVENTS ─── */

  _onResize() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    const W = rect.width, H = rect.height;

    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.W = W;
    this.H = H;
    this.canvasRect = rect;

    const oldTier = this.layoutTier;
    this.layoutTier = getLayoutTier(W);

    if (this.agents.length === 0) this._initLayout(W, H);
    else if (oldTier !== this.layoutTier) this._initLayout(W, H);
    else this._updateLayout(W, H);
  }

  _onMouse(e) {
    if (!this.canvasRect) return;
    this.mouse.x = e.clientX - this.canvasRect.left;
    this.mouse.y = e.clientY - this.canvasRect.top;
  }

  _onScroll() {
    // Re-cache rect on scroll (it shifts with page scroll)
    if (this.container) {
      this.canvasRect = this.container.getBoundingClientRect();
    }
  }

  handleClick(cssX, cssY) {
    if (this.gState === 'navigating') return;

    // If waiting for user to click the flipped box — check if click is on the target node
    if (this.gState === 'nav_waiting_click') {
      const targetNode = this.nodes[this.navTarget];
      if (targetNode) {
        const dx = cssX - targetNode.x;
        const dy = cssY - targetNode.y;
        const onBox = Math.abs(dx) < targetNode.w / 2 + 20 && Math.abs(dy) < targetNode.h / 2 + 20;
        if (onBox) {
          // User clicked the flipped box — scroll to section
          const sec = SECTION_DEFS[this.navTarget].section;
          this.callbacks.onNavigationComplete(sec);
          // Reset and return to working
          if (this.flipTarget >= 0 && this.nodes[this.flipTarget]) {
            this.nodes[this.flipTarget].flipProgress = 0;
          }
          this.dispatch('SET_WORKING');
          return;
        }
      }
      // Clicked elsewhere — cancel navigation, go back to working
      if (this.flipTarget >= 0 && this.nodes[this.flipTarget]) {
        this.nodes[this.flipTarget].flipProgress = 0;
      }
      this.dispatch('SET_WORKING');
      return;
    }

    // Check bug zone click
    if (this.bugZone && this.bugZone.containsPoint(cssX, cssY)) {
      if (!this.bugFightActive) {
        this.bugZone.targetLidOpen = 1;
        this.bugZoneHintShown = true;
        this.bugs = [];
        this.dispatch('BUG_BREACH');
        this.bugFightSystem.spawnBugs(this.layoutTier === 'xs' ? 3 : 7);
      }
      return;
    }

    // If clicking elsewhere during bug fight, seal the vault
    if (this.bugFightActive) {
      this.bugZone.targetLidOpen = 0;
      this.bugFightSystem.sealVault();
      return;
    }

    // Agent shock works in both working and watching states
    if (!this.bugFightActive && this.selfHealSystem.tryShockAgent(cssX, cssY)) {
      // If we were watching, return to working first so agents unfreeze
      if (this.gState === 'watching') this.dispatch('SET_WORKING');
      return; // consumed
    }

    if (this.gState === 'working') {
      this.dispatch('SET_WATCHING', { x: cssX, y: cssY });
    } else if (this.gState === 'watching') {
      this.dispatch('SET_WORKING');
    }
  }

  /* ─── ANIMATION LOOP ─── */

  _loop(now) {
    const dt = Math.min((now - this.lastT) / 1000, 0.05);
    this.lastT = now;
    this.time += dt;
    this.dt = dt;

    // Transition fade
    const wantTrans = this.gState === 'watching' ? 1 : 0;
    this.trans += (wantTrans - this.trans) * (1 - Math.pow(0.92, dt * 60));

    // Navigation timing (all in rAF — no setTimeout)
    this._updateNavigation(dt);

    // Clear
    this.ctx.clearRect(0, 0, this.W, this.H);

    // Ambient theme (behind everything)
    this.ambientTheme.update(dt);
    this.ambientTheme.draw(this.ctx, this.W, this.H, this.time);
    this.dayF = this.ambientTheme.getDayFactor(); // 0=night, 1=noon

    // Bug fight system update
    this.bugFightSystem.update(dt);

    // Self-heal system update
    this.selfHealSystem.update(dt);

    // Bug zone lid animation
    if (this.bugZone) {
      this.bugZone.lidOpen += (this.bugZone.targetLidOpen - this.bugZone.lidOpen) * (1 - Math.pow(0.9, dt * 60));
      if (this.bugFightActive) {
        this.bugZone.alarmPulse += dt * 4;
      }
      this.bugZone.shakeTimer += dt;
    }

    // Draw layers
    this._drawBG();
    this._drawConns();
    this._drawNodes();
    this._drawBugZone();

    // Draw bugs
    this.bugs.forEach(b => b.draw(this.ctx, this.time));

    // Update & draw agents
    this.agents.forEach(a => a.update(dt, this.time, this));
    this.agents.sort((a, b) => a.y - b.y);
    this.agents.forEach(a => a.draw(this.ctx, this.time, this));

    // Draw beams
    this.beams.forEach(b => b.draw(this.ctx, this.time, this));

    // Self-heal effects (sparks, healing glow, recovery burst)
    this.selfHealSystem.drawEffects(this.ctx, this.time);

    // Mouse glow when watching
    this._drawWatchingEffects();

    // Cinematic theme transition sweep
    const themeTrans = this.ambientTheme.getTransition();
    if (themeTrans.active) {
      this._drawThemeTransition(themeTrans);
    }

    // Scan line — darker tint in day
    this.ctx.fillStyle = this.dayF > 0.3
      ? 'rgba(0,80,120,0.02)'
      : 'rgba(0,240,255,0.01)';
    this.ctx.fillRect(0, (this.time * 50) % this.H, this.W, 2);

    this.raf = requestAnimationFrame(this._loop);
  }

  _updateNavigation(dt) {
    if (this.gState === 'navigating') {
      const allArrived = this.agents.every(a => a.state === 'nav_arrived');
      if (allArrived) {
        this.navTimer += dt;

        // Flip animation progress
        if (this.flipTarget >= 0) {
          this.flipProgress = Math.min(1, this.navTimer / 0.6);
          this.nodes[this.flipTarget].flipProgress = this.flipProgress;
        }

        if (this.navTimer > 0.8) {
          // Flip done — wait for user click on the box
          this.gState = 'nav_waiting_click';
          this.callbacks.onStateChange('nav_waiting_click', SECTION_DEFS[this.navTarget].backLabel);
        }
      }
    }

    // nav_waiting_click: box is flipped, pulsing, waiting for user to click it
    // (handleClick handles the actual click → scroll)
  }

  /* ─── DRAW HELPERS ─── */

  _drawBG() {
    const { W, H, bgDots, ctx } = this;
    const dotSpeed = this.gState === 'watching' ? 0.2 : 1;
    const period = this.ambientTheme.period;
    const gridInterval = this.layoutTier === 'xs' ? 80 : 60;

    // Period-aware grid tint — adapt for bright sky in daytime
    const dayF = this.ambientTheme.getDayFactor();
    const gridColors = {
      morning:   dayF > 0.3 ? 'rgba(100,70,40,0.04)' : 'rgba(255,200,150,0.012)',
      afternoon: dayF > 0.3 ? 'rgba(20,60,120,0.05)' : 'rgba(0,240,255,0.015)',
      evening:   dayF > 0.3 ? 'rgba(120,60,30,0.04)' : 'rgba(255,150,100,0.012)',
      night:     'rgba(100,150,255,0.015)',
    };
    ctx.strokeStyle = gridColors[period] || gridColors.afternoon;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += gridInterval) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridInterval) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Floating dots — batched into single path
    const dotColors = {
      morning:   dayF > 0.3 ? 'rgba(100,70,40,0.08)' : 'rgba(255,200,150,0.04)',
      afternoon: dayF > 0.3 ? 'rgba(20,60,120,0.10)' : 'rgba(0,240,255,0.05)',
      evening:   dayF > 0.3 ? 'rgba(120,60,30,0.08)' : 'rgba(255,150,100,0.04)',
      night:     'rgba(100,160,255,0.05)',
    };
    ctx.fillStyle = dotColors[period] || dotColors.afternoon;
    ctx.beginPath();
    bgDots.forEach(p => {
      p.x += p.vx * dotSpeed * this.dt * 60;
      p.y += p.vy * dotSpeed * this.dt * 60;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      ctx.moveTo(p.x + p.r, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    });
    ctx.fill();
  }

  _drawConns() {
    const { ctx, nodes, conns, time, gState, dayF } = this;
    conns.forEach((c, ci) => {
      const f = nodes[c.from], t = nodes[c.to];
      const pulseSpeed = gState === 'watching' ? 0.3 : 1;
      const a = 0.05 + Math.sin(time * 2 * pulseSpeed + ci) * 0.02;

      // Darker connection lines in daylight for visibility
      ctx.strokeStyle = dayF > 0.3
        ? `rgba(0,120,160,${a + dayF * 0.06})`
        : `rgba(0,240,255,${a})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 10]);
      const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2 - 15;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(mx, my, t.x, t.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Data pulse on connection
      if (gState === 'working') {
        const p = (time * 0.3 + ci * 0.15) % 1;
        const px = f.x + (t.x - f.x) * p;
        const py = f.y + (t.y - f.y) * p - Math.sin(p * Math.PI) * 15;
        ctx.fillStyle = dayF > 0.3
          ? `rgba(0,100,150,${0.35 + Math.sin(time * 4) * 0.1})`
          : `rgba(0,240,255,${0.25 + Math.sin(time * 4) * 0.1})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  _drawNodes() {
    const { ctx, nodes, time, gState, navTarget, trans, dayF } = this;

    // Theme-aware box colors
    const boxFillDark = isT => isT ? [12,17,30,0.95] : [12,17,30,0.85];
    const boxFillLight = isT => isT ? [255,255,255,0.95] : [245,248,255,0.92];
    const lerpC = (d, l, f) => {
      const r = d.map((v,i) => v + (l[i] - v) * f);
      return `rgba(${Math.round(r[0])},${Math.round(r[1])},${Math.round(r[2])},${r[3].toFixed(2)})`;
    };
    // Darken a hex color for readability on white backgrounds
    const darkenHex = (hex, f) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return `rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;
    };
    const isDay = dayF > 0.3;

    nodes.forEach((n, ni) => {
      const isTarget = gState === 'navigating' && ni === navTarget;
      const fp = n.flipProgress || 0;

      // ── Box flip animation ──
      let scaleX = 1;
      let showBack = false;
      if (fp > 0) {
        if (fp < 0.5) {
          scaleX = 1 - Math.pow(fp * 2, 2);
        } else {
          scaleX = Math.pow((fp - 0.5) * 2, 0.5);
          showBack = true;
        }
      }

      ctx.save();
      ctx.translate(n.x, n.y);
      if (fp > 0) {
        ctx.scale(Math.max(0.01, scaleX), 1 + (1 - Math.abs(scaleX)) * 0.06);
      }

      // Drop shadow in day mode — gives boxes depth
      if (isDay) {
        ctx.fillStyle = `rgba(0,20,60,${0.10 * dayF})`;
        ctx.beginPath();
        ctx.roundRect(-n.w / 2 + 3, -n.h / 2 + 4, n.w, n.h, 14);
        ctx.fill();
      }

      // Glow
      const glowR = n.w * (isTarget ? 1.3 : 0.85);
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      gg.addColorStop(0, n.color + (isTarget ? '28' : '0d'));
      gg.addColorStop(1, 'transparent');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Box — dark in night, clean white glass in day
      ctx.fillStyle = lerpC(boxFillDark(isTarget), boxFillLight(isTarget), dayF);
      ctx.beginPath();
      ctx.roundRect(-n.w / 2, -n.h / 2, n.w, n.h, 14);
      ctx.fill();

      // Border — stronger and darker in day for definition
      const ba = isTarget ? 0.7 : (isDay ? 0.5 : 0.18) + Math.sin(time * 3 + n.phase) * 0.06;
      ctx.strokeStyle = isDay ? darkenHex(n.color, 0.6) : n.color;
      ctx.globalAlpha = ba;
      ctx.lineWidth = isTarget ? 2.5 : (isDay ? 1.8 : 1);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Edge highlight during flip midpoint
      if (fp > 0 && Math.abs(scaleX) < 0.3) {
        const edgeAlpha = (0.3 - Math.abs(scaleX)) / 0.3;
        ctx.strokeStyle = n.color;
        ctx.globalAlpha = edgeAlpha * 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -n.h / 2);
        ctx.lineTo(0, n.h / 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (showBack) {
        // ── Back face — section info ──
        const backLabelSz = Math.max(10, Math.round(n.w * 0.1));
        ctx.font = `bold ${backLabelSz}px 'JetBrains Mono',monospace`;
        ctx.fillStyle = isDay ? darkenHex(n.color, 0.5) : n.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.backLabel, 0, -10);

        const backDescSz = Math.max(8, Math.round(n.w * 0.07));
        ctx.font = `${backDescSz}px 'Outfit',sans-serif`;
        ctx.fillStyle = isDay ? '#2a3450' : '#8a94b0';
        ctx.fillText(n.backDesc, 0, 6);

        // "Click to go" prompt — pulsing
        if (gState === 'nav_waiting_click') {
          const clickSz = Math.max(8, Math.round(n.w * 0.07));
          ctx.font = `bold ${clickSz}px 'JetBrains Mono',monospace`;
          ctx.fillStyle = n.color;
          ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.4;
          ctx.fillText(this._isTouch ? '▸ TAP TO GO' : '▸ CLICK TO GO', 0, 24);

          // Pulsing border glow
          ctx.strokeStyle = n.color;
          ctx.globalAlpha = 0.3 + Math.sin(time * 4) * 0.2;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-n.w / 2 - 4, -n.h / 2 - 4, n.w + 8, n.h + 8, 16);
          ctx.stroke();
        } else {
          ctx.fillStyle = n.color;
          ctx.globalAlpha = 0.4 + Math.sin(time * 4) * 0.2;
          ctx.font = '12px sans-serif';
          ctx.fillText('↓', 0, 24);
        }
        ctx.globalAlpha = 1;
      } else {
        // ── Front face — workstation ──

        // Pulsing ring when navigating target
        if (isTarget) {
          const pr = n.w * 0.65 + Math.sin(time * 4) * 10;
          ctx.strokeStyle = n.color;
          ctx.globalAlpha = 0.2 + Math.sin(time * 3) * 0.1;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, pr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Progress bar (only when working)
        if (gState === 'working') {
          n.progress += n.pSpeed * this.dt * 60;
          if (n.progress > 1) n.progress = 0;
          const bw = n.w - 28, by = n.h / 2 - 13;
          ctx.fillStyle = isDay ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.03)';
          ctx.beginPath();
          ctx.roundRect(-bw / 2, by, bw, 4, 2);
          ctx.fill();
          ctx.fillStyle = isDay ? darkenHex(n.color, 0.6) : n.color;
          ctx.globalAlpha = isDay ? 0.8 : 0.45;
          ctx.beginPath();
          ctx.roundRect(-bw / 2, by, bw * n.progress, 4, 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Theme decoration — behind everything, centered in box
        ctx.save();
        ctx.translate(0, -4);
        drawWorkstationTheme(ctx, n, time, trans, dayF);
        ctx.restore();

        // Icon — canvas-drawn, top area of box
        ctx.save();
        ctx.translate(0, -n.h * 0.2);
        drawWorkstationIcon(ctx, n, dayF);
        ctx.restore();

        // Label — below center. Darkened color in day for readability on white boxes
        const labelSz = Math.max(9, Math.round(n.w * 0.08));
        ctx.font = `bold ${labelSz}px 'JetBrains Mono',monospace`;
        ctx.fillStyle = isDay ? darkenHex(n.color, 0.45) : n.color;
        ctx.globalAlpha = isDay ? 1 : 0.85;
        ctx.fillText(n.label, 0, n.h * 0.28);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    });
  }

  _drawBugZone() {
    const z = this.bugZone;
    if (!z) return;
    const { ctx, time, bugFightActive } = this;

    // Shake when bugs are inside and restless
    const shakeX = !bugFightActive
      ? Math.sin(z.shakeTimer * 15) * (Math.sin(z.shakeTimer * 0.5) > 0.85 ? 2 : 0)
      : 0;

    ctx.save();
    ctx.translate(z.x + z.w / 2 + shakeX, z.y + z.h / 2);

    // Vault container
    const hw = z.w / 2, hh = z.h / 2;

    // Outer border — double line (stronger in day for visibility)
    const dayVault = this.dayF > 0.3;
    ctx.strokeStyle = bugFightActive ? '#ff3333' : (dayVault ? '#008855' : '#00ff88');
    ctx.globalAlpha = dayVault ? 0.5 : 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-hw - 3, -hh - 3, z.w + 6, z.h + 6, 8);
    ctx.stroke();

    // Hazard dashes on outer border
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = dayVault ? 0.25 : 0.15;
    ctx.beginPath();
    ctx.roundRect(-hw - 6, -hh - 6, z.w + 12, z.h + 12, 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner fill — frosted white in day, dark in night
    ctx.fillStyle = dayVault ? 'rgba(235,242,252,0.90)' : 'rgba(6,8,13,0.9)';
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, z.w, z.h, 6);
    ctx.fill();

    // Inner border
    ctx.strokeStyle = bugFightActive ? '#ff3333' : (dayVault ? '#008855' : '#00ff88');
    ctx.globalAlpha = dayVault ? 0.4 : 0.25;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Lid hatch (top edge, opens upward)
    const lidY = -hh - z.lidOpen * 12;
    ctx.strokeStyle = bugFightActive ? '#ff3333' : '#00ff88';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-hw + 5, lidY);
    ctx.lineTo(hw - 5, lidY);
    ctx.stroke();

    // Shield icon above vault
    const shieldSz = this.layoutTier === 'xs' ? 12 : 16;
    ctx.font = `${shieldSz}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.7;
    ctx.fillText('🛡️', 0, -hh - 18);
    ctx.globalAlpha = 1;

    // Label
    const bugLabelSz = this.layoutTier === 'xs' ? 6 : 7;
    ctx.font = `bold ${bugLabelSz}px 'JetBrains Mono',monospace`;
    ctx.textAlign = 'center';
    if (bugFightActive) {
      const alarmAlpha = 0.5 + Math.sin(z.alarmPulse) * 0.3;
      ctx.fillStyle = '#ff3333';
      ctx.globalAlpha = alarmAlpha;
      ctx.fillText('⚠️ BREACH!', 0, hh + 12);
    } else {
      ctx.fillStyle = this.dayF > 0.3 ? '#006644' : '#00ff88';
      ctx.globalAlpha = this.dayF > 0.3 ? 0.8 : 0.5;
      ctx.fillText('SECURITY VAULT', 0, hh + 12);
    }
    ctx.globalAlpha = 1;

    // Hint text — only before first click
    if (!this.bugZoneHintShown && !bugFightActive) {
      ctx.font = "7px 'Outfit',sans-serif";
      ctx.fillStyle = this.dayF > 0.3 ? '#3a4260' : '#6a7490';
      ctx.globalAlpha = 0.4 + Math.sin(time * 2) * 0.15;
      ctx.fillText('click to test defenses', 0, hh + 24);
      ctx.globalAlpha = 1;
    }

    // Alarm glow when breached
    if (bugFightActive) {
      const glowAlpha = 0.08 + Math.sin(z.alarmPulse) * 0.05;
      const alarmGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, z.w);
      alarmGlow.addColorStop(0, `rgba(255,51,51,${glowAlpha})`);
      alarmGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = alarmGlow;
      ctx.beginPath();
      ctx.arc(0, 0, z.w, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawWatchingEffects() {
    const { ctx, trans, mouse, W, H, dayF } = this;

    // Subtle vignette during watching — lighter in day mode
    if (trans > 0.1) {
      const vigAlpha = dayF > 0.3 ? 0.04 : 0.08;
      const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, `rgba(0,0,0,${vigAlpha * trans})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    // Mouse glow when watching
    if (trans > 0.1) {
      const glowColor = dayF > 0.3 ? '0,100,180' : '255,0,170';
      const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 160);
      mg.addColorStop(0, `rgba(${glowColor},${0.08 * trans})`);
      mg.addColorStop(0.5, `rgba(${glowColor},${0.03 * trans})`);
      mg.addColorStop(1, 'transparent');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 160, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ─── CINEMATIC THEME TRANSITION ─── */

  _drawThemeTransition(tr) {
    const { ctx, W, H, time } = this;
    const p = tr.progress;
    const sweepX = p * (W + 120) - 60;
    const toDay = tr.toDay;

    ctx.save();

    // Wide atmospheric wash
    const washW = W * 0.35;
    const wash = ctx.createLinearGradient(sweepX - washW, 0, sweepX + washW * 0.3, 0);
    if (toDay) {
      wash.addColorStop(0, 'transparent');
      wash.addColorStop(0.4, `rgba(255,230,150,${0.06 * (1 - p)})`);
      wash.addColorStop(0.7, `rgba(255,200,100,${0.03 * (1 - p)})`);
      wash.addColorStop(1, 'transparent');
    } else {
      wash.addColorStop(0, 'transparent');
      wash.addColorStop(0.4, `rgba(60,80,200,${0.06 * (1 - p)})`);
      wash.addColorStop(0.7, `rgba(40,50,160,${0.03 * (1 - p)})`);
      wash.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = wash;
    ctx.fillRect(sweepX - washW, 0, washW * 1.3, H);

    // Main sweep band
    const bandW = 50;
    const intensity = Math.sin(p * Math.PI);
    const bandGrad = ctx.createLinearGradient(sweepX - bandW, 0, sweepX + bandW, 0);
    if (toDay) {
      bandGrad.addColorStop(0, 'transparent');
      bandGrad.addColorStop(0.3, `rgba(255,240,180,${0.15 * intensity})`);
      bandGrad.addColorStop(0.5, `rgba(255,245,200,${0.25 * intensity})`);
      bandGrad.addColorStop(0.7, `rgba(255,240,180,${0.15 * intensity})`);
      bandGrad.addColorStop(1, 'transparent');
    } else {
      bandGrad.addColorStop(0, 'transparent');
      bandGrad.addColorStop(0.3, `rgba(100,120,255,${0.12 * intensity})`);
      bandGrad.addColorStop(0.5, `rgba(140,160,255,${0.20 * intensity})`);
      bandGrad.addColorStop(0.7, `rgba(100,120,255,${0.12 * intensity})`);
      bandGrad.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = bandGrad;
    ctx.fillRect(sweepX - bandW, 0, bandW * 2, H);

    // Center line
    const lineAlpha = 0.35 * intensity;
    ctx.strokeStyle = toDay
      ? `rgba(255,245,200,${lineAlpha})`
      : `rgba(140,160,255,${lineAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sweepX, 0);
    ctx.lineTo(sweepX, H);
    ctx.stroke();

    // Sparkle particles
    for (let i = 0; i < 12; i++) {
      const phase = time * 12 + i * 2.1;
      const sy = (Math.sin(phase) * 0.5 + 0.5) * H;
      const sx = sweepX + Math.sin(time * 18 + i * 3.7) * 25;
      const sr = 1 + Math.sin(time * 8 + i * 1.3) * 0.8;
      const sa = (0.4 + Math.sin(time * 10 + i * 2) * 0.3) * intensity;

      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
      sg.addColorStop(0, toDay
        ? `rgba(255,240,180,${sa * 0.5})`
        : `rgba(140,170,255,${sa * 0.5})`);
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = toDay
        ? `rgba(255,250,220,${sa})`
        : `rgba(180,200,255,${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flash ring on each robot as wave passes
    for (const agent of this.agents) {
      const dist = agent.x - sweepX;
      if (dist > -20 && dist < 60) {
        const nearness = 1 - Math.abs(dist - 20) / 40;
        const flashR = agent.size * 1.2;
        const fg = ctx.createRadialGradient(
          agent.x, agent.y, agent.size * 0.3,
          agent.x, agent.y, flashR,
        );
        fg.addColorStop(0, toDay
          ? `rgba(255,240,180,${0.25 * nearness})`
          : `rgba(140,170,255,${0.25 * nearness})`);
        fg.addColorStop(0.6, toDay
          ? `rgba(255,220,120,${0.08 * nearness})`
          : `rgba(100,130,255,${0.08 * nearness})`);
        fg.addColorStop(1, 'transparent');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, flashR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
