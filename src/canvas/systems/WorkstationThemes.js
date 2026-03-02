/* ─── WORKSTATION THEME DECORATIONS ───
   Each station gets a unique animated visual drawn inside the box.
   All pure functions: (ctx, node, time, damping) => void
   damping: 0 = full speed, 1 = frozen (watching state)
   ──────────────────────────────────── */

// Alpha boost for day mode — decorations need to be stronger on white bg
const _aB = (dayF) => dayF > 0.3 ? 2.2 : 1;

// Voice & NLP — Radar sweep with scan dots
function drawVoiceTheme(ctx, n, time, damping, dayF) {
  const t = time * (1 - damping);
  const r = 18;
  const sweepAngle = (t * 2) % (Math.PI * 2);
  const aB = _aB(dayF);

  // Sweep arc
  ctx.strokeStyle = n.color;
  ctx.globalAlpha = Math.min(1, 0.3 * aB);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, sweepAngle - 0.9, sweepAngle);
  ctx.stroke();

  // Trail gradient
  const trailGrad = ctx.createConicGradient(sweepAngle - 1.2, 0, 0);
  trailGrad.addColorStop(0, 'transparent');
  trailGrad.addColorStop(0.15, n.color + (dayF > 0.3 ? '55' : '22'));
  trailGrad.addColorStop(0.2, 'transparent');
  ctx.fillStyle = trailGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Scan dots
  for (let i = 0; i < 5; i++) {
    const dotAngle = (i / 5) * Math.PI * 2 + 0.3;
    const dotR = r * 0.55;
    let angleDiff = sweepAngle - dotAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const dotAlpha = Math.max(0, 1 - Math.abs(angleDiff) / 1.2);
    ctx.fillStyle = n.color;
    ctx.globalAlpha = Math.min(1, dotAlpha * 0.5 * aB);
    ctx.beginPath();
    ctx.arc(Math.cos(dotAngle) * dotR, Math.sin(dotAngle) * dotR, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sound wave lines
  for (let i = 0; i < 3; i++) {
    const waveX = 22 + i * 5;
    const waveH = 4 + Math.sin(t * 6 + i * 1.5) * 3;
    ctx.strokeStyle = n.color;
    ctx.globalAlpha = Math.min(1, (0.15 - i * 0.03) * aB);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(waveX, -waveH);
    ctx.quadraticCurveTo(waveX + 2, 0, waveX, waveH);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// Computer Vision — Blueprint grid cells filling
function drawVisionTheme(ctx, n, time, damping, dayF) {
  const t = time * (1 - damping);
  const aB = _aB(dayF);
  const gridSize = 4;
  const cellW = 7;
  const cellH = 5;
  const startX = -gridSize * cellW / 2;
  const startY = -gridSize * cellH / 2 + 2;

  const fillIndex = Math.floor(t * 3) % (gridSize * gridSize);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const idx = row * gridSize + col;
      const cx = startX + col * cellW;
      const cy = startY + row * cellH;

      ctx.strokeStyle = n.color;
      ctx.globalAlpha = Math.min(1, 0.1 * aB);
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx, cy, cellW - 1, cellH - 1);

      if (idx <= fillIndex) {
        ctx.fillStyle = n.color;
        ctx.globalAlpha = Math.min(1, (0.15 + (idx === fillIndex ? Math.sin(t * 8) * 0.1 : 0)) * aB);
        ctx.fillRect(cx + 0.5, cy + 0.5, cellW - 2, cellH - 2);
      }
    }
  }

  // Scanning line
  const scanY = startY + ((t * 2) % 1) * gridSize * cellH;
  ctx.strokeStyle = n.color;
  ctx.globalAlpha = Math.min(1, 0.3 * aB);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, scanY);
  ctx.lineTo(startX + gridSize * cellW, scanY);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

// Code & Engineering — Loading bars pulsing
function drawCodeTheme(ctx, n, time, damping, dayF) {
  const t = time * (1 - damping);
  const aB = _aB(dayF);
  const barW = 32;
  const barH = 3;
  const startX = -barW / 2;

  for (let i = 0; i < 3; i++) {
    const y = -6 + i * 7;
    const fill = 0.3 + Math.sin(t * 2.5 + i * 1.8) * 0.3 + 0.4;

    // Track
    ctx.fillStyle = dayF > 0.3 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.roundRect(startX, y, barW, barH, 1.5);
    ctx.fill();

    // Fill
    ctx.fillStyle = n.color;
    ctx.globalAlpha = Math.min(1, 0.35 * aB);
    ctx.beginPath();
    ctx.roundRect(startX, y, barW * fill, barH, 1.5);
    ctx.fill();

    // Cursor blink at end of fill
    if (i === 0) {
      ctx.fillStyle = n.color;
      ctx.globalAlpha = Math.sin(t * 5) > 0 ? Math.min(1, 0.6 * aB) : 0;
      ctx.fillRect(startX + barW * fill + 1, y - 1, 1.5, barH + 2);
    }
  }

  ctx.globalAlpha = 1;
}

// ML Training — Timeline with pulsing dots
function drawMLTheme(ctx, n, time, damping, dayF) {
  const t = time * (1 - damping);
  const aB = _aB(dayF);
  const lineH = 26;

  // Vertical line
  ctx.strokeStyle = n.color;
  ctx.globalAlpha = Math.min(1, 0.15 * aB);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -lineH / 2);
  ctx.lineTo(0, lineH / 2);
  ctx.stroke();

  // Dots
  for (let i = 0; i < 3; i++) {
    const dy = -lineH / 2 + (i / 2) * lineH;
    const pulse = Math.sin(t * 3 + i * 2.1);
    const dotR = 2.5 + pulse * 0.8;

    ctx.fillStyle = n.color;
    ctx.globalAlpha = Math.min(1, (0.2 + (i === Math.floor(t * 1.5) % 3 ? 0.4 : 0)) * aB);
    ctx.beginPath();
    ctx.arc(0, dy, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal ticks
    ctx.strokeStyle = n.color;
    ctx.globalAlpha = Math.min(1, 0.12 * aB);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-6, dy);
    ctx.lineTo(6, dy);
    ctx.stroke();
  }

  // Loss curve
  ctx.strokeStyle = n.color;
  ctx.globalAlpha = Math.min(1, 0.2 * aB);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -15; x <= 15; x += 2) {
    const y = 8 * Math.exp(-((x + 15) / 12)) * Math.sin(t * 2 + x * 0.3) + 10;
    if (x === -15) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
}

// Data & Analytics — Waveform bars + play button
function drawDataTheme(ctx, n, time, damping, dayF) {
  const t = time * (1 - damping);
  const aB = _aB(dayF);

  // Play triangle (breathing)
  const breathe = 1 + Math.sin(t * 2) * 0.08;
  ctx.save();
  ctx.translate(-12, 0);
  ctx.scale(breathe, breathe);
  ctx.fillStyle = n.color;
  ctx.globalAlpha = Math.min(1, 0.25 * aB);
  ctx.beginPath();
  ctx.moveTo(-3, -5);
  ctx.lineTo(5, 0);
  ctx.lineTo(-3, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Waveform bars
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 5;
    const h = 4 + Math.abs(Math.sin(t * 4 + i * 1.3)) * 10;
    ctx.fillStyle = n.color;
    ctx.globalAlpha = Math.min(1, (0.2 + Math.abs(Math.sin(t * 3 + i)) * 0.15) * aB);
    ctx.beginPath();
    ctx.roundRect(x - 1, -h / 2, 2.5, h, 1);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

// Deployment & Cloud — Signal pulse rings
function drawDeployTheme(ctx, n, time, damping, dayF) {
  const t = time * (1 - damping);
  const aB = _aB(dayF);

  // Concentric expanding rings
  for (let i = 0; i < 3; i++) {
    const phase = (t * 1.2 + i * 0.35) % 1;
    const ringR = 5 + phase * 20;
    const alpha = (1 - phase) * 0.25;

    ctx.strokeStyle = n.color;
    ctx.globalAlpha = Math.min(1, alpha * aB);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -2, ringR, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();
  }

  // Cloud shape base
  ctx.fillStyle = n.color;
  ctx.globalAlpha = Math.min(1, 0.12 * aB);
  ctx.beginPath();
  ctx.arc(-5, 5, 6, Math.PI, 0);
  ctx.arc(5, 5, 6, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  // Upload arrow
  ctx.strokeStyle = n.color;
  ctx.globalAlpha = Math.min(1, 0.3 * aB);
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  const arrowY = 2 + Math.sin(t * 3) * 2;
  ctx.beginPath();
  ctx.moveTo(0, 10 + arrowY);
  ctx.lineTo(0, 2 + arrowY);
  ctx.moveTo(-3, 5 + arrowY);
  ctx.lineTo(0, 2 + arrowY);
  ctx.lineTo(3, 5 + arrowY);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

const THEME_MAP = {
  'VOICE & NLP': drawVoiceTheme,
  'COMPUTER VISION': drawVisionTheme,
  'CODE & ENGINEERING': drawCodeTheme,
  'ML TRAINING': drawMLTheme,
  'DATA & ANALYTICS': drawDataTheme,
  'DEPLOY & CLOUD': drawDeployTheme,
};

export function drawWorkstationTheme(ctx, node, time, damping, dayF = 0) {
  const fn = THEME_MAP[node.label];
  if (fn) {
    ctx.save();
    fn(ctx, node, time, damping, dayF);
    ctx.restore();
  }
}

/* ─── CANVAS-DRAWN ICONS (replace emojis) ─── */

function drawMicIcon(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  // Mic body
  ctx.beginPath();
  ctx.roundRect(-3, -7, 6, 10, 3);
  ctx.stroke();
  // Stand
  ctx.beginPath();
  ctx.arc(0, 3, 5, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, 11);
  ctx.moveTo(-3, 11);
  ctx.lineTo(3, 11);
  ctx.stroke();
}

function drawEyeIcon(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  // Eye shape
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.quadraticCurveTo(0, -7, 8, 0);
  ctx.quadraticCurveTo(0, 7, -8, 0);
  ctx.stroke();
  // Iris
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.stroke();
  // Pupil
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawTerminalIcon(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  // Terminal box
  ctx.beginPath();
  ctx.roundRect(-8, -6, 16, 12, 2);
  ctx.stroke();
  // Prompt >_
  ctx.beginPath();
  ctx.moveTo(-4, -1);
  ctx.lineTo(-1, 1.5);
  ctx.lineTo(-4, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, 4);
  ctx.lineTo(5, 4);
  ctx.stroke();
}

function drawBrainIcon(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  // Brain lobes
  ctx.beginPath();
  ctx.arc(-3, -2, 5, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(3, -2, 5, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  // Connection in middle
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(0, 5);
  ctx.stroke();
  // Nodes
  ctx.fillStyle = color;
  [-4, 0, 4].forEach(y => {
    ctx.beginPath();
    ctx.arc(0, y - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawChartIcon(ctx, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  // Bars
  const bars = [4, 8, 5, 10, 7];
  bars.forEach((h, i) => {
    const x = -8 + i * 4;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, 5 - h, 2.5, h);
  });
  ctx.globalAlpha = 1;
  // Axis
  ctx.beginPath();
  ctx.moveTo(-9, 6);
  ctx.lineTo(9, 6);
  ctx.stroke();
}

function drawRocketIcon(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  // Body
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.quadraticCurveTo(5, -3, 4, 4);
  ctx.lineTo(-4, 4);
  ctx.quadraticCurveTo(-5, -3, 0, -9);
  ctx.stroke();
  // Window
  ctx.beginPath();
  ctx.arc(0, -2, 2, 0, Math.PI * 2);
  ctx.stroke();
  // Fins
  ctx.beginPath();
  ctx.moveTo(-4, 3);
  ctx.lineTo(-7, 6);
  ctx.lineTo(-3, 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, 3);
  ctx.lineTo(7, 6);
  ctx.lineTo(3, 5);
  ctx.stroke();
  // Flame
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(0, 9);
  ctx.lineTo(2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

const ICON_MAP = {
  'VOICE & NLP': drawMicIcon,
  'COMPUTER VISION': drawEyeIcon,
  'CODE & ENGINEERING': drawTerminalIcon,
  'ML TRAINING': drawBrainIcon,
  'DATA & ANALYTICS': drawChartIcon,
  'DEPLOY & CLOUD': drawRocketIcon,
};

export function drawWorkstationIcon(ctx, node, dayF = 0) {
  const fn = ICON_MAP[node.label];
  if (fn) {
    ctx.save();
    // Darken icon color in day for visibility on white boxes
    let color = node.color;
    if (dayF > 0.3) {
      const r = parseInt(color.slice(1,3), 16);
      const g = parseInt(color.slice(3,5), 16);
      const b = parseInt(color.slice(5,7), 16);
      color = `rgb(${Math.round(r*0.55)},${Math.round(g*0.55)},${Math.round(b*0.55)})`;
    }
    ctx.globalAlpha = dayF > 0.3 ? 0.9 : 0.7;
    fn(ctx, color);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
