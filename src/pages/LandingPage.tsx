import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircleIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  TimerIcon,
  GaugeIcon,
  ClipboardCheckIcon,
  MoonIcon,
  HistoryIcon,
  FileQuestionIcon,
  CalendarDaysIcon,
  BookOpenIcon,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { CourseCard } from '../components/shared/CourseCard';
import { PixelPageBurst, PixelReveal } from '../components/shared/PixelFx';
import { ReviewCard, type Review } from '../components/shared/ReviewCard';
import { BookMockup } from '../components/shared/BookMockup';
import { overlayClasses } from '../lib/overlay';
import { supabase } from '../lib/supabase';

/* ── tiny 8-bit pixel sprites (SVG, crisp) ── */
const svgBase = 'pixel-svg w-full h-full';
const PixelFloppy = () => (
  <svg viewBox="0 0 16 16" className={svgBase} fill="currentColor"><rect x="1" y="1" width="14" height="14" /><rect x="3" y="2" width="8" height="4" fill="#fff" /><rect x="9" y="2" width="2" height="4" /><rect x="4" y="9" width="8" height="5" fill="#fff" /><rect x="6" y="10" width="4" height="3" /></svg>
);
const PixelTerminal = () => (
  <svg viewBox="0 0 16 16" className={svgBase} fill="currentColor"><rect x="1" y="2" width="14" height="12" /><rect x="2" y="3" width="12" height="2" fill="#fff" opacity=".35" /><rect x="3" y="8" width="2" height="2" fill="#fff" /><rect x="6" y="8" width="6" height="2" fill="#fff" /></svg>
);
const PixelController = () => (
  <svg viewBox="0 0 16 16" className={svgBase} fill="currentColor"><rect x="2" y="6" width="12" height="6" /><rect x="1" y="8" width="2" height="3" /><rect x="13" y="8" width="2" height="3" /><rect x="4" y="8" width="2" height="2" fill="#fff" /><rect x="10" y="8" width="2" height="2" fill="#fff" /></svg>
);
const PixelStar = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={`pixel-svg ${className}`} fill="currentColor"><rect x="7" y="2" width="2" height="12" /><rect x="2" y="7" width="12" height="2" /><rect x="4" y="4" width="2" height="2" /><rect x="10" y="4" width="2" height="2" /><rect x="4" y="10" width="2" height="2" /><rect x="10" y="10" width="2" height="2" /></svg>
);

const heroSprites = [
  { Comp: PixelFloppy, cls: 'top-10 left-[5%] w-8 h-8 text-[#c20f24]/25', delay: '0s' },
  { Comp: PixelController, cls: 'top-1/2 left-[1%] w-7 h-7 text-violet-400/25', delay: '1.3s' },
  { Comp: PixelStar, cls: 'bottom-14 left-[9%] w-5 h-5 text-amber-400/40', delay: '2.1s' },
  { Comp: PixelTerminal, cls: 'top-8 right-[3%] w-8 h-8 text-emerald-400/25', delay: '0.6s' },
  { Comp: PixelStar, cls: 'bottom-24 right-[2%] w-4 h-4 text-blue-400/40', delay: '1.7s' }
];

/* Two-tone paper plane, decorative */
const PaperPlane = ({ dark, light, className = '', style }: { dark: string; light: string; className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 120 70" className={className} style={style} aria-hidden>
    <polygon points="0,52 115,2 62,42" fill={dark} />
    <polygon points="62,42 115,2 78,62" fill={light} />
  </svg>
);

/* "Our Process" cards — how the class programme works. */
const PROCESS_STEPS = [
  {
    icon: GraduationCapIcon,
    color: 'text-emerald-500',
    title: 'Theory and Revision',
    text: 'ආකර්ෂණීය ඉගැන්වීම් රටාව මගින් සංකීර්ණ විෂය සරලව උගන්වා විභාගයට මසකට පෙර සම්පූර්ණ විෂය නිර්දේශය ආවරණය කිරීම.',
  },
  {
    icon: TimerIcon,
    color: 'text-blue-500',
    title: 'Timing Paper',
    text: 'ප්‍රශ්න වලට පිළිතුරු ලිවීමේ වේගය හුරු කිරීම වෙනුවෙන් පලමු දින සිටම විභාගය දක්වාම සෑම දිනකම පැවැත්වෙන කෙටි ප්‍රශ්න පත්‍ර මාලාව.',
  },
  {
    icon: GaugeIcon,
    color: 'text-[#c20f24]',
    title: 'Speed Revision',
    text: 'ප්‍රතිඵල පැමිණි විගස ආරම්භ වන, අසාර්ථක වූවන් විශිෂ්ඨයන් බවට පත්කරන හා පන්ති පැමිණෙන නොපැමිණෙන සියලු සිසුන්ට නොමිලේ සම්බන්ධ විය හැකි අධිවේගී Revision පන්තිය.',
  },
  {
    icon: ClipboardCheckIcon,
    color: 'text-violet-500',
    title: 'Final Paper Class',
    text: 'Online Zoom තාක්ෂණය හරහා ලමුන්ට ප්‍රශ්න පත්‍ර ලිවීම හා සතියක් ඇතුලත ප්‍රශ්න පත්‍ර සාකච්ඡාව පැවැත්වීම මගින් ලමුන්ව ප්‍රශ්න පත්‍ර ලිවීමට හුරු කිරීම.',
  },
  {
    icon: MoonIcon,
    color: 'text-amber-400',
    title: 'Night Class',
    text: 'රාත්‍රී 7 සිට පසුදා උදෑසන වනතෙක් පැවැත්වෙන දුර්වල සිසුන් පුහුණු කරවන විශේෂ වැඩසටහන.',
  },
  {
    icon: HistoryIcon,
    color: 'text-indigo-500',
    title: 'Memory Recharge Papers',
    text: 'සෑම මසකම විෂය කරුණු අමතක වීමට ඉඩ නොදී විභාග ප්‍රශ්න වළට හුරු කරවීම මෙහිදි සිදු කරයි.',
  },
  {
    icon: FileQuestionIcon,
    color: 'text-orange-500',
    title: 'Guess Paper Class',
    text: 'විභාගයට මාසෙකට පෙර ආරම්භ වන මෙම වැඩසටහන හරහා අනුමාන ප්‍රශ්න ලියවීම හා සාකච්ඡා කිරීම මෙහිදී සිදු කරයි.',
  },
  {
    icon: CalendarDaysIcon,
    color: 'text-teal-500',
    title: 'Monthly Meeting',
    text: 'අධෛර්යමත් වූ සිසුන් ධෛර්යමත් කිරීම සඳහා තාක්ෂණවේදයෙන් සාර්ථක වූ විශිෂ්ඨයන් සමග අධ්‍යාපන මෙන්ම බාහිර ගැටලු නිරාකරණයට පැවැත්වෙන විශේෂ වැඩසටහන.',
    wide: true,
  },
];

export function LandingPage() {
  const [currentPromo, setCurrentPromo] = useState(0);
  const [paused, setPaused] = useState(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewCount, setReviewCount] = useState(6);
  const [books, setBooks] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('books')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order')
      .then(({ data }) => setBooks(data ?? []));
  }, []);

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data && data.landing_review_count != null) setReviewCount(data.landing_review_count);
    });
  }, []);

  useEffect(() => {
    supabase
      .from('reviews')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length) {
          setReviews(
            data.map((r: any) => ({
              id: r.id,
              name: r.name,
              school: r.school,
              grade: r.grade,
              stars: r.stars ?? 5,
              quote: r.quote,
              year: r.exam_year,
              avatar: r.avatar_url,
            }))
          );
        }
      });
  }, []);

  useEffect(() => {
    supabase
      .from('featured_courses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setFeatured(
          (data ?? []).map((c: any) => ({
            id: c.id,
            title: c.title,
            description: c.description ?? '',
            image: c.image_url ?? '',
            progress: 0,
            lessonCount: 0,
            category: c.tag ?? 'Course'
          }))
        );
      });
  }, []);

  useEffect(() => {
    supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .eq('audience_scope', 'public')
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length) {
          setPromos(
            data.map((p: any) => ({
              id: p.id,
              tag: p.tag ?? '',
              title: p.title,
              description: p.description ?? '',
              image: p.image_url ?? '',
              ctaText: p.cta_text ?? 'Learn more',
              ctaLink: p.cta_link ?? '/signup',
              imageFit: p.image_fit ?? 'cover',
              imagePosition: p.image_position ?? 'center',
              fontFamily: p.font_family ?? '',
              showOverlay: p.show_overlay ?? true,
              overlayPosition: p.overlay_position ?? 'left'
            }))
          );
          setCurrentPromo(0);
        }
      });
  }, []);

  const nextPromo = () => setCurrentPromo((prev) => (prev + 1) % promos.length);
  const prevPromo = () =>
    setCurrentPromo((prev) => (prev - 1 + promos.length) % promos.length);

  useEffect(() => {
    if (paused || promos.length === 0) return;
    const timer = setInterval(nextPromo, 5000);
    return () => clearInterval(timer);
  }, [paused, promos.length]);

  // safe accessor — guards against currentPromo being out of range after a refetch
  const activePromo = promos[currentPromo % promos.length] ?? promos[0];

  return (
    <div className="min-h-screen bg-apple-light dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      <PixelPageBurst />
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-0 overflow-hidden bg-white dark:bg-slate-950 transition-colors">
          {/* Soft layered red wash — very subtle, warms up the white */}
          <div
            className="absolute inset-0 -z-10 dark:hidden"
            style={{
              background:
                'linear-gradient(180deg, rgba(194,15,36,0.055) 0%, rgba(255,255,255,0) 40%), radial-gradient(ellipse 70% 80% at 35% 38%, rgba(194,15,36,0.10), transparent 65%), radial-gradient(ellipse 45% 55% at 84% 80%, rgba(194,15,36,0.075), transparent 70%)'
            }}
          />
          <div
            className="absolute inset-0 -z-10 hidden dark:block"
            style={{
              background:
                'linear-gradient(180deg, rgba(194,15,36,0.12) 0%, rgba(2,6,23,0) 45%), radial-gradient(ellipse 70% 80% at 35% 38%, rgba(194,15,36,0.20), transparent 65%), radial-gradient(ellipse 45% 55% at 84% 80%, rgba(194,15,36,0.15), transparent 70%)'
            }}
          />

          {/* floating 8-bit sprites */}
          <div className="pointer-events-none absolute inset-0 hidden sm:block" style={{ zIndex: -1 }} aria-hidden>
            {heroSprites.map((s, i) => (
              <span key={i} className={`pixel-float absolute ${s.cls}`} style={{ animationDelay: s.delay }}>
                <s.Comp />
              </span>
            ))}
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-end">

              {/* LEFT: brand block — poster style */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="flex flex-col items-center text-center pb-10 lg:pb-20 pt-4"
              >
                {/* Brand Logo */}
                <img
                  src="/images/pd-logo.png"
                  alt="Pasindu Dissanayake Logo"
                  className="w-32 h-32 md:w-44 md:h-44 mb-5 object-contain drop-shadow-lg"
                />

                {/* Pixel "level up" chip */}
                <div className="font-pixel inline-flex items-center gap-2 mb-5 text-[9px] leading-none px-3 py-2 rounded-md bg-apple-text text-white dark:bg-white dark:text-slate-900">
                  <PixelStar className="w-3 h-3 text-amber-400" />
                  LEVEL UP YOUR ICT
                  <span className="pixel-cursor">_</span>
                </div>

                {/* Name */}
                <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase text-apple-text dark:text-apple-light transition-colors">
                  Pasindu Dissanayake
                </h1>
                <p className="mt-3 text-[11px] md:text-xs font-semibold tracking-[0.22em] md:tracking-[0.32em] uppercase text-apple-subtext dark:text-slate-400 transition-colors">
                  Advanced Level Information & Communication Technology
                </p>

                {/* Tagline */}
                <p className="mt-7 text-lg md:text-xl font-medium text-apple-text dark:text-apple-light leading-relaxed max-w-md transition-colors">
                  <span className="text-[#c20f24] text-2xl font-serif leading-none mr-1">"</span>
                  ඉගෙනගන්න, ඉගෙනගත්ත කෙනෙක්ගෙන් අහලා බලන්න..!
                  <span className="text-[#c20f24] text-2xl font-serif leading-none ml-1">"</span>
                </p>

                {/* CTA Buttons */}
                <div className="mt-9 flex flex-col sm:flex-row items-center gap-4">
                  <a
                    href="https://whatsapp.com/channel/0029Vb6zVpy4tRrtEpCZ7n1i"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 h-12 px-7 text-base rounded-full font-semibold bg-[#25D366] hover:bg-[#20b858] text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Join Our WhatsApp Channel
                  </a>
                  <a
                    href="https://wa.me/94719735601"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 h-12 px-7 text-base rounded-full font-semibold bg-[#c20f24] hover:bg-[#9c0c1d] text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <MessageCircleIcon className="w-5 h-5 flex-shrink-0" />
                    පන්ති පිළිබඳ විමසීම්
                  </a>
                </div>
              </motion.div>

              {/* RIGHT: cutout portrait rising from the section edge */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="relative flex justify-center lg:justify-end items-end"
              >
                {/* soft glow behind the portrait */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 w-[420px] h-[420px] max-w-full rounded-full bg-[radial-gradient(circle,rgba(194,15,36,0.13),transparent_65%)] dark:bg-[radial-gradient(circle,rgba(194,15,36,0.28),transparent_65%)] pointer-events-none" aria-hidden />
                <img
                  src="/images/pasindu-hero.png"
                  alt="Pasindu Dissanayake — ICT ගුරුවරයා"
                  className="relative w-[300px] sm:w-[380px] lg:w-[440px] max-w-full select-none pointer-events-none drop-shadow-[0_18px_40px_rgba(194,15,36,0.18)]"
                  draggable={false}
                />
              </motion.div>
            </div>

          </div>
        </section>

        {/* Promotions / Announcements Carousel — only when real promos exist */}
        {promos.length > 0 && (
        <section id="promos" className="py-16 bg-white dark:bg-slate-900 transition-colors scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="text-center mb-10">
              <span className="inline-block py-1.5 px-4 rounded-full bg-red-50 dark:bg-red-900/30 text-[#c20f24] font-medium text-sm mb-4 border border-red-100 dark:border-red-900 transition-colors">
                නවතම තොරතුරු
              </span>
              <p className="text-lg text-apple-subtext dark:text-slate-400 max-w-2xl mx-auto transition-colors">
                නවතම පන්ති, විශේෂ දීමනා සහ වැදගත් නිවේදන මෙතැනින් බලාගන්න.
              </p>
            </div>

            <div
              className="relative group rounded-3xl overflow-hidden shadow-apple dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] h-[340px] md:h-[440px] bg-slate-900"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPromo}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  <img
                    src={activePromo.image}
                    alt={activePromo.title}
                    className="w-full h-full"
                    style={{
                      objectFit: (activePromo as any).imageFit ?? 'cover',
                      objectPosition: (activePromo as any).imagePosition ?? 'center'
                    }}
                  />
                  {(activePromo as any).showOverlay !== false ? (
                    (() => {
                      const ov = overlayClasses((activePromo as any).overlayPosition ?? 'left');
                      return (
                        <>
                          {/* dark shading follows the text position for legibility */}
                          <div className={`absolute inset-0 z-10 ${ov.gradient}`} />

                          {/* Content */}
                          <div className={`absolute inset-0 z-20 flex flex-col p-8 sm:p-12 md:p-16 ${ov.justify} ${ov.items}`} style={{ fontFamily: (activePromo as any).fontFamily || undefined }}>
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 0.15 }}
                              className="max-w-2xl"
                            >
                              <span className="inline-block py-1 px-3.5 rounded-full bg-[#c20f24] text-white font-semibold text-xs sm:text-sm mb-4 shadow-lg">
                                {activePromo.tag}
                              </span>
                              <h3 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-md">
                                {activePromo.title}
                              </h3>
                              <p className={`text-base md:text-lg text-gray-200 mb-7 max-w-lg leading-relaxed ${ov.blockAlign}`}>
                                {activePromo.description}
                              </p>
                              <Link to={activePromo.ctaLink}>
                                <Button size="lg" className="font-semibold !bg-[#c20f24] hover:!bg-[#9c0c1d]">
                                  {activePromo.ctaText}
                                </Button>
                              </Link>
                            </motion.div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    /* Image-only ad — the whole slide is the link */
                    activePromo.ctaLink ? (
                      <Link to={activePromo.ctaLink} aria-label={activePromo.title} className="absolute inset-0 z-10" />
                    ) : null
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Prev / Next arrows */}
              <button
                onClick={prevPromo}
                aria-label="Previous"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <button
                onClick={nextPromo}
                aria-label="Next"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>

              {/* Indicators */}
              <div className="absolute bottom-6 left-8 sm:left-12 md:left-16 z-30 flex gap-2">
                {promos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPromo(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-2.5 rounded-full transition-all ${idx === currentPromo ? 'bg-white w-8' : 'bg-white/50 w-2.5 hover:bg-white/80'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Featured Courses — only shown when the tutor has published public packs */}
        {featured.length > 0 && (
          <section id="courses" className="py-24 bg-apple-light dark:bg-slate-950 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-apple-text dark:text-apple-light transition-colors mb-4">
                  Featured Courses
                </h2>
                <p className="text-lg text-apple-subtext dark:text-slate-400 max-w-2xl mx-auto transition-colors">
                  Comprehensive courses designed to help you excel in both theory
                  and practical examinations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featured.map((course) => (
                  <CourseCard key={course.id} course={course} showProgress={false} />
                ))}
              </div>

              <div className="mt-12 text-center">
                <Link to="/signup">
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2 mx-auto dark:border-slate-700 dark:text-apple-light dark:hover:bg-slate-800 transition-colors"
                  >
                    Sign up to see all <ArrowRightIcon className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ===== TESTIMONIALS SECTION — only when real reviews exist ===== */}
        {reviews.length > 0 && (
        <section id="reviews" className="py-24 bg-gradient-to-b from-red-50/50 to-white dark:from-slate-900 dark:to-slate-950 overflow-hidden transition-colors scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <span className="inline-block py-1.5 px-4 rounded-full bg-red-50 dark:bg-red-900/30 text-[#c20f24] font-medium text-sm mb-4 border border-red-100 dark:border-red-900">
                සිසුන්ගේ අදහස්
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-apple-text dark:text-apple-light mb-4 transition-colors">
                අපගේ සිසුන් පවසන දේ
              </h2>
              <p className="text-lg text-apple-subtext dark:text-slate-400 max-w-xl mx-auto transition-colors">
                Pasindu Dissanayake හරහා A/L තොරතුරු තාක්ෂණය ජය ගත් සිසුන් ගේ අත්දැකීම්
              </p>
            </motion.div>

            {/* Testimonial Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, reviewCount).map((t, idx) => (
                <motion.div
                  key={t.id ?? idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <ReviewCard review={t} />
                </motion.div>
              ))}
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-12 text-center"
            >
              <Link to="/signup">
                <Button size="lg" className="font-semibold !bg-[#c20f24] hover:!bg-[#9c0c1d]">
                  ඔබේ ජය ගමන ආරම්භ කරන්න →
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
        )}

        {/* Features / Why Choose Us */}
        <section id="features" className="relative py-24 bg-white dark:bg-slate-900 overflow-hidden transition-colors scroll-mt-20">
          {/* decorative paper planes */}
          <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
            <PaperPlane dark="#9c0c1d" light="#e3142b" className="pixel-float absolute top-44 right-[14%] w-32" />
            <PaperPlane dark="#94a3b8" light="#cbd5e1" className="pixel-float absolute top-80 right-[24%] w-24 opacity-70" style={{ animationDelay: '1.6s' }} />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <h2 className="flex items-center justify-center gap-3 text-3xl md:text-4xl font-bold text-apple-text dark:text-apple-light transition-colors">
                <BookOpenIcon className="w-9 h-9 text-amber-400" strokeWidth={2.4} />
                ආකර්ෂණීය ඉගැන්වීම් රටාව
              </h2>
              <p className="mt-3 text-base md:text-lg text-apple-subtext dark:text-slate-400 transition-colors">
                - සරල, ආකර්ෂණීය, සහ ඵලදායී ඉගෙනුම් අත්දැකීමක් -
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Media card — swap this img for the class video when it's ready */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-[320px] mx-auto"
              >
                {/* muted looping class video — oversized + pointer-events-none hides YouTube overlays */}
                <div className="relative rounded-3xl overflow-hidden aspect-[9/16] bg-slate-900 shadow-[0_24px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                  <iframe
                    src="https://www.youtube.com/embed/JPyY1Qrjy0I?autoplay=1&mute=1&loop=1&playlist=JPyY1Qrjy0I&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3"
                    title="Pasindu Dissanayake පන්තිය"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[103%] h-[103%] pointer-events-none"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    frameBorder="0"
                  />
                </div>
              </motion.div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                <h3 className="text-2xl md:text-3xl font-bold text-apple-text dark:text-apple-light transition-colors mb-5">
                  How We Structure Our Classes
                </h3>
                <div className="space-y-4 text-base md:text-lg leading-relaxed text-apple-subtext dark:text-slate-400 transition-colors mb-8">
                  <p>
                    අපගේ අනන්‍ය ඉගැන්වීම් ක්‍රමවේදය තුළින් A/L ICT සංකීර්ණ විෂය කරුණු
                    සරලව හා ප්‍රායෝගිකව ඉගැන්වීම සිදු කරයි.
                  </p>
                  <p>
                    පාඩම් වළ ඇති ප්‍රායෝගික විෂය කරුණු සියල්ලම පන්තිය තුළදීම සිදු කරයි.
                  </p>
                  <p>
                    Past Papers සහ Model Papers නිරන්තරයෙන් සාකච්ඡා කරමින් විභාගයට
                    ඉහළම සූදානම් කිරීමක් සිදු කරයි.
                  </p>
                </div>
                <a
                  href="https://www.youtube.com/@Pasindu_Dissanayake-ICT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-[#c20f24] hover:bg-[#9c0c1d] text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  Learn More
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Books showcase — only when the admin has added visible books */}
        {books.length > 0 && (
          <section id="books" className="py-24 bg-white dark:bg-slate-900 transition-colors scroll-mt-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold uppercase text-apple-text dark:text-apple-light transition-colors">
                  OUR BOOKS <PixelReveal className="w-5 h-5 text-[#c20f24]" />
                </h2>
                <p className="mt-3 text-base md:text-lg text-apple-subtext dark:text-slate-400 transition-colors">
                  Short Notes, Model Papers සහ තවත් පොත් — ඔබේ විභාග සූදානමට.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16 justify-items-center">
                {books.map((b, idx) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: (idx % 3) * 0.12 }}
                    className="flex flex-col items-center w-full max-w-[240px]"
                  >
                    {b.cover_url && <BookMockup cover={b.cover_url} title={b.title} className="w-44 sm:w-48" />}
                    <h3 className="mt-5 text-lg font-bold text-apple-text dark:text-apple-light text-center transition-colors">
                      {b.title}
                    </h3>
                    {b.price && (
                      <p className="mt-1 text-[#c20f24] font-extrabold tracking-wide">{b.price}</p>
                    )}
                    {b.order_link && (
                      <a
                        href={b.order_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#c20f24] hover:bg-[#9c0c1d] text-white text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95"
                      >
                        Order Now
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Our Process */}
        <section id="process" className="py-24 bg-apple-light dark:bg-slate-950 transition-colors scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold uppercase text-apple-text dark:text-apple-light transition-colors">
                OUR PROCESS <PixelReveal className="w-5 h-5 text-[#c20f24]" />
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PROCESS_STEPS.map((step, idx) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (idx % 3) * 0.1 }}
                  className={`group card-pop bg-white dark:bg-slate-800 rounded-2xl px-6 py-8 text-center border border-gray-100 dark:border-slate-700 shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:border-[#c20f24]/25 hover:shadow-[0_20px_45px_rgba(194,15,36,0.14)] ${step.wide ? 'md:col-span-2 lg:col-span-2' : ''}`}
                >
                  <div className="pop-icon mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-slate-700/60 group-hover:bg-[#c20f24]/[0.07]">
                    <step.icon className={`w-8 h-8 ${step.color}`} strokeWidth={2.2} />
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-apple-text dark:text-apple-light transition-colors">
                    {step.title}
                  </h3>
                  <p className={`text-sm leading-relaxed text-apple-subtext dark:text-slate-400 transition-colors ${step.wide ? 'max-w-3xl mx-auto' : ''}`}>
                    {step.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
