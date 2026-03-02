import { useEffect, useRef, useState, useCallback } from 'react';
import { isTouchDevice } from '../../utils/responsive';
import World, { SECTION_DEFS } from '../../canvas/World.js';

export default function HeroCanvas({ isActive, onStatusChange, onNavigate, onThemeChange }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const worldRef = useRef(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const onNavigateRef = useRef(onNavigate);

  const [uiState, setUiState] = useState('working');
  const [bugFight, setBugFight] = useState(false);
  const [navMenuActive, setNavMenuActive] = useState(false);
  const [navBtnsVisible, setNavBtnsVisible] = useState(false);
  const [activeTheme, setActiveTheme] = useState('night');
  const [themeOpen, setThemeOpen] = useState(false);

  // Keep callback refs fresh without restarting animation
  useEffect(() => { onStatusChangeRef.current = onStatusChange; });
  useEffect(() => { onNavigateRef.current = onNavigate; });

  // Single mount — EMPTY deps, never restarts
  useEffect(() => {
    const world = new World(canvasRef.current, wrapRef.current, {
      onStateChange: (state, label, isBugFight, isSelfHeal) => {
        setUiState(state);
        if (isBugFight !== undefined) setBugFight(isBugFight);
        onStatusChangeRef.current?.(state, label, isBugFight, isSelfHeal);

        if (state === 'watching') {
          setNavMenuActive(true);
          setTimeout(() => setNavBtnsVisible(true), 100);
        } else {
          setNavBtnsVisible(false);
          setTimeout(() => setNavMenuActive(false), 300);
        }
      },
      onNavigationComplete: (sectionId) => {
        onNavigateRef.current?.(sectionId);
      },
    });

    worldRef.current = world;
    world.start();
    return () => world.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause/resume canvas when switching pages
  useEffect(() => {
    if (!worldRef.current) return;
    if (isActive) {
      worldRef.current.resume();
    } else {
      worldRef.current.pause();
    }
  }, [isActive]);

  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    worldRef.current?.handleClick(cssX, cssY);
  }, []);

  const handleNavClick = useCallback((e, idx) => {
    e.stopPropagation();
    worldRef.current?.dispatch('NAVIGATE', { nodeIndex: idx });
  }, []);

  // Determine if the sky is currently bright (for light UI)
  // True for explicit "day" OR auto/rain mode during local daytime hours
  const isSkyBright = (() => {
    if (activeTheme === 'day') return true;
    if (activeTheme === 'night' || activeTheme === 'snow') return false;
    // auto or rain — check actual local time
    const h = new Date().getHours();
    return h >= 7 && h <= 17;
  })();
  const isDay = isSkyBright;
  const panelBg = isDay ? 'rgba(240,245,255,0.85)' : 'rgba(8,12,20,0.8)';
  const panelBorder = isDay ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const dropdownBg = isDay ? 'rgba(245,248,255,0.95)' : 'rgba(8,12,20,0.9)';

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-screen overflow-hidden"
      id="heroSection"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-none touch-none"
        onClick={handleCanvasClick}
        onTouchEnd={(e) => {
          e.preventDefault();
          const t = e.changedTouches[0];
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect || !t) return;
          worldRef.current?.handleClick(t.clientX - rect.left, t.clientY - rect.top);
        }}
      />

      {/* ── Hero overlay text — top-left, out of workspace ── */}
      <div
        className="absolute top-8 left-8 md:top-10 md:left-12 pointer-events-none z-10 transition-opacity duration-300"
        style={{ opacity: uiState === 'watching' ? 0.35 : 1 }}
      >
        <h1
          className={`text-[clamp(24px,4vw,48px)] font-black tracking-[-1.5px] leading-[1.1] opacity-0 animate-[fadeUp_0.8s_0.3s_forwards] ${
            isDay
              ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
              : 'text-white drop-shadow-[0_0_30px_rgba(0,240,255,0.15)]'
          }`}
          style={{ transform: 'translateY(20px)' }}
        >
          Sai Tata{' '}
          <span className="bg-gradient-to-br from-cyan via-pink to-cyan bg-[length:200%_200%] bg-clip-text text-transparent animate-grad-shift drop-shadow-[0_0_20px_rgba(255,0,110,0.3)]">
            /
          </span>{' '}
          AI Engineer
        </h1>
        <p
          className={`text-[clamp(12px,1.3vw,15px)] font-light mt-3 max-w-[380px] tracking-wide opacity-0 animate-[fadeUp_0.8s_0.6s_forwards] ${
            isDay ? 'text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)]' : 'text-text/70'
          }`}
          style={{ transform: 'translateY(20px)' }}
        >
          Voice AI &bull; LLM Agents &bull; Full-Stack AI Products
        </p>
      </div>

      {/* ── Climate theme switcher — top right ── */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
        <button
          onClick={(e) => { e.stopPropagation(); setThemeOpen(o => !o); }}
          className={`py-1.5 px-3 backdrop-blur-sm rounded-lg font-mono text-[10px] cursor-pointer transition-all duration-200 hover:border-cyan/30 hover:text-cyan ${
            isDay ? 'text-[#1a2a40] border border-black/[0.12] shadow-[0_2px_8px_rgba(0,0,0,0.1)]' : 'text-text-dim border border-white/[0.06]'
          }`}
          style={{ background: panelBg }}
          title="Change climate"
        >
          {activeTheme === 'auto' ? '~ Auto' : activeTheme === 'day' ? '* Day' : activeTheme === 'night' ? ')) Night' : activeTheme === 'rain' ? '// Rain' : '** Snow'}
        </button>
        {themeOpen && (
          <div
            className="mt-1.5 flex flex-col gap-0.5 backdrop-blur-md rounded-lg overflow-hidden"
            style={{ background: dropdownBg, border: `1px solid ${panelBorder}` }}
          >
            {[
              { key: 'auto', label: '~ Auto' },
              { key: 'day', label: '* Day' },
              { key: 'night', label: ')) Night' },
              { key: 'rain', label: '// Rain' },
              { key: 'snow', label: '** Snow' },
            ].map(t => (
              <button
                key={t.key}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTheme(t.key);
                  setThemeOpen(false);
                  worldRef.current?.setTheme(t.key);
                  // Tell parent whether sky is bright for StatusBar styling
                  const bright = t.key === 'day' || ((t.key === 'auto' || t.key === 'rain') && new Date().getHours() >= 7 && new Date().getHours() <= 17);
                  onThemeChange?.(t.key, bright);
                }}
                className={`py-1.5 px-3 font-mono text-[10px] text-left cursor-pointer transition-colors duration-150 ${
                  activeTheme === t.key
                    ? 'text-cyan bg-cyan/10'
                    : isDay
                      ? 'text-[#3a4a60] hover:text-cyan hover:bg-cyan/5'
                      : 'text-text-dim hover:text-cyan hover:bg-white/[0.03]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Click/Tap hint — bottom center ── */}
      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-300 flex flex-col items-center gap-3"
        style={{ opacity: uiState === 'working' ? 1 : 0 }}
      >
        <div
          className={`font-mono text-[12px] sm:text-[11px] tracking-[2px] uppercase opacity-0 animate-[fadeUp_0.8s_1.5s_forwards] pointer-events-none ${
            isDay ? 'text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]' : 'text-text-dim'
          }`}
          style={{ transform: 'translateY(10px)' }}
        >
          <span className={`inline-block py-1 px-2.5 border rounded mr-1.5 text-[11px] sm:text-[10px] ${
            isDay ? 'border-white/60 text-white bg-white/10' : 'border-cyan/40 text-cyan/80'
          }`}>
            {isTouchDevice() ? 'TAP' : 'CLICK'}
          </span>{' '}
          to explore portfolio
        </div>
        <button
          onClick={() => onNavigate?.('sec-about')}
          className={`font-mono text-[10px] tracking-[1.5px] uppercase opacity-0 animate-[fadeUp_0.8s_2s_forwards] transition-colors duration-200 hover:text-cyan cursor-pointer ${
            isDay ? 'text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)]' : 'text-text-muted'
          }`}
          style={{ transform: 'translateY(10px)' }}
        >
          or skip to portfolio &rarr;
        </button>
      </div>

      {/* ── Left-side nav — compact ── */}
      <div
        className={`absolute left-4 md:left-8 bottom-24 z-20 transition-opacity duration-300 ${
          navMenuActive
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`font-mono text-[10px] sm:text-[11px] tracking-[1.5px] uppercase mb-2 transition-opacity duration-200 ${
            isDay ? 'text-pink drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)]' : 'text-pink/80'
          } ${navMenuActive ? 'opacity-100' : 'opacity-0'}`}
        >
          Navigate to
        </div>

        <div className="flex flex-col gap-1">
          {SECTION_DEFS.map((sd, i) => (
            <button
              key={sd.section}
              onClick={(e) => handleNavClick(e, i)}
              className={`py-2.5 px-4 sm:py-2 sm:px-3 backdrop-blur-sm rounded cursor-pointer transition-all duration-200 text-left hover:border-cyan/30 hover:translate-x-0.5 ${
                navBtnsVisible
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-3'
              }`}
              style={{
                transitionDelay: navBtnsVisible ? `${i * 0.04}s` : '0s',
                borderLeftColor: sd.color,
                borderLeftWidth: '2px',
                background: panelBg,
                border: `1px solid ${panelBorder}`,
                borderLeft: `2px solid ${sd.color}`,
              }}
            >
              <span className={`font-mono text-[11px] sm:text-[10px] tracking-[0.3px] font-medium ${
                isDay ? 'text-[#1a2a40]' : 'text-text-dim'
              }`}>
                {sd.backLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
