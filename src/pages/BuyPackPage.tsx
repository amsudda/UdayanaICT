import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  Building2Icon,
  CalendarClockIcon,
  CheckCircleIcon,
  CopyIcon,
  FilmIcon,
  Loader2Icon,
  MessageCircleIcon,
  PlayCircleIcon,
  ShoppingBagIcon,
  UploadCloudIcon,
  XIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { BANK_DETAILS as FALLBACK_BANK, WHATSAPP_NUMBER as FALLBACK_WA, formatLKR } from '../data/paymentConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */

const tileCls =
  'rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 transition-colors';

export function BuyPackPage() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pack, setPack] = useState<any | null>(null);
  const [videoCount, setVideoCount] = useState(0);
  const [payStatus, setPayStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [bank, setBank] = useState({ ...FALLBACK_BANK, whatsapp: FALLBACK_WA });

  const [reference, setReference] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const slipInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!packId || !user) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { count }, { data: st }, { data: pays }] = await Promise.all([
        supabase.from('packs').select('*').eq('id', packId).single(),
        supabase.from('pack_videos').select('id', { count: 'exact', head: true }).eq('pack_id', packId),
        supabase.from('settings').select('*').eq('id', 1).single(),
        supabase.from('payments').select('status').eq('student_id', user.id).eq('pack_id', packId).in('status', ['pending', 'approved']).order('created_at', { ascending: false }).limit(1)
      ]);
      if (!p) { setNotFound(true); setLoading(false); return; }
      setPack(p);
      setVideoCount(count ?? 0);
      if (st) {
        setBank({
          bank: st.bank_name || FALLBACK_BANK.bank,
          accountName: st.account_name || FALLBACK_BANK.accountName,
          accountNumber: st.account_number || FALLBACK_BANK.accountNumber,
          branch: st.branch || FALLBACK_BANK.branch,
          whatsapp: st.whatsapp_number || FALLBACK_WA
        });
      }
      if (pays && pays.length) setPayStatus(pays[0].status as 'pending' | 'approved');
      setLoading(false);
    })();
  }, [packId, user]);

  const handleSlip = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const copyAccount = async () => {
    try { await navigator.clipboard.writeText(bank.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user || !pack) return;
    if (!slipFile) { setError('Please attach a photo of your bank deposit slip.'); return; }

    setSubmitting(true);
    const ext = slipFile.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('slips').upload(path, slipFile, { upsert: false });
    if (upErr) { setSubmitting(false); setError(`Could not upload slip: ${upErr.message}`); return; }

    const { error: insErr } = await supabase.from('payments').insert({
      student_id: user.id,
      kind: 'pack',
      pack_id: pack.id,
      amount: pack.price,
      reference: reference.trim() || null,
      slip_url: path,
      status: 'pending'
    });
    setSubmitting(false);
    if (insErr) { setError(insErr.message); return; }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-apple-light dark:bg-slate-950 flex items-center justify-center">
        <Loader2Icon className="w-7 h-7 text-[#c20f24] animate-spin" />
      </div>
    );
  }

  if (notFound || !pack) {
    return (
      <div className="min-h-screen bg-apple-light dark:bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-bold text-apple-text dark:text-apple-light">This class pack could not be found.</p>
        <button onClick={() => navigate('/dashboard/extra-classes')} className="h-11 px-6 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors">
          Back to store
        </button>
      </div>
    );
  }

  const waText = encodeURIComponent(`Hello, I want to buy "${pack.title}" (${formatLKR(pack.price)}). Here is my deposit slip:`);
  const owned = payStatus === 'approved';
  const pendingAlready = payStatus === 'pending' && !done;

  return (
    <div className="min-h-screen bg-apple-light dark:bg-slate-950 transition-colors">
      {/* header */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur border-b border-gray-100 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-full text-apple-subtext hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <span className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <ShoppingBagIcon className="w-4 h-4 text-[#c20f24]" />
          </span>
          <h1 className="font-bold text-apple-text dark:text-apple-light">Buy class</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">

        {/* ── LEFT: class details ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 transition-colors">
          {pack.thumbnail_url && (
            <div className="h-52 sm:h-72 bg-slate-100 dark:bg-slate-800">
              <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-5 sm:p-7">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-apple-subtext dark:text-slate-400 mb-3">
              Class
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-apple-text dark:text-apple-light leading-snug transition-colors">
              {pack.title}
            </h2>
            {pack.type && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-apple-subtext dark:text-slate-400">
                <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> {pack.type} · Recorded video pack
              </p>
            )}

            {/* info tiles */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={tileCls}>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-apple-text dark:text-apple-light"><PlayCircleIcon className="w-4 h-4 text-emerald-500" /> Recorded Videos</p>
                <p className="text-xs text-apple-subtext dark:text-slate-400 mt-0.5">Content</p>
              </div>
              <div className={tileCls}>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-apple-text dark:text-apple-light"><FilmIcon className="w-4 h-4 text-amber-500" /> {videoCount} video{videoCount === 1 ? '' : 's'}</p>
                <p className="text-xs text-apple-subtext dark:text-slate-400 mt-0.5">Lessons</p>
              </div>
              <div className={tileCls}>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-apple-text dark:text-apple-light"><CalendarClockIcon className="w-4 h-4 text-blue-500" /> {pack.duration_label || 'No deadline'}</p>
                <p className="text-xs text-apple-subtext dark:text-slate-400 mt-0.5">Access</p>
              </div>
            </div>

            {/* about */}
            <div className="mt-7">
              <h3 className="text-sm font-bold uppercase tracking-wider text-apple-subtext dark:text-slate-400 mb-2.5">About this class</h3>
              <p className="text-[15px] leading-relaxed text-apple-text dark:text-slate-300 whitespace-pre-line transition-colors">
                {pack.description || 'මෙම pack එක මිලදී ගැනීමෙන් පසු ඔබට සියලුම වීඩියෝ පාඩම් ඕනෑම වේලාවක නැරඹිය හැක. ගෙවීම තහවුරු වූ වහාම "My Classes" තුළ pack එක unlock වේ.'}
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── RIGHT: purchase panel ── */}
        <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
          className="lg:sticky lg:top-20 space-y-4">

          <p className="text-3xl font-black text-apple-text dark:text-apple-light tracking-tight">
            {formatLKR(pack.price)}
          </p>

          {done ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 text-center transition-colors">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-4"><CheckCircleIcon className="w-7 h-7 text-emerald-500" /></div>
              <h3 className="text-lg font-bold text-apple-text dark:text-apple-light mb-1.5">Slip received 🎉</h3>
              <p className="text-sm text-apple-subtext dark:text-slate-400">
                Your payment is <span className="font-semibold">pending verification</span>. Once the tutor confirms it, this pack unlocks in <span className="font-semibold">My Classes</span>.
              </p>
              <Link to="/dashboard/courses" className="mt-5 inline-flex w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors items-center justify-center">
                Go to My Classes
              </Link>
            </div>
          ) : owned ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 text-center transition-colors">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-4"><CheckCircleIcon className="w-7 h-7 text-emerald-500" /></div>
              <h3 className="text-lg font-bold text-apple-text dark:text-apple-light mb-1.5">You already own this pack</h3>
              <Link to={`/dashboard/watch/${pack.id}`} className="mt-4 inline-flex w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors items-center justify-center gap-2">
                <PlayCircleIcon className="w-5 h-5" /> Watch now
              </Link>
            </div>
          ) : pendingAlready ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 text-center transition-colors">
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center mb-4"><Loader2Icon className="w-7 h-7 text-amber-500" /></div>
              <h3 className="text-lg font-bold text-apple-text dark:text-apple-light mb-1.5">Payment pending review</h3>
              <p className="text-sm text-apple-subtext dark:text-slate-400">
                You've already sent a slip for this pack. The tutor will verify it soon — the pack then unlocks automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 space-y-5 transition-colors">
              {/* payment method (bank slip only) */}
              <div>
                <p className="text-sm font-bold text-apple-text dark:text-apple-light mb-2">Payment method</p>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-gray-100 dark:bg-slate-800">
                  <span className="h-9 rounded-full flex items-center justify-center text-xs font-semibold text-apple-subtext dark:text-slate-500" title="Coming soon">
                    Pay Online
                  </span>
                  <span className="h-9 rounded-full bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-xs font-bold text-apple-text dark:text-apple-light">
                    Bank Slip
                  </span>
                </div>
                <p className="text-xs text-apple-subtext dark:text-slate-400 mt-2">
                  Deposit to the account below, then upload your slip to continue.
                </p>
              </div>

              {/* bank account card */}
              <div className="rounded-2xl border border-gray-100 dark:border-slate-800 p-4 transition-colors">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center"><Building2Icon className="w-4 h-4 text-[#c20f24]" /></span>
                  <div>
                    <p className="text-sm font-bold text-apple-text dark:text-apple-light leading-tight">{bank.bank}</p>
                    <p className="text-[11px] text-apple-subtext dark:text-slate-400">{bank.branch} branch</p>
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-apple-subtext dark:text-slate-500 mb-1">Account number</p>
                <button type="button" onClick={copyAccount}
                  className="w-full flex items-center justify-between gap-2 rounded-xl bg-gray-50 dark:bg-slate-800 px-3.5 h-11 font-mono font-bold text-apple-text dark:text-apple-light hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  {bank.accountNumber}
                  {copied ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4 text-apple-subtext" />}
                </button>
                <div className="flex justify-between mt-3 text-xs">
                  <span className="text-apple-subtext dark:text-slate-400">Account holder</span>
                  <span className="font-semibold text-apple-text dark:text-apple-light">{bank.accountName}</span>
                </div>
              </div>

              {/* total */}
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-4">
                <span className="text-sm text-apple-subtext dark:text-slate-400">Total</span>
                <span className="text-lg font-black text-apple-text dark:text-apple-light">{formatLKR(pack.price)}</span>
              </div>

              {/* slip upload */}
              <div>
                <input ref={slipInputRef} type="file" accept="image/*" className="sr-only" onChange={handleSlip} />
                {slipPreview ? (
                  <div className="flex items-center gap-3 rounded-xl border border-apple-border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2">
                    <img src={slipPreview} alt="slip" className="h-14 w-20 object-cover rounded-lg" />
                    <span className="text-sm text-apple-text dark:text-apple-light flex-1 truncate">Slip attached</span>
                    <button type="button" onClick={() => slipInputRef.current?.click()} className="text-xs font-medium text-[#c20f24] hover:underline">Change</button>
                    <button type="button" onClick={() => { setSlipFile(null); setSlipPreview(undefined); }} className="text-apple-subtext hover:text-red-500 transition-colors" aria-label="Remove"><XIcon className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => slipInputRef.current?.click()}
                    className="w-full h-16 flex items-center justify-center gap-2 rounded-xl border border-dashed border-apple-border dark:border-slate-700 text-apple-subtext dark:text-slate-400 hover:border-[#c20f24] hover:text-[#c20f24] transition-colors text-sm font-medium">
                    <UploadCloudIcon className="w-4 h-4" /> Upload slip
                  </button>
                )}
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank reference / note (optional)"
                  className="mt-2 w-full h-11 rounded-xl border border-apple-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-apple-text dark:text-apple-light placeholder:text-apple-subtext focus:outline-none focus:ring-2 focus:ring-[#c20f24]" />
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button type="submit" disabled={submitting}
                className="w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {submitting && <Loader2Icon className="w-4 h-4 animate-spin" />}{submitting ? 'Submitting…' : 'Upload slip & submit'}
              </button>

              <a href={`https://wa.me/${bank.whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-[#25D366] hover:underline">
                <MessageCircleIcon className="w-4 h-4" /> Or send the slip on WhatsApp
              </a>
            </form>
          )}
        </motion.aside>
      </main>
    </div>
  );
}
