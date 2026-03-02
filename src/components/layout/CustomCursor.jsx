import { useEffect, useRef, useState } from 'react';
import { isTouchDevice } from '../../utils/responsive';

export default function CustomCursor({ watching }) {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => { setIsTouch(isTouchDevice()); }, []);

  useEffect(() => {
    if (isTouch) return;
    function onMouse(e) {
      if (!visible) setVisible(true);
      if (ringRef.current) {
        ringRef.current.style.left = e.clientX + 'px';
        ringRef.current.style.top = e.clientY + 'px';
      }
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + 'px';
        dotRef.current.style.top = e.clientY + 'px';
      }
    }
    function onLeave() { setVisible(false); }
    function onEnter() { setVisible(true); }
    document.addEventListener('mousemove', onMouse);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    return () => {
      document.removeEventListener('mousemove', onMouse);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, [visible, isTouch]);

  if (isTouch) return null;

  const display = visible ? 'block' : 'none';

  return (
    <>
      <div
        ref={ringRef}
        className={`fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-300 ${
          watching
            ? 'w-[52px] h-[52px] border-pink shadow-[0_0_25px_rgba(255,0,170,0.3)]'
            : 'w-8 h-8 border-cyan/50'
        }`}
        style={{ display }}
      />
      <div
        ref={dotRef}
        className={`fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
          watching ? 'bg-pink' : 'bg-cyan'
        }`}
        style={{ display }}
      />
    </>
  );
}
