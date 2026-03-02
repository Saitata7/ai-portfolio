import { useEffect, useRef } from 'react';

const NODE_COUNT = 50;
const CONNECT_DIST = 180;
const MOUSE_RADIUS = 250;

export default function NeuralBackground() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const nodesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W, H;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = document.documentElement.scrollHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initNodes() {
      nodesRef.current = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        nodesRef.current.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 2 + 1,
          baseX: 0,
          baseY: 0,
        });
        nodesRef.current[i].baseX = nodesRef.current[i].x;
        nodesRef.current[i].baseY = nodesRef.current[i].y;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const nodes = nodesRef.current;
      const scrollY = window.scrollY;
      const mx = mouse.current.x;
      const my = mouse.current.y + scrollY;

      // Update positions — gentle drift
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;

        // Bounce off edges
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.x = Math.max(0, Math.min(W, n.x));
        n.y = Math.max(0, Math.min(H, n.y));

        // Mouse repulsion
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * 1.5;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
        }
      }

      // Draw connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.12;
            ctx.strokeStyle = `rgba(0,240,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();

            // Brighter connection near mouse
            const midX = (nodes[i].x + nodes[j].x) / 2;
            const midY = (nodes[i].y + nodes[j].y) / 2;
            const mouseDist = Math.hypot(midX - mx, midY - my);
            if (mouseDist < MOUSE_RADIUS) {
              const boost = (1 - mouseDist / MOUSE_RADIUS) * 0.2;
              ctx.strokeStyle = `rgba(0,240,255,${alpha + boost})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
              ctx.lineWidth = 0.5;
            }
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const mouseDist = Math.hypot(n.x - mx, n.y - my);
        const nearMouse = mouseDist < MOUSE_RADIUS;
        const glow = nearMouse ? (1 - mouseDist / MOUSE_RADIUS) * 0.5 : 0;

        ctx.fillStyle = `rgba(0,240,255,${0.15 + glow})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + glow * 2, 0, Math.PI * 2);
        ctx.fill();

        if (nearMouse) {
          // Glow ring near mouse
          ctx.strokeStyle = `rgba(0,240,255,${glow * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4 + glow * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    function onMouse(e) {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    }

    resize();
    initNodes();
    draw();

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);

    // Re-measure height when content changes
    const ro = new ResizeObserver(() => resize());
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ position: 'fixed', top: 0, left: 0 }}
    />
  );
}
