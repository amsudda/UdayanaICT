import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number | "some" | "all";
}

const transition = {
  duration: 0.8,
  ease: [0.16, 1, 0.3, 1], // Custom premium ease-out
};

export function FadeUp({ children, delay = 0, className = '', amount = 0.15 }: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount, margin: "0px 0px -50px 0px" }}
      transition={{ ...transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
