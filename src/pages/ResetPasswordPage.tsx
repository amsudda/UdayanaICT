import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, EyeIcon, EyeOffIcon, Loader2Icon, LockIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/layout/AuthLayout';

/**
 * Landing page for the Supabase password-recovery email link.
 * The link carries a token; supabase-js turns it into a session on load,
 * after which we let the user set a new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // the recovery token in the URL is processed asynchronously — listen briefly
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
    });
    const t = window.setTimeout(() => setChecking(false), 2500);
    return () => { sub.subscription.unsubscribe(); window.clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (hasSession) setChecking(false);
  }, [hasSession]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters long.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  };

  return (
    <AuthLayout>
      {done ? (
        <div className="text-center py-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-apple-text mb-2">Password changed successfully!</h2>
          <p className="text-sm text-apple-subtext mb-6">You can now log in with your new password.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors shadow-[0_8px_24px_rgba(194,15,36,0.35)]"
          >
            Continue to Dashboard
          </button>
        </div>
      ) : checking && !hasSession ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2Icon className="w-7 h-7 text-[#c20f24] animate-spin" />
          <p className="text-sm text-apple-subtext">Checking your reset link…</p>
        </div>
      ) : !hasSession ? (
        <div className="text-center py-6">
          <h2 className="text-2xl font-bold tracking-tight text-apple-text mb-2">Link expired or invalid</h2>
          <p className="text-sm text-apple-subtext mb-6">
            This reset link has expired or been used. Click "Forgot password?" on the login page to get a new link.
          </p>
          <Link
            to="/login"
            className="inline-flex w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors items-center justify-center"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-apple-text mb-2">Set a new password</h2>
            <p className="text-sm text-apple-subtext">Enter a new password for your account.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="relative">
              <LockIcon className="absolute left-4 top-[42px] w-4 h-4 text-apple-subtext pointer-events-none z-10" />
              <Input
                label="New password"
                type={show ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3.5 top-[38px] text-apple-subtext hover:text-apple-text transition-colors"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <LockIcon className="absolute left-4 top-[42px] w-4 h-4 text-apple-subtext pointer-events-none z-10" />
              <Input
                label="Confirm new password"
                type={show ? 'text' : 'password'}
                placeholder="Repeat the new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-11"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors disabled:opacity-50 shadow-[0_8px_24px_rgba(194,15,36,0.35)]"
            >
              {submitting ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
