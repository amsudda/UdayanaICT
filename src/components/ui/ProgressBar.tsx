import { motion } from 'framer-motion';
interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md';
  className?: string;
}
export function ProgressBar({
  value,
  size = 'sm',
  className = ''
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5'
  };
  return (
    <div
      className={`w-full bg-gray-100 rounded-full overflow-hidden ${heights[size]} ${className}`}>

      <motion.div
        initial={{
          width: 0
        }}
        animate={{
          width: `${clampedValue}%`
        }}
        transition={{
          duration: 1,
          ease: 'easeOut'
        }}
        className="h-full bg-apple-blue rounded-full" />

    </div>);

}
