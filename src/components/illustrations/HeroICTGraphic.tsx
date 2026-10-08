import React from 'react';
import { motion } from 'framer-motion';

export function HeroICTGraphic({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none select-none ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-300 dark:text-slate-700/60 w-full h-full"
      >
        {/* Animated Circuit Lines */}
        <motion.path
          d="M750 150 L650 250 L450 250 L350 350 L150 350"
          stroke="currentColor"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
        />
        <motion.path
          d="M650 250 L650 450 L500 600 L200 600"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
        />
        <motion.path
          d="M800 450 L750 450 L650 550 L450 550"
          stroke="currentColor"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
        />

        {/* Binary Text scattered */}
        <motion.text x="120" y="220" fontSize="16" fontFamily="monospace" fill="currentColor" opacity="0.6"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.6, y: 0 }} transition={{ delay: 1 }}
        >
          01011001
        </motion.text>
        <motion.text x="700" y="650" fontSize="14" fontFamily="monospace" fill="currentColor" opacity="0.5"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.5, y: 0 }} transition={{ delay: 1.2 }}
        >
          11000101
        </motion.text>

        {/* Code Brackets */}
        <motion.text x="250" y="280" fontSize="72" fontWeight="900" fill="currentColor" opacity="0.25"
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 0.25 }} transition={{ delay: 0.8, type: 'spring' }}
        >
          &lt;/&gt;
        </motion.text>
        <motion.text x="650" y="200" fontSize="84" fontWeight="900" fill="#c20f24" opacity="0.15"
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 0.15 }} transition={{ delay: 1, type: 'spring' }}
        >
          &#123; &#125;
        </motion.text>

        {/* Database Icon */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
          <ellipse cx="600" cy="500" rx="30" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M570 500 L570 530 A30 12 0 0 0 630 530 L630 500" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M570 515 A30 12 0 0 0 630 515" fill="none" stroke="currentColor" strokeWidth="2" />
        </motion.g>

        {/* Node dots */}
        <motion.circle cx="750" cy="150" r="5" fill="#c20f24" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} />
        <motion.circle cx="350" cy="350" r="4" fill="#c20f24" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }} />
        <motion.circle cx="150" cy="350" r="6" fill="#c20f24" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 }} />
        <motion.circle cx="500" cy="600" r="4" fill="#c20f24" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.2 }} />
        <motion.circle cx="650" cy="250" r="4" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
        <motion.circle cx="200" cy="600" r="5" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.5 }} />
        <motion.circle cx="800" cy="450" r="5" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />

        {/* Subtle glowing orbs */}
        <circle cx="250" cy="250" r="80" fill="#c20f24" opacity="0.06" filter="blur(20px)" />
        <circle cx="650" cy="500" r="100" fill="currentColor" opacity="0.06" filter="blur(30px)" />
      </svg>
    </div>
  );
}
