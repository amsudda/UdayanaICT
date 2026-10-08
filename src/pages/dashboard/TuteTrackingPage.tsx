import { ExternalLinkIcon, PackageIcon, SearchIcon, TruckIcon, InfoIcon, CheckCircleIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';

const TRACK_URL = 'https://slpmail.slpost.gov.lk/track/';

const steps = [
  {
    step: '1',
    icon: SearchIcon,
    title: 'Find Your Tracking Number',
    body: 'Your tute tracking number is printed on the delivery slip included with your order confirmation. Check your registered email or contact support if you cannot find it.',
    color: 'bg-red-50 text-[#c20f24]',
  },
  {
    step: '2',
    icon: ExternalLinkIcon,
    title: 'Visit the SL Post Tracker',
    body: 'Click the "Track My Tutes" button below. You will be directed to the official Sri Lanka Post mail tracking portal.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    step: '3',
    icon: TruckIcon,
    title: 'Enter Your Tracking Number',
    body: 'On the SL Post website, paste or type your tracking number into the search field and press "Track". You will see the current delivery status and location of your parcel.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    step: '4',
    icon: CheckCircleIcon,
    title: 'Receive Your Tutes',
    body: 'Once the status shows "Delivered", collect your tutes from the address provided during registration. If there is an issue, contact our support team.',
    color: 'bg-green-50 text-green-600',
  },
];

const faqs = [
  {
    q: 'How long does delivery take?',
    a: 'Tutes are typically dispatched within 3 working days of a successful payment. Delivery via Sri Lanka Post usually takes 5–10 working days depending on your district.',
  },
  {
    q: 'I cannot find my tracking number.',
    a: 'Your tracking number is sent to your registered email address after dispatch. If you haven\'t received it, please contact our support team with your student ID and payment reference.',
  },
  {
    q: 'The tracking page shows "No Record Found".',
    a: 'This can happen if the parcel has only just been dispatched and hasn\'t been scanned into the system yet. Please wait 24 hours and try again. If the issue persists, contact support.',
  },
  {
    q: 'My tutes have not arrived after 14 days.',
    a: 'If the tracking status is stuck or shows an unexpected status for more than 14 days, please reach out to our support team immediately so we can investigate with Sri Lanka Post.',
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

export function TuteTrackingPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-10 pb-10"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c20f24]">Learning</p>
        <h1 className="mt-2 text-3xl font-bold text-apple-text flex items-center gap-3">
          <PackageIcon className="w-8 h-8 text-[#c20f24]" />
          Track Your Tutes
        </h1>
        <p className="mt-2 text-apple-subtext max-w-2xl">
          Your physical tutes are delivered via <strong>Sri Lanka Post</strong>. Use the steps below
          to check your parcel's current delivery status in real time.
        </p>
      </motion.div>

      {/* ── Hero CTA Card ── */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0a0c11] border border-slate-800 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
          {/* animated background glow */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="pointer-events-none absolute -top-1/2 -right-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(194,15,36,0.25)_0%,transparent_55%)]"
          />

          <div className="relative z-10 flex-1 text-center md:text-left">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-800 rounded-2xl flex items-center justify-center text-white mx-auto md:mx-0 mb-5 shadow-lg shadow-red-500/30">
              <TruckIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
              Where are my tutes?
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-md">
              Track your parcel on the official Sri Lanka Post tracking portal. You'll need your{' '}
              <span className="text-white font-semibold">tracking number</span> from your dispatch
              confirmation email.
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <a
              href={TRACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#c20f24] hover:bg-[#a50d1e] active:bg-[#8f0b1a] text-white font-bold text-base rounded-2xl transition-colors shadow-lg shadow-red-900/40 group"
            >
              <TruckIcon className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              Track My Tutes
              <ExternalLinkIcon className="w-4 h-4 opacity-70" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── How to Track – Steps ── */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-bold text-apple-text mb-5">How to Track Your Delivery</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {steps.map((s) => (
            <motion.div
              key={s.step}
              variants={itemVariants}
              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                  Step {s.step}
                </p>
                <h3 className="font-semibold text-apple-text mb-1">{s.title}</h3>
                <p className="text-sm text-apple-subtext leading-relaxed">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Info notice ── */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-3 rounded-2xl bg-blue-50 border border-blue-100 p-5">
          <InfoIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 leading-relaxed">
            The tracking portal is operated by <strong>Sri Lanka Posts</strong> and is external to
            this platform. If you experience issues with the portal itself, please visit your nearest
            post office or call the Sri Lanka Post hotline on{' '}
            <a href="tel:0112322600" className="font-semibold underline underline-offset-2">
              011 2322600
            </a>
            .
          </p>
        </div>
      </motion.div>

      {/* ── FAQs ── */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <InfoIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-apple-text">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-apple-text">{faq.q}</h3>
                <p className="mt-2 text-sm leading-6 text-apple-subtext">{faq.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Bottom CTA ── */}
      <motion.div variants={itemVariants} className="text-center">
        <a
          href={TRACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#c20f24] hover:bg-[#a50d1e] text-white font-bold rounded-2xl transition-colors shadow-md shadow-red-900/30 group"
        >
          <TruckIcon className="w-5 h-5" />
          Open SL Post Tracker
          <ExternalLinkIcon className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </a>
        <p className="mt-3 text-xs text-apple-subtext">
          Opens in a new tab &nbsp;·&nbsp; slpmail.slpost.gov.lk
        </p>
      </motion.div>
    </motion.div>
  );
}
