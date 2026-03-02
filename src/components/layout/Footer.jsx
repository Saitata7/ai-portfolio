import data from '../../data/portfolioData';

export default function Footer() {
  return (
    <footer className="py-8 px-[60px] max-md:px-6 border-t border-white/[0.04] flex max-md:flex-col justify-between items-center gap-2 font-mono text-xs text-text-muted max-md:text-center">
      <span>&copy; {data.copyright}</span>
      <span>{data.footerTagline}</span>
    </footer>
  );
}
