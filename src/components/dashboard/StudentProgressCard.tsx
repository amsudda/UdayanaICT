import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrophyIcon, SparklesIcon, TargetIcon } from 'lucide-react';
import { DashboardCard, DashboardCardContent } from './DashboardCard';

interface StudentProgressData {
  level: number;
  rank: string;
  currentXP: number;
  nextLevelXP: number;
  progress: number; // percentage (0-100)
}

// Mock Data - To be replaced by actual backend API later
const mockProgressData: StudentProgressData = {
  level: 3,
  rank: 'Scholar',
  currentXP: 1280,
  nextLevelXP: 1600,
  progress: 80,
};

export function StudentProgressCard() {
  const [data, setData] = useState<StudentProgressData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setData(mockProgressData);
      setMounted(true);
    }, 400);
  }, []);

  if (!data) {
    return (
      <DashboardCard delay={0.15} className="w-full">
        <DashboardCardContent className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-800/80" />
            <div className="w-48 h-4 rounded-full bg-gray-100 dark:bg-slate-800/80" />
          </div>
        </DashboardCardContent>
      </DashboardCard>
    );
  }

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = mounted ? circumference - (data.progress / 100) * circumference : circumference;

  return (
    <DashboardCard delay={0.15} className="w-full relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_top_right,rgba(194,15,36,0.04),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(194,15,36,0.08),transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[radial-gradient(ellipse_at_bottom_left,rgba(37,99,235,0.03),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,rgba(37,99,235,0.06),transparent_60%)] pointer-events-none" />
      
      {/* Tiny dots pattern for premium feel */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <DashboardCardContent className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        
        {/* Left Section: Context & Rank */}
        <div className="flex-1 w-full text-center md:text-left flex flex-col justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAF2] dark:border-slate-700/50 mb-4 mx-auto md:mx-0 w-fit">
            <SparklesIcon className="w-3.5 h-3.5 text-[#c20f24]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#172033] dark:text-apple-light">Learning Journey</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-white mb-2 tracking-tight">Keep building your progress.</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-sm mx-auto md:mx-0 mb-6 leading-relaxed">
            Every lesson you complete and assignment you submit brings you closer to mastery.
          </p>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c20f24]/10 to-[#c20f24]/5 dark:from-[#c20f24]/20 dark:to-transparent border border-[#c20f24]/20 dark:border-[#c20f24]/30 flex items-center justify-center shadow-sm">
              <TrophyIcon className="w-5 h-5 text-[#c20f24]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748B] dark:text-slate-500 mb-0.5">Current Rank</p>
              <p className="text-[17px] font-black text-[#172033] dark:text-white uppercase tracking-wider">{data.rank}</p>
            </div>
          </div>
        </div>

        {/* Middle Section: Circular XP Visualization */}
        <div className="shrink-0 relative flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center w-[160px] h-[160px]">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="80" cy="80" r={radius} 
                stroke="currentColor" 
                strokeWidth="10" 
                fill="transparent" 
                className="text-gray-100 dark:text-slate-800/60" 
              />
              {/* Animated Progress Circle */}
              <motion.circle 
                cx="80" cy="80" r={radius} 
                stroke="currentColor" 
                strokeWidth="10" 
                fill="transparent" 
                strokeDasharray={circumference} 
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                className="text-[#c20f24]" 
                strokeLinecap="round"
              />
            </svg>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-[#172033] dark:text-white tracking-tight leading-none mb-1">
                {data.currentXP.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748B] dark:text-slate-400">
                Total XP
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Level & Milestone */}
        <div className="flex-1 w-full flex flex-col justify-center items-center md:items-end text-center md:text-right space-y-4">
          <div className="bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E5EAF2] dark:border-slate-700/50 rounded-2xl p-4 w-full max-w-[240px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1">Current Level</p>
            <p className="text-2xl font-black text-[#172033] dark:text-white mb-4">Level {data.level.toString().padStart(2, '0')}</p>
            
            <div className="w-full h-px bg-gray-200 dark:bg-slate-700 mb-4" />
            
            <div className="flex items-start gap-2 text-left">
              <TargetIcon className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-[#172033] dark:text-white mb-0.5">Next Milestone</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-snug">
                  <span className="font-semibold text-[#2563EB]">{data.nextLevelXP - data.currentXP} XP</span> left to reach Level {(data.level + 1).toString().padStart(2, '0')}.
                </p>
              </div>
            </div>
          </div>
        </div>

      </DashboardCardContent>
    </DashboardCard>
  );
}
