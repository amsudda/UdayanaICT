import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2Icon,
  CheckCircleIcon,
  CopyIcon,
  FilmIcon,
  MessageCircleIcon,
  UploadCloudIcon,
  XIcon,
  Loader2Icon
} from 'lucide-react';
import { BANK_DETAILS as FALLBACK_BANK, WHATSAPP_NUMBER as FALLBACK_WA, formatLKR } from '../../data/paymentConfig';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';

interface Pack {
  id: string;
  title: string;
  type: string;
  price: number;
  thumbnailUrl?: string;
  duration: string;
  videoCount: number;
}

export function BuyPackModal({ pack, onClose, onSubmitted }: { pack: Pack; onClose: () => void; onSubmitted: () => void }) {
  const { user } = useAuth();
  const [bank, setBank] = useState({ ...FALLBACK_BANK, whatsapp: FALLBACK_WA });
  const [reference, setReference] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const slipInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) setBank({
        bank: data.bank_name || FALLBACK_BANK.bank,
        accountName: data.account_name || FALLBACK_BANK.accountName,
        accountNumber: data.account_number || FALLBACK_BANK.accountNumber,
        branch: data.branch || FALLBACK_BANK.branch,
        whatsapp: data.whatsapp_number || FALLBACK_WA
      });
    });
  }, []);

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
    if (!user) return;
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

  const waText = encodeURIComponent(`Hello, I want to buy "${pack.title}" (${formatLKR(pack.price)}). Here is my deposit slip:`);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-apple-text dark:text-apple-light">{done ? 'Request submitted' : 'Buy this pack'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-apple-subtext hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" aria-label="Close"><XIcon className="w-5 h-5" /></button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-4"><CheckCircleIcon className="w-7 h-7 text-emerald-500" /></div>
            <h3 className="text-lg font-bold text-apple-text dark:text-apple-light mb-1.5">Slip received 🎉</h3>
            <p className="text-sm text-apple-subtext dark:text-slate-400 max-w-xs mx-auto">
              Your payment for <span className="font-semibold text-apple-text dark:text-apple-light">{pack.title}</span> is now <span className="font-semibold">pending verification</span>. Once the tutor confirms it, the pack unlocks in <span className="font-semibold">My Classes</span>.
            </p>
            <button type="button" onClick={onSubmitted} className="mt-6 w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-20 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                {pack.thumbnailUrl && <img src={pack.thumbnailUrl} alt={pack.title} className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-apple-text dark:text-apple-light line-clamp-2 leading-snug">{pack.title}</p>
                <p className="text-xs text-apple-subtext dark:text-slate-400 mt-0.5 flex items-center gap-1"><FilmIcon className="w-3 h-3" /> {pack.videoCount} videos · {pack.duration}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-apple-subtext dark:text-slate-500">Price</p>
                <p className="text-lg font-black text-[#c20f24] dark:text-red-400 leading-none">Rs. {pack.price.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-[linear-gradient(135deg,#7a0a18,#a50f24)] text-white p-4">
              <div className="flex items-center gap-2 mb-3"><Building2Icon className="w-4 h-4" /><p className="text-sm font-bold">1. Transfer Rs. {pack.price.toLocaleString()} to:</p></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="text-rose-200/70">Bank</span><span className="font-semibold text-right">{bank.bank}</span></div>
                <div className="flex justify-between gap-3"><span className="text-rose-200/70">Account</span><span className="font-semibold text-right">{bank.accountName}</span></div>
                <div className="flex justify-between gap-3 items-center">
                  <span className="text-rose-200/70">Number</span>
                  <button type="button" onClick={copyAccount} className="font-mono font-semibold flex items-center gap-1.5 hover:text-rose-200 transition-colors">
                    {bank.accountNumber}{copied ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex justify-between gap-3"><span className="text-rose-200/70">Branch</span><span className="font-semibold text-right">{bank.branch}</span></div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-apple-text dark:text-apple-light mb-2">2. Upload your deposit slip</p>
              <input ref={slipInputRef} type="file" accept="image/*" className="sr-only" onChange={handleSlip} />
              {slipPreview ? (
                <div className="flex items-center gap-3 rounded-xl border border-apple-border dark:border-slate-700 bg-white dark:bg-slate-800 p-2">
                  <img src={slipPreview} alt="slip" className="h-14 w-20 object-cover rounded-lg" />
                  <span className="text-sm text-apple-text dark:text-apple-light flex-1 truncate">Slip attached</span>
                  <button type="button" onClick={() => slipInputRef.current?.click()} className="text-xs font-medium text-[#c20f24] hover:underline">Change</button>
                  <button type="button" onClick={() => { setSlipFile(null); setSlipPreview(undefined); }} className="text-apple-subtext hover:text-red-500 transition-colors" aria-label="Remove"><XIcon className="w-4 h-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => slipInputRef.current?.click()} className="w-full h-20 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-apple-border dark:border-slate-700 bg-white dark:bg-slate-800 text-apple-subtext dark:text-slate-400 hover:border-[#c20f24] hover:text-[#c20f24] transition-colors text-sm">
                  <UploadCloudIcon className="w-5 h-5" /> Tap to upload slip photo
                </button>
              )}
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank reference / note (optional)"
                className="mt-2 w-full h-11 rounded-xl border border-apple-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-apple-text dark:text-apple-light placeholder:text-apple-subtext focus:outline-none focus:ring-2 focus:ring-[#c20f24]" />
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <button type="submit" disabled={submitting} className="w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {submitting && <Loader2Icon className="w-4 h-4 animate-spin" />}{submitting ? 'Submitting…' : 'Submit for verification'}
            </button>

            <a href={`https://wa.me/${bank.whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-semibold text-[#25D366] hover:underline">
              <MessageCircleIcon className="w-4 h-4" /> Or send the slip on WhatsApp
            </a>
          </form>
        )}
      </motion.div>
    </div>
  );
}
