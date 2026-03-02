import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > window.innerHeight);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-8 right-8 z-[100] w-[46px] h-[46px] rounded-xl bg-card backdrop-blur-[10px] border border-border text-cyan text-lg flex items-center justify-center cursor-pointer transition-all duration-400 hover:border-cyan hover:shadow-glow-cyan hover:-translate-y-1 ${
        show
          ? 'opacity-100 pointer-events-auto translate-y-0'
          : 'opacity-0 pointer-events-none translate-y-2.5'
      }`}
      aria-label="Back to top"
    >
      ↑
    </button>
  );
}
