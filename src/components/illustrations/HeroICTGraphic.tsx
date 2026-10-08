import React from 'react';
import { motion } from 'framer-motion';

export function HeroICTGraphic({ className = '' }: { className?: string }) {
  // A clean, minimal ICT network system representing "Premium Academic Technology"
  // It avoids cyberpunk neon, relying on extremely subtle structural lines, orbital curves,
  // delicate branching nodes, and very faint typographic tech-texture.
  return (
    <div className={`absolute pointer-events-none select-none overflow-visible ${className}`}>
      
      {/* Subtle Depth Glows (Creates separation without heavy gradients, predominantly white/pale-blue/pale-red) */}
      <div className="absolute top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-blue-50/40 dark:bg-sky-900/10 blur-[120px] rounded-full" />
      <div className="absolute top-[60%] right-[10%] w-[50%] h-[50%] bg-red-50/30 dark:bg-red-900/5 blur-[100px] rounded-full" />

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-200 dark:text-slate-800/80 w-full h-full"
      >
        {/* Abstract Orbital / System Paths (Information Flow) */}
        <motion.path
          d="M 50 750 C 150 450 500 200 850 150"
          stroke="currentColor"
          strokeWidth="0.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2.5, ease: 'easeOut' }}
        />
        <motion.path
          d="M -50 550 C 250 650 600 450 850 0"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.4 }}
          transition={{ duration: 3, delay: 0.2, ease: 'easeOut' }}
        />

        {/* Minimal Network Branching (System Architecture) */}
        <g opacity="0.85">
          {/* Main vertical to horizontal branch */}
          <motion.path
            d="M 650 150 L 650 350 L 480 350"
            stroke="currentColor"
            strokeWidth="0.75"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
          />
          {/* Connection nodes */}
          <motion.circle cx="650" cy="150" r="3" fill="#c20f24" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2 }} />
          <motion.circle cx="480" cy="350" r="2.5" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.2 }} />
          
          {/* Sub-branch with subtle cyan technology accent */}
          <motion.path
            d="M 650 280 L 780 280 L 780 420"
            stroke="currentColor"
            strokeWidth="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.8, ease: 'easeOut' }}
          />
          <motion.circle cx="780" cy="420" r="2.5" fill="#0ea5e9" opacity="0.7" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.6 }} />
        </g>

        {/* Integration Lines for the Floating University Card (Left side area) */}
        <g opacity="0.6">
           <motion.path
             d="M 120 420 L 220 420 L 220 350"
             stroke="currentColor"
             strokeWidth="0.5"
             strokeDasharray="2 3"
             initial={{ pathLength: 0 }}
             animate={{ pathLength: 1 }}
             transition={{ duration: 1.5, delay: 1 }}
           />
           <motion.circle cx="220" cy="350" r="2" fill="#c20f24" opacity="0.8" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.4 }} />
           <motion.circle cx="120" cy="420" r="1.5" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }} />
        </g>

        {/* Subtle Tech/Data Texture (Extremely low opacity, decorative only) */}
        <g fill="currentColor" opacity="0.15" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" letterSpacing="0.05em">
          {/* Slow pulsing opacity on code fragments */}
          <motion.text x="180" y="240" animate={{ opacity: [0.05, 0.2, 0.05] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
            import &#123; System &#125;
          </motion.text>
          <motion.text x="680" y="580" animate={{ opacity: [0.05, 0.15, 0.05] }} transition={{ duration: 5, repeat: Infinity, delay: 1.5, ease: 'easeInOut' }}>
            API_RES_200
          </motion.text>
          <motion.text x="720" y="120" opacity="0.15">
            10110
          </motion.text>
        </g>

        {/* Tiny slow data-flow particle along the main orbital path */}
        <circle r="1.5" fill="#0ea5e9" opacity="0.6">
          <animateMotion
            dur="12s"
            repeatCount="indefinite"
            path="M 50 750 C 150 450 500 200 850 150"
          />
        </circle>
      </svg>
    </div>
  );
}
