import { useEffect, useState, useCallback } from 'react';
import {
  PlusIcon,
  ShieldIcon,
  ShieldCheckIcon,
  MailIcon,
  KeyRoundIcon,
  PencilIcon,
  UserMinusIcon,
  Loader2Icon,
  SendIcon
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

/** Admin sections a staff member can be granted. Keys match the route/nav gating. */
export const PERMISSIONS: { key: string; label: string }[] = [
  { key: 'payments', label: 'Payments' },
  { key: 'batches', label: 'Batches' },
  { key: 'packs', label: 'Packs & videos' },
  { key: 'recordings', label: 'Monthly recordings' },
  { key: 'students', label: 'Students' },
  { key: 'marks', label: 'Paper marks' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'books', label: 'Books' },
  { key: 'featured', label: 'Featured courses' },
  { key: 'settings', label: 'Settings' }
];

/** Session-less client so creating an account never touches the owner's login. */
function tempAuthClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function randomPassword() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'.charAt(b % 57)).join('');
}

const emptyForm = { name: '', email: '', mode: 'invite' as 'invite' | 'manual', password: '', perms: [] as string[] };

export function AdminTeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null); // editing perms of an existing member
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removeTarget, setRemoveTarget] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, admin_perms, created_at')
      .in('role', ['admin', 'staff'])
      .order('created_at');
    setMembers(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setDrawerOpen(true); };
  const openEditPerms = (m: any) => {
    setEditing(m);
    setForm({ name: m.full_name ?? '', email: m.email ?? '', mode: 'invite', password: '', perms: m.admin_perms ?? [] });
    setError('');
    setDrawerOpen(true);
  };
  const togglePerm = (k: string) =>
    setForm((f) => ({ ...f, perms: f.perms.includes(k) ? f.perms.filter((p) => p !== k) : [...f.perms, k] }));

  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(''), 8000); };

  const save = async () => {
    setError('');
    if (!editing) {
      // ── create a new staff member ──
      if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
      if (form.mode === 'manual' && form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (form.perms.length === 0) { setError('Pick at least one permission.'); return; }
      setSaving(true);

      const password = form.mode === 'manual' ? form.password : randomPassword();
      const temp = tempAuthClient();
      const { data: signRes, error: signErr } = await temp.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password,
        options: { data: { full_name: form.name.trim() } }
      });
      if (signErr || !signRes.user) {
        setSaving(false);
        setError(signErr?.message ?? 'Could not create the account.');
        return;
      }

      // promote to staff with the chosen permissions (owner-only, guarded in DB)
      const { error: roleErr } = await supabase
        .from('profiles')
        .update({ role: 'staff', admin_perms: form.perms })
        .eq('id', signRes.user.id);
      if (roleErr) {
        setSaving(false);
        setError(`Account created but could not set permissions: ${roleErr.message}\n\nIf this mentions role constraints, run supabase/migration_team.sql.`);
        return;
      }

      if (form.mode === 'invite') {
        await supabase.auth.resetPasswordForEmail(form.email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`
        });
        flash(`Invitation sent to ${form.email.trim()} — they'll get an email to set their password.`);
      } else {
        flash(`Account created for ${form.email.trim()}. Share the password with them privately.`);
      }
    } else {
      // ── update permissions of an existing member ──
      setSaving(true);
      const { error: err } = await supabase.from('profiles').update({ admin_perms: form.perms }).eq('id', editing.id);
      if (err) { setSaving(false); setError(err.message); return; }
      flash('Permissions updated.');
    }
    setSaving(false);
    setDrawerOpen(false);
    load();
  };

  const resendInvite = async (m: any) => {
    setBusyId(m.id);
    const { error: err } = await supabase.auth.resetPasswordForEmail(m.email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setBusyId(null);
    flash(err ? `Could not send: ${err.message}` : `Password-set email sent to ${m.email}.`);
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setBusyId(removeTarget.id);
    const { error: err } = await supabase.from('profiles').update({ role: 'student', admin_perms: [] }).eq('id', removeTarget.id);
    setBusyId(null);
    setRemoveTarget(null);
    if (err) flash(`Could not remove access: ${err.message}`);
    else flash('Admin access removed — the account remains as a normal student.');
    load();
  };

  const permLabel = (k: string) => PERMISSIONS.find((p) => p.key === k)?.label ?? k;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        <button onClick={openAdd} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> Add member
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Give helpers access to specific admin sections. Only you (the owner) can manage the team or change permissions.
      </p>

      {notice && <p className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4 whitespace-pre-line">{notice}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const isOwnerRow = m.role === 'admin';
            return (
              <div key={m.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOwnerRow ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {isOwnerRow ? <ShieldCheckIcon className="w-5 h-5" /> : <ShieldIcon className="w-5 h-5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate">{m.full_name || m.email}</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${isOwnerRow ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isOwnerRow ? 'Owner' : 'Staff'}
                    </span>
                    {m.id === user?.id && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">You</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {m.email}
                    {!isOwnerRow && ` · ${(m.admin_perms ?? []).length ? (m.admin_perms as string[]).map(permLabel).join(', ') : 'no permissions'}`}
                    {isOwnerRow && ' · full access'}
                  </p>
                </div>
                {!isOwnerRow && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => resendInvite(m)} disabled={busyId === m.id} title="Send password-set email" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                      {busyId === m.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditPerms(m)} title="Edit permissions" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => setRemoveTarget(m)} title="Remove admin access" className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><UserMinusIcon className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* add / edit drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Permissions — ${editing.full_name || editing.email}` : 'Add team member'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setDrawerOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {saving && <Loader2Icon className="w-4 h-4 animate-spin" />} {editing ? 'Save permissions' : form.mode === 'invite' ? 'Create & send invite' : 'Create account'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {!editing && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kasun (assistant)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">How do they get access?</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${form.mode === 'invite' ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200'}`}>
                    <input type="radio" checked={form.mode === 'invite'} onChange={() => setForm({ ...form, mode: 'invite' })} className="mt-0.5 accent-blue-600" />
                    <span className="text-sm text-slate-700">
                      <span className="font-semibold flex items-center gap-1.5"><MailIcon className="w-3.5 h-3.5" /> Email invitation</span>
                      <span className="block text-[11px] text-slate-500">They receive an email with a link to set their own password.</span>
                    </span>
                  </label>
                  <label className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${form.mode === 'manual' ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200'}`}>
                    <input type="radio" checked={form.mode === 'manual'} onChange={() => setForm({ ...form, mode: 'manual' })} className="mt-0.5 accent-blue-600" />
                    <span className="text-sm text-slate-700">
                      <span className="font-semibold flex items-center gap-1.5"><KeyRoundIcon className="w-3.5 h-3.5" /> Set password manually</span>
                      <span className="block text-[11px] text-slate-500">You choose the password and share it with them yourself.</span>
                    </span>
                  </label>
                </div>
              </div>

              {form.mode === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <input className={inputCls} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Allowed sections</label>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {PERMISSIONS.map((p) => (
                <label key={p.key} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={form.perms.includes(p.key)} onChange={() => togglePerm(p.key)} className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-slate-700">{p.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">The Overview page is always visible. Team management stays owner-only.</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 whitespace-pre-line">{error}</p>}
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!removeTarget}
        title={`Remove ${removeTarget?.full_name || removeTarget?.email}'s access?`}
        message="They lose all admin access immediately. Their account stays as a normal student account."
        confirmLabel="Remove access"
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
