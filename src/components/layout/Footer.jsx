import data from '../../data/portfolioData';

const SECTIONS = [
  { id: 'sec-about', label: 'About' },
  { id: 'sec-projects', label: 'Projects' },
  { id: 'sec-skills', label: 'Skills' },
  { id: 'sec-experience', label: 'Experience' },
  { id: 'sec-demos', label: 'Demos' },
  { id: 'sec-contact', label: 'Contact' },
];

export default function Footer() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="py-12 px-[60px] max-md:px-6 border-t border-white/[0.04]">
      <div className="flex max-md:flex-col justify-between gap-8 mb-8">
        {/* Section nav */}
        <div>
          <div className="font-mono text-[10px] text-text-muted uppercase tracking-[2px] mb-3">Sections</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="font-mono text-[12px] text-text-dim hover:text-cyan transition-colors duration-200 cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Social + Contact */}
        <div className="flex gap-6 max-md:justify-center">
          {data.social.github && data.social.github !== '#' && (
            <a
              href={data.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[12px] text-text-dim hover:text-cyan transition-colors duration-200"
            >
              GitHub
            </a>
          )}
          {data.social.linkedin && data.social.linkedin !== '#' && (
            <a
              href={data.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[12px] text-text-dim hover:text-cyan transition-colors duration-200"
            >
              LinkedIn
            </a>
          )}
          <a
            href={`mailto:${data.email}`}
            className="font-mono text-[12px] text-text-dim hover:text-cyan transition-colors duration-200"
          >
            Email
          </a>
        </div>
      </div>

      <div className="flex max-md:flex-col justify-between items-center gap-2 pt-6 border-t border-white/[0.03] font-mono text-[11px] text-text-muted max-md:text-center">
        <span>&copy; {data.copyright}</span>
        <span>{data.footerTagline}</span>
      </div>
    </footer>
  );
}
