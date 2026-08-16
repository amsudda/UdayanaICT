import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SoftRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

const transition = {
  duration: 1.0,
  ease: [0.16, 1, 0.3, 1],
};

export function SoftReveal({ children, delay = 0, className = '' }: SoftRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -100px 0px" }}
      transition={{ ...transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
