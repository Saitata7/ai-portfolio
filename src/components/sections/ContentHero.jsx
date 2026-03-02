import { motion } from 'framer-motion';
import { heroFade } from '../../utils/motion';
import data from '../../data/portfolioData';

export default function ContentHero({ onBackToCanvas }) {
  return (
    <section className="relative min-h-[85vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 overflow-hidden">
      {/* Back to canvas */}
      <button
        onClick={onBackToCanvas}
        className="absolute top-6 right-6 md:top-8 md:right-8 z-10 py-2 px-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg font-mono text-[11px] text-cyan tracking-[1px] cursor-pointer transition-all duration-200 hover:border-cyan/50 hover:bg-card"
      >
        &larr; CANVAS
      </button>

      <div className="max-w-[800px]">
        <motion.h1
          className="text-[clamp(36px,6vw,72px)] font-black tracking-[-2px] leading-[1.05]"
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
              className="py-2 px-4 bg-card/60 border border-border rounded-lg font-mono text-[11px] text-text-dim tracking-[0.5px] transition-all duration-200 hover:border-cyan/40 hover:text-cyan"
            >
              GitHub
            </a>
          )}
          {data.social.linkedin && data.social.linkedin !== '#' && (
            <a
              href={data.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-4 bg-card/60 border border-border rounded-lg font-mono text-[11px] text-text-dim tracking-[0.5px] transition-all duration-200 hover:border-cyan/40 hover:text-cyan"
            >
              LinkedIn
            </a>
          )}
        </motion.div>

        <motion.p
          className="mt-10 font-mono text-[11px] text-text-muted/50 tracking-[1px]"
          variants={heroFade(0.7)}
          initial="hidden"
          animate="visible"
        >
          {data.about.stats}
        </motion.p>
      </div>
    </section>
  );
}
