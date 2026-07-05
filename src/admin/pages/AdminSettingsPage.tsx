import { useEffect, useState } from 'react';
import { Building2Icon, MessageCircleIcon, Loader2Icon, CheckIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

const empty = {
  bank_name: '', account_name: '', account_number: '', branch: '',
  whatsapp_number: ''
};

function Section({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function AdminSettingsPage() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data, error: err }) => {
      if (err) setError(`Could not load settings: ${err.message}`);
      if (data) {
        setForm({
          bank_name: data.bank_name ?? '',
          account_name: data.account_name ?? '',
          account_number: data.account_number ?? '',
          branch: data.branch ?? '',
          whatsapp_number: data.whatsapp_number ?? ''
        });
      }
      setLoading(false);
    });
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    const { error: err, data } = await supabase.from('settings').update({
      bank_name: form.bank_name.trim() || null,
      account_name: form.account_name.trim() || null,
      account_number: form.account_number.trim() || null,
      branch: form.branch.trim() || null,
      whatsapp_number: form.whatsapp_number.trim() || null
    }).eq('id', 1).select();
    setSaving(false);
    if (err) {
      setError(`Could not save: ${err.message}`);
      return;
    }
    if (!data || data.length === 0) {
      setError('Could not save — the settings row is missing or you lack permission. Make sure you are logged in as admin.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">These details drive what students see — the bank account for deposits and the WhatsApp contact.</p>

      <div className="space-y-5">
        <Section icon={Building2Icon} title="Bank account" desc="Shown to students on the Payments page and pack checkout for bank transfers.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank name</label>
              <input className={inputCls} value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="Bank of Ceylon (BOC)" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Account name</label>
              <input className={inputCls} value={form.account_name} onChange={(e) => set('account_name', e.target.value)} placeholder="Pasindu Dissanayake" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Account number</label>
              <input className={inputCls} value={form.account_number} onChange={(e) => set('account_number', e.target.value)} placeholder="0001234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Branch</label>
              <input className={inputCls} value={form.branch} onChange={(e) => set('branch', e.target.value)} placeholder="Colombo Main" />
            </div>
          </div>
        </Section>

        <Section icon={MessageCircleIcon} title="WhatsApp" desc="Used for the 'send slip on WhatsApp' and contact buttons.">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp number (with country code, no +)</label>
          <input className={inputCls} value={form.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value)} placeholder="94719735601" />
          <p className="text-xs text-slate-400 mt-1.5">e.g. 94719735601 for 071 973 5601</p>
        </Section>

        {error && (
          <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="h-11 px-6 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2Icon className="w-4 h-4 animate-spin" />} Save settings
          </button>
          {saved && <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><CheckIcon className="w-4 h-4" /> Saved</span>}
        </div>
      </div>
    </div>
  );
}
