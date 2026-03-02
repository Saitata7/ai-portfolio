import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../utils/motion';
import data from '../../data/portfolioData';

export default function LiveDemos() {
  const { demos } = data;
  // Only show items that don't have "Coming Soon" tags
  const liveItems = demos.items.filter(
    d => !d.tags.some(t => t.toLowerCase().includes('coming soon'))
  );
  const comingSoonCount = demos.items.length - liveItems.length;

  return (
    <section id="sec-demos" className="page-section">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="section-label">{demos.label}</div>
        <h2 className="section-title">{demos.title}</h2>
        <p className="section-desc">{demos.description}</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1200px]"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {liveItems.map((d, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            className="bg-[rgba(12,17,30,0.7)] border border-white/[0.04] rounded-2xl p-5 sm:p-9 transition-all duration-400 hover:border-cyan/15 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
          >
            <div className="text-4xl mb-4">{d.icon}</div>
            <h3 className="text-lg sm:text-[22px] font-bold mb-2.5">{d.title}</h3>
            <p className="text-sm text-text-dim leading-[1.6]">{d.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {d.tags.map((tag) => (
                <span
                  key={tag}
                  className={`py-1 px-3 border rounded-full font-mono text-[10px] ${
                    tag === 'Live'
                      ? 'border-green/40 text-green'
                      : 'border-text-muted rounded-full text-text-dim'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {comingSoonCount > 0 && (
        <motion.p
          className="mt-8 font-mono text-[12px] text-text-muted tracking-[1px]"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          + {comingSoonCount} more demo{comingSoonCount > 1 ? 's' : ''} coming soon
        </motion.p>
      )}
    </section>
  );
}
