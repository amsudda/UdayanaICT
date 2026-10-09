import { motion, useReducedMotion } from 'framer-motion';

/** The original portrait, framed without painting a white block over the hero. */
export function HeroPortrait() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div className="landing-portrait" initial={shouldReduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <clipPath id="landing-portrait-crop" clipPathUnits="objectBoundingBox">
            <path d="M0 0H1V.725C.965 .795 .91 .855 .83 .9C.72 .965 .58 .995 .42 .985C.235 .975 .09 .925 0 .82Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="landing-portrait-glow" aria-hidden="true" />
      <svg className="landing-portrait-orbit landing-portrait-orbit-back" viewBox="0 0 800 720" fill="none" aria-hidden="true">
        <path d="M310 224C132 274 2 378 38 465C50 495 90 513 142 518" stroke="#aac8ed" strokeWidth="1.2" />
        <path className="landing-orbit-flow landing-orbit-flow-blue" pathLength="1" d="M310 224C132 274 2 378 38 465C50 495 90 513 142 518" stroke="#4d95f0" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="38" cy="425" r="5" fill="#79a8df" stroke="#e9f2fc" strokeWidth="3" />
        <circle cx="167" cy="298" r="4" fill="#f24c61" stroke="white" strokeWidth="2" />
      </svg>
      <div className="landing-portrait-crop">
        <div className="landing-portrait-panel" aria-hidden="true" />
        <img src="/images/hersoimage-hero.webp" width="1263" height="1246" fetchPriority="high" decoding="async" alt="Pasindu Dissanayake — ICT ගුරුවරයා" className="landing-portrait-photo" draggable={false} />
      </div>
      <svg className="landing-portrait-rim" viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="landing-portrait-rim-shine" x1="80" y1="860" x2="940" y2="830" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0" />
            <stop offset=".22" stopColor="#ffffff" stopOpacity=".72" />
            <stop offset=".52" stopColor="#ffffff" />
            <stop offset=".72" stopColor="#ffd1d7" stopOpacity=".82" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="landing-portrait-rim-glow-gradient" x1="0" y1="850" x2="1000" y2="850" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ef334b" stopOpacity="0" />
            <stop offset=".38" stopColor="#ef334b" stopOpacity=".04" />
            <stop offset=".63" stopColor="#ef334b" stopOpacity=".72" />
            <stop offset=".86" stopColor="#ef334b" stopOpacity=".12" />
            <stop offset="1" stopColor="#ef334b" stopOpacity="0" />
          </linearGradient>
          <filter id="landing-portrait-rim-blur" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <path className="landing-portrait-rim-glow" d="M0 820C90 925 235 975 420 985C580 995 720 965 830 900C910 855 965 795 1000 725" stroke="url(#landing-portrait-rim-glow-gradient)" strokeWidth="30" filter="url(#landing-portrait-rim-blur)" />
        <path className="landing-portrait-rim-soft-edge" d="M0 820C90 925 235 975 420 985C580 995 720 965 830 900C910 855 965 795 1000 725" stroke="currentColor" strokeWidth="16" />
        <path className="landing-portrait-rim-cutout" d="M0 820C90 925 235 975 420 985C580 995 720 965 830 900C910 855 965 795 1000 725" stroke="currentColor" strokeWidth="7" />
        <path className="landing-portrait-rim-highlight" d="M0 820C90 925 235 975 420 985C580 995 720 965 830 900C910 855 965 795 1000 725" stroke="url(#landing-portrait-rim-shine)" strokeWidth="2.5" />
      </svg>
      <svg className="landing-portrait-orbit landing-portrait-orbit-front" viewBox="0 0 800 720" fill="none" aria-hidden="true">
        <path d="M64 482C108 512 179 522 250 512" stroke="url(#orbit-red-fade)" strokeWidth="1.1" />
        <path d="M432 472C590 425 797 266 748 230" stroke="url(#orbit-red-rise)" strokeWidth="1.1" />
        <path className="landing-orbit-flow landing-orbit-flow-red" pathLength="1" d="M64 482C108 512 179 522 250 512" stroke="#ff3d5c" strokeWidth="2" strokeLinecap="round" />
        <path className="landing-orbit-flow landing-orbit-flow-red landing-orbit-flow-late" pathLength="1" d="M432 472C590 425 797 266 748 230" stroke="#ff3d5c" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="orbit-red-fade"><stop stopColor="#ec3c53" /><stop offset="1" stopColor="#ec3c53" stopOpacity="0" /></linearGradient>
          <linearGradient id="orbit-red-rise"><stop stopColor="#ec3c53" stopOpacity="0" /><stop offset=".6" stopColor="#ec3c53" /></linearGradient>
        </defs>
        <circle cx="64" cy="482" r="4" fill="#f24c61" stroke="white" strokeWidth="2" />
        <circle cx="748" cy="230" r="4" fill="#f24c61" stroke="white" strokeWidth="2" />
      </svg>
      <div className="landing-credential">
        <span className="landing-credential-icon" aria-hidden="true">🎓</span>
        <div>
          <p className="landing-credential-title">B.Sc Information Systems</p>
          <p className="landing-credential-subtitle">University Of Colombo (UG)</p>
        </div>
        <span className="landing-credential-signal" aria-hidden="true" />
      </div>
    </motion.div>
  );
}
