import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../utils/motion';
import data from '../../data/portfolioData';

export default function Skills() {
  const { skills } = data;

  return (
    <section id="sec-skills" className="page-section">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="section-label">{skills.label}</div>
        <h2 className="section-title">{skills.title}</h2>
        <p className="section-desc">{skills.description}</p>
      </motion.div>

      <motion.div
        className="flex flex-wrap gap-3 max-w-[900px]"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {skills.items.map((skill) => (
          <motion.div
            key={skill}
            variants={fadeUp}
            className="py-2 px-4 sm:py-3 sm:px-6 bg-[rgba(12,17,30,0.7)] border border-white/5 rounded-[10px] font-mono text-[11px] sm:text-[13px] text-text-dim transition-all hover:border-cyan hover:text-cyan hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
          >
            {skill}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
