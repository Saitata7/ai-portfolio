import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motion';
import data from '../../data/portfolioData';

export default function Contact() {
  const { contact } = data;

  return (
    <section id="sec-contact" className="page-section">
      <motion.div
        className="flex flex-col items-center justify-center text-center min-h-[60vh]"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="section-label justify-center">{contact.label}</div>
        <h2 className="section-title text-center">
          {contact.title}
          <br />
          <span className="bg-gradient-to-br from-cyan to-pink bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            {contact.titleHighlight}
          </span>
        </h2>
        <p className="section-desc text-center mx-auto">{contact.description}</p>
        <div className="flex gap-4 mt-8 flex-wrap justify-center">
          {contact.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="py-3.5 px-8 border border-text-muted rounded-[10px] text-text-dim no-underline text-sm font-mono transition-all hover:border-cyan hover:text-cyan hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
            >
              {link.label}
            </a>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
