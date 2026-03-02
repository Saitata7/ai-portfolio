import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../utils/motion';
import data from '../../data/portfolioData';

export default function Projects() {
  const { projects } = data;

  return (
    <section id="sec-projects" className="page-section">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="section-label">{projects.label}</div>
        <h2 className="section-title">{projects.title}</h2>
        <p className="section-desc">{projects.description}</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1200px]"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {projects.items.map((p, i) => {
          const Wrap = p.link ? 'a' : 'div';
          const linkProps = p.link ? { href: p.link, target: '_blank', rel: 'noopener noreferrer' } : {};
          return (
            <motion.div
              key={i}
              variants={fadeUp}
            >
              <Wrap
                {...linkProps}
                className={`block bg-[rgba(12,17,30,0.7)] border border-white/[0.04] rounded-2xl p-5 sm:p-9 transition-all duration-400 hover:border-cyan/20 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,240,255,0.08),0_20px_60px_rgba(0,0,0,0.3)] h-full ${p.link ? 'cursor-pointer' : ''}`}
              >
                <div className="text-4xl mb-4">{p.icon}</div>
                <h3 className="text-lg sm:text-[22px] font-bold mb-2.5">
                  {p.title}
                  {p.link && <span className="text-cyan/50 text-sm ml-2">↗</span>}
                </h3>
                <p className="text-sm text-text-dim leading-[1.6]">{p.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="py-1 px-3 border border-text-muted rounded-full font-mono text-[10px] text-text-dim"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Wrap>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
