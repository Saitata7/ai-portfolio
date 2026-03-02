import { motion } from 'framer-motion';
import { heroFade } from '../../utils/motion';
import data from '../../data/portfolioData';

export default function ContentHero({ onBackToCanvas }) {
  return (
    <section className="relative min-h-[85vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 overflow-hidden">
      {/* Back to canvas — fixed so it stays visible while scrolling */}
      <button
        onClick={onBackToCanvas}
        className="fixed top-6 right-6 md:top-8 md:right-8 z-[100] py-2.5 px-5 bg-dark/90 backdrop-blur-md border border-cyan/20 rounded-lg font-mono text-[11px] text-cyan tracking-[1px] cursor-pointer transition-all duration-200 hover:border-cyan/50 hover:bg-card shadow-[0_0_15px_rgba(0,240,255,0.1)]"
      >
        &larr; CANVAS
      </button>

      <div className="max-w-[800px]">
        <motion.h1
          className="text-[clamp(36px,6vw,72px)] font-black tracking-[-2px] leading-[1.05] drop-shadow-[0_0_30px_rgba(0,240,255,0.08)]"
          variants={heroFade(0.1)}
          initial="hidden"
          animate="visible"
        >
          {data.name}{' '}
          <span className="bg-gradient-to-br from-cyan via-pink to-cyan bg-[length:200%_200%] bg-clip-text text-transparent animate-grad-shift">
            /
          </span>{' '}
          AI Engineer
        </motion.h1>

        <motion.p
          className="text-[clamp(14px,1.5vw,18px)] text-text-dim font-light mt-4 max-w-[500px]"
          variants={heroFade(0.3)}
          initial="hidden"
          animate="visible"
        >
          Voice AI &bull; LLM Agents &bull; Full-Stack AI Products
        </motion.p>

        <motion.div
          className="flex items-center gap-4 mt-8"
          variants={heroFade(0.5)}
          initial="hidden"
          animate="visible"
        >
          {data.social.github && data.social.github !== '#' && (
            <a
              href={data.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-5 bg-card/60 border border-cyan/20 rounded-lg font-mono text-[12px] text-text tracking-[0.5px] transition-all duration-200 hover:border-cyan/50 hover:text-cyan hover:bg-card/80"
            >
              GitHub
            </a>
          )}
          {data.social.linkedin && data.social.linkedin !== '#' && (
            <a
              href={data.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-5 bg-card/60 border border-cyan/20 rounded-lg font-mono text-[12px] text-text tracking-[0.5px] transition-all duration-200 hover:border-cyan/50 hover:text-cyan hover:bg-card/80"
            >
              LinkedIn
            </a>
          )}
        </motion.div>

        <motion.p
          className="mt-10 font-mono text-[11px] text-text-dim/70 tracking-[1px]"
          variants={heroFade(0.7)}
          initial="hidden"
          animate="visible"
        >
          MS Computer Science &bull; AWS Certified Developer &bull; 5+ years shipping AI
        </motion.p>
      </div>
    </section>
  );
}
