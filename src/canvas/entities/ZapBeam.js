/* ─── ZAP BEAM ───
   Energy arc from agent antenna to bug.
   Curved bezier with electric crackle effect.
   Lasts 0.6 seconds.
   ─────────────── */

export default class ZapBeam {
  constructor(agent, bug) {
    this.agent = agent;
    this.bug = bug;
    this.life = 0.6;
    this.maxLife = 0.6;
    this.zIndex = 3;
  }

  update(dt) {
    this.life -= dt;
  }

  draw(ctx, time) {
    if (this.life <= 0) return;

    const progress = 1 - (this.life / this.maxLife);
    const s = this.agent.size;

    // Antenna tip position (accounting for agent facing and translation)
    const ax = this.agent.x;
    const ay = this.agent.y + this.agent.bobY - s * 0.9;
    const bx = this.bug.x;
    const by = this.bug.y;

    // Bezier control point — animated wobble
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2 - 25 * Math.sin(time * 12);

    // Multi-layer beam glow (outer → inner)
    const beamWidth = 2 + Math.sin(time * 20) * 0.8;
    const layers = [
      { w: beamWidth + 5, alpha: 0.08, color: this.agent.color },
      { w: beamWidth + 2, alpha: 0.25, color: this.agent.color },
      { w: beamWidth, alpha: 0.7, color: this.agent.color },
      { w: beamWidth - 1, alpha: 0.3, color: '#ffffff' },
    ];

    layers.forEach(l => {
      ctx.strokeStyle = l.color;
      ctx.globalAlpha = l.alpha * (0.4 + progress * 0.6);
      ctx.lineWidth = l.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.stroke();
    });

    // Electric crackle — random offshoots along beam
    const segments = 4;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      // Point on quadratic bezier
      const px = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx;
      const py = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * by;
      const offAngle = Math.sin(time * 30 + i * 7) * Math.PI;
      const offLen = 5 + Math.sin(time * 15 + i * 3) * 8;

      ctx.strokeStyle = this.agent.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(
        px + Math.cos(offAngle) * offLen,
        py + Math.sin(offAngle) * offLen,
      );
      ctx.stroke();
    }

    // Impact ring at bug position
    const ringR = 6 + progress * 12;
    ctx.strokeStyle = this.agent.color;
    ctx.globalAlpha = (1 - progress) * 0.4;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }
}
