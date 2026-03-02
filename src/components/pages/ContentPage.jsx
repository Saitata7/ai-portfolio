import { useEffect, useRef, useCallback } from 'react';
import ContentHero from '../sections/ContentHero';
import About from '../sections/About';
import Projects from '../sections/Projects';
import Skills from '../sections/Skills';
import Experience from '../sections/Experience';
import LiveDemos from '../sections/LiveDemos';
import Contact from '../sections/Contact';
import Footer from '../layout/Footer';
import BackToTop from '../layout/BackToTop';

export default function ContentPage({ targetSection, onClearTarget, onBackToCanvas }) {
  const didScroll = useRef(false);

  useEffect(() => {
    if (targetSection && !didScroll.current) {
      didScroll.current = true;
      // Wait for DOM to paint, then scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(targetSection);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          onClearTarget();
        });
      });
    }
  }, [targetSection, onClearTarget]);

  // Reset scroll flag when target changes
  useEffect(() => {
    didScroll.current = false;
  }, [targetSection]);

  return (
    <div className="min-h-screen">
      <ContentHero onBackToCanvas={onBackToCanvas} />
      <About />
      <Projects />
      <Skills />
      <Experience />
      <LiveDemos />
      <Contact />
      <Footer />
      <BackToTop />
    </div>
  );
}
