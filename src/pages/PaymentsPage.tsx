import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Building2Icon,
  CheckCircleIcon,
  CopyIcon,
  CreditCardIcon,
  MessageCircleIcon,
  ReceiptTextIcon,
  UploadCloudIcon,
  XIcon,
  Loader2Icon
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { BANK_DETAILS as FALLBACK_BANK, WHATSAPP_NUMBER as FALLBACK_WA, formatLKR } from '../data/paymentConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */

const monthName = (m: number) =>
  ['January','February','March','April','May','June','July','August','September','October','November','December'][m];

export function PaymentsPage() {
  const { user } = useAuth();

  const [bank, setBank] = useState({ ...FALLBACK_BANK, whatsapp: FALLBACK_WA });
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const now = new Date();
  const [payFor, setPayFor] = useState<'monthly_fee' | 'tute' | 'other'>('monthly_fee');
  const [periodMonth, setPeriodMonth] = useState(monthName(now.getMonth()));
  const [periodYear, setPeriodYear] = useState(String(now.getFullYear()));
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const slipInputRef = useRef<HTMLInputElement>(null);

  const loadPayments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });
    setPayments(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // settings (bank details) — fall back to constants if empty
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) {
        setBank({
          bank: data.bank_name || FALLBACK_BANK.bank,
          accountName: data.account_name || FALLBACK_BANK.accountName,
          accountNumber: data.account_number || FALLBACK_BANK.accountNumber,
          branch: data.branch || FALLBACK_BANK.branch,
          whatsapp: data.whatsapp_number || FALLBACK_WA
        });
      }
    });
    loadPayments();
  }, [loadPayments]);

  const approved = payments.filter((p) => p.status === 'approved');
  const totalPaid = approved.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  const handleSlip = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(bank.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!user) return;
    if (!slipFile) {
      setError('Please attach a photo of your bank deposit slip.');
      return;
    }

    setSubmitting(true);
    // 1. upload slip to private storage
    const ext = slipFile.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('slips').upload(path, slipFile, { upsert: false });
    if (upErr) {
      setSubmitting(false);
      setError(`Could not upload slip: ${upErr.message}`);
      return;
    }

    // 2. create the payment record (pending)
    const isMonthly = payFor === 'monthly_fee';
    const { error: insErr } = await supabase.from('payments').insert({
      student_id: user.id,
      kind: payFor,
      period_month: isMonthly ? periodMonth : null,
      period_year: isMonthly ? Number(periodYear) : null,
      amount: Number(amount.replace(/[^0-9.]/g, '')) || 0,
      reference: reference.trim() || null,
      slip_url: path,
      status: 'pending'
    });
    setSubmitting(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }

    setAmount('');
    setReference('');
    setSlipFile(null);
    setSlipPreview(undefined);
    setSuccess('Slip submitted! The tutor will verify it and mark your payment as paid.');
    setTimeout(() => setSuccess(''), 5000);
    loadPayments();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c20f24]">Payments</p>
        <h1 className="mt-2 text-3xl font-bold text-apple-text dark:text-apple-light">Payments &amp; bank transfers</h1>
        <p className="mt-2 text-apple-subtext dark:text-slate-400">
          Pay via bank transfer, then upload your deposit slip. The tutor verifies it and marks your payment as paid.
        </p>
      </div>

      {/* summary */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3 text-[#c20f24]"><ReceiptTextIcon className="w-5 h-5" /></div>
            <div>
              <p className="text-sm text-apple-subtext">Total paid</p>
              <p className="text-2xl font-bold text-apple-text">{formatLKR(totalPaid)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><CreditCardIcon className="w-5 h-5" /></div>
            <div>
              <p className="text-sm text-apple-subtext">Awaiting verification</p>
              <p className="text-2xl font-bold text-apple-text">{pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-green-50 p-3 text-green-600"><CheckCircleIcon className="w-5 h-5" /></div>
            <div>
              <p className="text-sm text-apple-subtext">Verified payments</p>
              <p className="text-2xl font-bold text-apple-text">{approved.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* how to pay */}
      <Card className="overflow-hidden">
        <div className="bg-[linear-gradient(135deg,#7a0a18,#a50f24,#4a0510)] p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-2xl bg-white/15 p-3"><Building2Icon className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold">How to pay</h2>
              <p className="text-rose-100/70 text-sm">Transfer to the account below, then upload your slip.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/10">
              <p className="text-[11px] uppercase tracking-widest text-rose-200/70">Bank</p>
              <p className="font-semibold mt-0.5">{bank.bank}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/10">
              <p className="text-[11px] uppercase tracking-widest text-rose-200/70">Account Name</p>
              <p className="font-semibold mt-0.5">{bank.accountName}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-rose-200/70">Account Number</p>
                <p className="font-semibold mt-0.5 font-mono tracking-wide truncate">{bank.accountNumber}</p>
              </div>
              <button type="button" onClick={copyAccount} className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 transition-colors">
                {copied ? <CheckCircleIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/10">
              <p className="text-[11px] uppercase tracking-widest text-rose-200/70">Branch</p>
              <p className="font-semibold mt-0.5">{bank.branch}</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${bank.whatsapp}?text=${encodeURIComponent('Hello, I have made a payment. Here is my deposit slip:')}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-[#25D366] hover:bg-[#20b858] text-white font-semibold px-5 py-2.5 text-sm transition-colors"
          >
            <MessageCircleIcon className="w-4 h-4" /> Or send your slip on WhatsApp
          </a>
        </div>
      </Card>

      {/* submit slip */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-red-50 p-3 text-[#c20f24]"><UploadCloudIcon className="w-5 h-5" /></div>
          <h2 className="text-xl font-bold text-apple-text">Submit a payment slip</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-apple-text ml-1">Payment for</label>
            <select
              value={payFor}
              onChange={(e) => setPayFor(e.target.value as typeof payFor)}
              className="mt-1.5 flex h-12 w-full rounded-xl border border-apple-border bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#c20f24]"
            >
              <option value="monthly_fee">Monthly class fee</option>
              <option value="tute">Tute fee</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {payFor === 'monthly_fee' && (
              <>
                <div>
                  <label className="text-sm font-medium text-apple-text ml-1">Month</label>
                  <select value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="mt-1.5 flex h-12 w-full rounded-xl border border-apple-border bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#c20f24]">
                    {Array.from({ length: 12 }, (_, i) => monthName(i)).map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <Input label="Year" value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} />
              </>
            )}
            <Input label="Amount" placeholder="LKR 4,500" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <Input
            label={payFor === 'monthly_fee' ? 'Bank reference / note (optional)' : 'What is this for? (note)'}
            placeholder={payFor === 'monthly_fee' ? 'Reference or note for the tutor' : 'e.g. April tute pack, exam paper fee…'}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-apple-text ml-1">Deposit slip photo *</label>
            <input ref={slipInputRef} type="file" accept="image/*" className="sr-only" onChange={handleSlip} />
            {slipPreview ? (
              <div className="flex items-center gap-3 rounded-xl border border-apple-border bg-white p-2">
                <img src={slipPreview} alt="slip" className="h-16 w-24 object-cover rounded-lg" />
                <span className="text-sm text-apple-text flex-1 truncate">Slip attached</span>
                <button type="button" onClick={() => slipInputRef.current?.click()} className="text-xs font-medium text-[#c20f24] hover:underline">Change</button>
                <button type="button" onClick={() => { setSlipFile(null); setSlipPreview(undefined); }} className="text-apple-subtext hover:text-red-500" aria-label="Remove"><XIcon className="w-4 h-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => slipInputRef.current?.click()} className="h-24 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-apple-border bg-white text-apple-subtext hover:border-[#c20f24] hover:text-[#c20f24] transition-colors text-sm">
                <UploadCloudIcon className="w-5 h-5" /> Upload deposit slip photo
              </button>
            )}
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {success ? <p className="flex items-center gap-2 text-sm text-green-600"><CheckCircleIcon className="w-4 h-4 shrink-0" />{success}</p> : null}

          <button type="submit" disabled={submitting} className="w-full sm:w-auto h-12 px-8 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {submitting && <Loader2Icon className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting…' : 'Submit for verification'}
          </button>
        </form>
      </Card>

      {/* history */}
      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-bold text-apple-text mb-6">Payment history</h2>
        {loading ? (
          <p className="text-sm text-apple-subtext">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-apple-subtext">No payments yet. Submit your first slip above.</p>
        ) : (
          <div className="space-y-4">
            {payments.map((p) => (
              <div key={p.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${p.status === 'pending' ? 'border-amber-100 bg-amber-50/40' : 'border-gray-100'}`}>
                <div>
                  <p className="font-semibold text-apple-text">
                    {p.kind === 'monthly_fee'
                      ? `Monthly fee — ${p.period_month} ${p.period_year}`
                      : p.kind === 'theory'
                      ? 'Theory recordings'
                      : p.kind === 'pack'
                      ? 'Extra class pack'
                      : p.kind === 'tute'
                      ? `Tute fee${p.reference ? ` — ${p.reference}` : ''}`
                      : `Other${p.reference ? ` — ${p.reference}` : ''}`}
                  </p>
                  <p className="mt-1 text-sm text-apple-subtext">
                    {new Date(p.created_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })}
                    {p.reject_reason ? ` · ${p.reject_reason}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-apple-text">{formatLKR(Number(p.amount))}</p>
                  <Badge variant={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}>
                    {p.status === 'approved' ? 'Paid' : p.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
