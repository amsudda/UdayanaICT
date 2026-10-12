import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TestimonialsColumn, type Testimonial, TestimonialCard } from '../ui/testimonials-columns-1';

const testimonials: Testimonial[] = [
  {
    text: 'Theory කොටස් සරලව පැහැදිලි කරන නිසා අමාරු පාඩම් පවා ඉක්මනින් තේරුම් ගන්න පුළුවන් වුණා.',
    name: 'Student 01',
    role: 'A/L ICT Student',
    avatarIndex: 0,
  },
  {
    text: 'Weekly online class එකත් recordings ටිකත් නිසා school වැඩ එක්ක class එක balance කරගන්න ලේසි වුණා.',
    name: 'Student 02',
    role: 'A/L ICT Student',
    avatarIndex: 1,
  },
  {
    text: 'Paper discussion වලදී answer structure එක හදන විදිහ පැහැදිලි කරපු එක marks වැඩි කරගන්න ගොඩක් උදව් වුණා.',
    name: 'Student 03',
    role: 'A/L ICT Student',
    avatarIndex: 2,
  },
  {
    text: 'Class එකේ speed එක හොඳයි. Notes, examples සහ revision plan එක එකට ලැබෙන නිසා වැඩේ clear.',
    name: 'Student 04',
    role: 'A/L ICT Student',
    avatarIndex: 3,
  },
  {
    text: 'Miss වුණු lesson එක recording එකෙන් බලලා questions අහන්නත් පුළුවන් නිසා online වුණත් support එක අඩු නැහැ.',
    name: 'Student 05',
    role: 'A/L ICT Student',
    avatarIndex: 4,
  },
  {
    text: 'ICT වලට confidence නැතිව පටන් ගත්තත් step-by-step වැඩපිළිවෙළ නිසා දැන් papers ලියන්න බයක් නැහැ.',
    name: 'Student 06',
    role: 'A/L ICT Student',
    avatarIndex: 5,
  },
  {
    text: 'Timing papers නිසා exam එකේ කාලය manage කරන එක practice වුණා. Feedback එකත් ඉතා පැහැදිලියි.',
    name: 'Student 07',
    role: 'A/L ICT Student',
    avatarIndex: 6,
  },
  {
    text: 'හැම lesson එකකටම practical examples දෙන නිසා definitions මතක තියාගන්නවාට වඩා concept එක තේරෙනවා.',
    name: 'Student 08',
    role: 'A/L ICT Student',
    avatarIndex: 7,
  },
  {
    text: 'Revision programme එකෙන් weak areas හඳුනාගෙන plan එකකට වැඩ කරන්න ලැබුණා. Progress එක පැහැදිලිව දැනුණා.',
    name: 'Student 09',
    role: 'A/L ICT Student',
    avatarIndex: 8,
  },
  {
    text: 'අම්මෝ අයියේ ඔයාට පින් සිද්ධ වෙන්න ශේප් එකේ ගොඩදාගත්තා. ගෲප් එකට දාලා තිබ්බ ෂෝට් නෝට් බස් එකේ හිටගෙනම යද්දි යන්තමට වගේ බලාගෙන ගියා. ඒවා ඒ විදියටම තිබ්බා. තෑන්ක්ස් අයියේ. ඔයාගේ ක්ලාස් ආවේ නැති උනත් ඔයා නිසා සෑහෙන වැඩක් කරගත්තා අයියේ. තෑන්ක්ස් අයියේ..❤️',
    name: 'Student 10',
    role: 'A/L ICT Student',
    avatarIndex: 9,
  },
  {
    text: 'ඇත්තටම සර් මුලින්ම බොහොම ස්තූතියි. මම සර්ගේ වීඩියෝස් ගොඩක් බලල තියෙනව. අපේ දිස්ත්‍රික්කෙ ප්‍රසිද්ධ ගුරුවරුන්ගේ ක්ලාස් වලදිවත් නොලැබිච්ච ලොකු දැනුමක් සර්ගෙන් ලැබුන. නෝට් එකක් පාඩම් නොකර අහගෙන විතරක් හිටියත් හොදටම ඔලුවට යනව. ඇත්තටම ගොඩක් පින් සර්. සර්ට අපි වගෙ තව ළමයි ගොඩක් දෙනෙක්ට දැනුම දෙන්න ශක්තිය ලැබෙන්නෝනේ.❤️',
    name: 'Student 11',
    role: 'A/L ICT Student',
    avatarIndex: 10,
  },
  {
    text: 'Last meeting එකත් එක්ක ආයෙත් ගෙදර ගිහින් බලන්න හිතෙනෝ.',
    name: 'Student 12',
    role: 'A/L ICT Student',
    avatarIndex: 11,
  },
  {
    text: 'Mcq 43 ගෙස් පේපර්ස් හින්දා තමයි ❤️',
    name: 'Student 13',
    role: 'A/L ICT Student',
    avatarIndex: 12,
  },
  {
    text: 'අයියා ලිව්වා අද. අවුලක් ගියේ නෑ.',
    name: 'Student 14',
    role: 'A/L ICT Student',
    avatarIndex: 13,
  },
  {
    text: 'සර් පේපර් එක සමස්තයක් විදිහට ලේසියි සර්. සර් කරවපු අනුමාන ප්‍රශ්න වලට ලඟින් යන ප්‍රශ්න අහලා තිබ්බා ගොඩක්. Thank you sir.',
    name: 'Student 15',
    role: 'A/L ICT Student',
    avatarIndex: 14,
  },
  {
    text: 'Last meeting එක දාපු නිසා හොදට ගියා. ඒ ටික තමයි ඔලුවේ තිබුනේ.',
    name: 'Student 16',
    role: 'A/L ICT Student',
    avatarIndex: 15,
  },
  {
    text: 'මාත් ගැම්මටම ලිව්වා සර්. Live එක බලලා තමා ගියේ. Mcq 32ක් තිබ්බා.',
    name: 'Student 17',
    role: 'A/L ICT Student',
    avatarIndex: 16,
  },
];

type ColumnCount = 1 | 2 | 3;

function getColumnCount(): ColumnCount {
  if (typeof window === 'undefined') return 1;
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 768) return 2;
  return 1;
}

function useColumnCount() {
  const [columnCount, setColumnCount] = useState<ColumnCount>(getColumnCount);

  useEffect(() => {
    const updateColumnCount = () => setColumnCount(getColumnCount());
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  return columnCount;
}

export function TestimonialsSection() {
  const shouldReduceMotion = useReducedMotion();
  const columnCount = useColumnCount();
  const columns = Array.from({ length: columnCount }, (_, columnIndex) =>
    testimonials.filter((_, testimonialIndex) => testimonialIndex % columnCount === columnIndex),
  );
  const durations = columnCount === 1 ? [72] : columnCount === 2 ? [46, 51] : [35, 41, 38];

  return (
    <section id="reviews" className="relative scroll-mt-20 overflow-hidden bg-white py-20 transition-colors dark:bg-slate-950 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-red-50/70 blur-[100px] dark:bg-red-950/20" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, transform: 'translateY(16px)' }}
          whileInView={{ opacity: 1, transform: 'translateY(0)' }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          viewport={{ once: true, amount: 0.4 }}
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
        >
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#c20f24]">
            <span className="h-px w-8 bg-[#c20f24]" />
            Student stories
            <span className="h-px w-8 bg-[#c20f24]" />
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-[-0.035em] text-slate-950 dark:text-white sm:text-4xl lg:text-[44px]">
            සිසුන්ගේ අත්දැකීම්
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
            ICT ඉගෙනීමේදී අපගේ පන්ති සිසුන්ට ලබාදුන් අත්දැකීම ගැන ඔවුන්ගේ අදහස්.
          </p>
        </motion.div>

        {shouldReduceMotion ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} testimonial={testimonial} />
            ))}
          </div>
        ) : (
          <div className="mt-12 flex max-h-[740px] justify-center gap-5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
            {columns.map((column, index) => (
              <TestimonialsColumn
                key={`${columnCount}-${index}`}
                testimonials={column}
                duration={durations[index]}
                className="w-full max-w-sm"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
