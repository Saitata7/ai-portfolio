import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motion';
import data from '../../data/portfolioData';

export default function About() {
  const { about } = data;

  return (
    <section id="sec-about" className="page-section">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="section-label">{about.label}</div>
        <h2 className="section-title whitespace-pre-line">{about.title}</h2>
        <p className="section-desc">{about.description}</p>
        <p className="text-sm sm:text-[15px] text-[#4a5470] leading-[1.7]">{about.stats}</p>
      </motion.div>
    </section>
  );
}
