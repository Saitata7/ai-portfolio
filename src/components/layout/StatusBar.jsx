import { isTouchDevice } from '../../utils/responsive';

const clickOrTap = isTouchDevice() ? 'tap' : 'click';

export default function StatusBar({ state, navLabel, bugFight, selfHeal, isDay }) {
  let text = `AGENTS WORKING — ${clickOrTap} to interrupt`;
  let barClass = '';

  if (selfHeal) {
    text = 'AGENT FAULT — medic agent responding...';
    barClass = 'border-green/30 text-green';
  } else if (bugFight) {
    text = 'SECURITY BREACH — agents responding...';
    barClass = 'border-orange/30 text-orange';
  } else if (state === 'watching') {
    text = 'AGENTS PAUSED — choose a section';
    barClass = 'border-pink/30 text-pink';
  } else if (state === 'navigating') {
    text = `Navigating to ${navLabel || ''}...`;
    barClass = 'border-green/30 text-green';
  } else if (state === 'nav_waiting_click') {
    text = `${clickOrTap === 'tap' ? 'Tap' : 'Click'} the ${navLabel || ''} box to go there`;
    barClass = 'border-cyan/30 text-cyan';
  }

  const dotClass = selfHeal
    ? 'bg-green shadow-[0_0_10px_#00ff88] animate-pulse-dot'
    : bugFight
      ? 'bg-orange shadow-[0_0_10px_#ff8a00] animate-pulse-dot'
      : state === 'watching'
        ? 'bg-pink shadow-[0_0_10px_#ff00aa]'
        : 'bg-green shadow-[0_0_10px_#00ff88] animate-pulse-dot';

  // Base theme (bg + default text), then state-specific overrides on top
  const themeBase = isDay
    ? 'bg-white/85 border-black/[0.08] text-[#2a3a50] shadow-[0_2px_12px_rgba(0,0,0,0.08)]'
    : 'bg-dark/85 border-cyan/15 text-text-dim';

  return (
    <div
      className={`fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-3 py-2 px-4 sm:py-3 sm:px-7 backdrop-blur-[20px] border rounded-full font-mono text-[10px] sm:text-[13px] tracking-[0.5px] sm:tracking-[1px] transition-all duration-400 select-none max-w-[calc(100vw-2rem)] ${themeBase} ${barClass}`}
    >
      <div className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span>{text}</span>
    </div>
  );
}
