import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../utils/motion';
import data from '../../data/portfolioData';

export default function Experience() {
  const { experience } = data;

  return (
    <section id="sec-experience" className="page-section">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="section-label">{experience.label}</div>
        <h2 className="section-title">{experience.title}</h2>
      </motion.div>

      <motion.div
        className="max-w-[700px] flex flex-col gap-8"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {experience.items.map((item, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            className="pl-6 border-l-2 border-[#1a2540] transition-all hover:border-cyan"
          >
            <div className="text-sm text-cyan font-mono mb-1">{item.role}</div>
            <h3 className="text-xl font-semibold mb-1">{item.company}</h3>
            <p className="text-sm text-text-dim leading-[1.6]">{item.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
