import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon, GraduationCapIcon } from 'lucide-react';

const HIGHLIGHTS = [
  'උසස් තත්වයේ වීඩියෝ පාඩම් — ඕනෑම වේලාවක නැරඹිය හැක',
  'සජීවී අන්තර් ක්‍රියාකාරී පන්ති සහ Q&A සැසි',
  'පසුගිය විභාග ප්‍රශ්න පත්‍ර සවිස්තරාත්මක සාකච්ඡා',
  'ඔබේ ප්‍රගතිය නිරීක්ෂණය කරන පෞද්ගලික උපකරණ පුවරුව',
];

/* ── 8-bit pixel sprites ── */
const sb = 'pixel-svg w-full h-full';
const Floppy = () => (<svg viewBox="0 0 16 16" className={sb} fill="currentColor"><rect x="1" y="1" width="14" height="14" /><rect x="3" y="2" width="8" height="4" fill="#fff" /><rect x="9" y="2" width="2" height="4" /><rect x="4" y="9" width="8" height="5" fill="#fff" /><rect x="6" y="10" width="4" height="3" /></svg>);
const Terminal = () => (<svg viewBox="0 0 16 16" className={sb} fill="currentColor"><rect x="1" y="2" width="14" height="12" /><rect x="2" y="3" width="12" height="2" fill="#fff" opacity=".35" /><rect x="3" y="8" width="2" height="2" fill="#fff" /><rect x="6" y="8" width="6" height="2" fill="#fff" /></svg>);
const Controller = () => (<svg viewBox="0 0 16 16" className={sb} fill="currentColor"><rect x="2" y="6" width="12" height="6" /><rect x="1" y="8" width="2" height="3" /><rect x="13" y="8" width="2" height="3" /><rect x="4" y="8" width="2" height="2" fill="#fff" /><rect x="10" y="8" width="2" height="2" fill="#fff" /></svg>);
const Heart = () => (<svg viewBox="0 0 16 16" className={sb} fill="currentColor"><rect x="2" y="3" width="4" height="2" /><rect x="10" y="3" width="4" height="2" /><rect x="1" y="5" width="6" height="2" /><rect x="9" y="5" width="6" height="2" /><rect x="2" y="7" width="12" height="2" /><rect x="3" y="9" width="10" height="2" /><rect x="5" y="11" width="6" height="2" /><rect x="7" y="13" width="2" height="2" /></svg>);
const Star = ({ className = '' }: { className?: string }) => (<svg viewBox="0 0 16 16" className={`pixel-svg ${className}`} fill="currentColor"><rect x="7" y="2" width="2" height="12" /><rect x="2" y="7" width="12" height="2" /><rect x="4" y="4" width="2" height="2" /><rect x="10" y="4" width="2" height="2" /><rect x="4" y="10" width="2" height="2" /><rect x="10" y="10" width="2" height="2" /></svg>);

const sprites = [
  { C: Floppy, cls: 'top-10 right-12 w-9 h-9 text-amber-300/60', d: '0s' },
  { C: Controller, cls: 'top-1/3 left-8 w-8 h-8 text-white/40', d: '1.2s' },
  { C: Terminal, cls: 'bottom-28 right-10 w-9 h-9 text-amber-200/50', d: '0.6s' },
  { C: Heart, cls: 'top-24 left-1/2 w-6 h-6 text-rose-200/60', d: '1.8s' },
  { C: Star, cls: 'bottom-16 left-12 w-6 h-6 text-amber-300/70', d: '2.3s' }
];

export function AuthLayout({ children, formWidth = 'max-w-md' }: { children: ReactNode; formWidth?: string }) {
  return (
    <div className="min-h-screen flex bg-apple-light">
      {/* LEFT — red pixel brand panel */}
      <div className="hidden lg:flex lg:w-[44%] relative overflow-hidden text-white bg-[radial-gradient(ellipse_130%_130%_at_25%_12%,#ef2b42_0%,#c20f24_35%,#7a0a18_70%,#360309_100%)]">
        {/* pixel grid texture */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* moving scanlines */}
        <div className="absolute inset-0 pixel-scanlines pointer-events-none" />
        {/* glow blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="absolute bottom-0 -right-20 w-80 h-80 rounded-full bg-rose-300/10 blur-2xl" />

        {/* floating sprites (interactive on hover) */}
        {sprites.map((s, i) => (
          <span key={i} className={`pixel-float absolute ${s.cls} transition-transform duration-200 hover:scale-150 cursor-pointer`} style={{ animationDelay: s.d }}>
            <s.C />
          </span>
        ))}

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCapIcon className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Udayana ICT</span>
          </Link>

          <div>
            {/* pixel chip */}
            <div className="font-pixel inline-flex items-center gap-2 mb-6 text-[9px] leading-none px-3 py-2 rounded-md bg-black/30 backdrop-blur text-amber-300 border border-white/15">
              <Star className="w-3 h-3 text-amber-300" /> LEVEL UP YOUR ICT <span className="pixel-cursor">_</span>
            </div>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-3xl xl:text-4xl font-extrabold leading-tight mb-8 drop-shadow">
              A/L තොරතුරු තාක්ෂණය<br />ජය ගැනීමේ ගමන මෙතැනින්.
            </motion.h1>

            <ul className="space-y-4">
              {HIGHLIGHTS.map((item, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }} className="flex items-start gap-3 text-rose-50/90">
                  <CheckCircleIcon className="w-5 h-5 mt-0.5 text-amber-300 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-rose-100/70">
            “ඉගෙනගන්න, ඉගෙනගත්ත කෙනෙක්ගෙන් අහලා බලන්න..!”
            <span className="block mt-1 font-semibold text-white/90">— උදයන පසිඳු</span>
          </p>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-10 sm:px-8 overflow-y-auto relative">
        {/* faint pixel sprites on the form side too (interactive) */}
        <span className="pixel-float absolute top-8 right-8 w-6 h-6 text-red-500/15 hidden sm:block hover:scale-150 transition-transform cursor-pointer"><Star /></span>
        <span className="pixel-float absolute bottom-10 left-10 w-6 h-6 text-red-500/15 hidden sm:block hover:scale-150 transition-transform cursor-pointer" style={{ animationDelay: '1.5s' }}><Controller /></span>

        {/* mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-[#c20f24] rounded-xl flex items-center justify-center text-white">
            <GraduationCapIcon className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-apple-text">Udayana ICT</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className={`w-full ${formWidth} relative z-10`}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
