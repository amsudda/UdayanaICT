import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ImageRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number | "some" | "all";
}

const transition = {
  duration: 1.0,
  ease: [0.16, 1, 0.3, 1],
};

export function ImageReveal({ children, delay = 0, className = '', amount = 0.1 }: ImageRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount, margin: "0px 0px -50px 0px" }}
      transition={{ ...transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
