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

/**
 * Split-screen auth shell: marketing panel on the left (desktop),
 * the form (children) on the right. Used by Login & Signup.
 */
export function AuthLayout({
  children,
  formWidth = 'max-w-md',
}: {
  children: ReactNode;
  formWidth?: string;
}) {
  return (
    <div className="min-h-screen flex bg-apple-light">
      {/* LEFT — brand / value panel */}
      <div className="hidden lg:flex lg:w-[44%] relative overflow-hidden bg-[radial-gradient(ellipse_120%_120%_at_20%_10%,#1d6fff_0%,#0a4bd1_40%,#06277a_75%,#041a52_100%)] text-white">
        {/* decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 -right-20 w-80 h-80 rounded-full bg-cyan-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCapIcon className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Udayana ICT</span>
          </Link>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl xl:text-4xl font-extrabold leading-tight mb-8"
            >
              A/L තොරතුරු තාක්ෂණය<br />ජය ගැනීමේ ගමන මෙතැනින්.
            </motion.h1>

            <ul className="space-y-4">
              {HIGHLIGHTS.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
                  className="flex items-start gap-3 text-blue-50/90"
                >
                  <CheckCircleIcon className="w-5 h-5 mt-0.5 text-cyan-300 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-blue-100/70">
            “ඉගෙනගන්න, ඉගෙනගත්ත කෙනෙක්ගෙන් අහලා බලන්න..!”
            <span className="block mt-1 font-semibold text-white/90">— උදයන පසිඳු</span>
          </p>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-10 sm:px-8 overflow-y-auto">
        {/* mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-apple-blue rounded-xl flex items-center justify-center text-white">
            <GraduationCapIcon className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-apple-text">Udayana ICT</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`w-full ${formWidth}`}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
