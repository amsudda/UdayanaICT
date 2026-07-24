import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/layout/AuthLayout';
import { GoogleSignInButton } from '../components/shared/GoogleSignInButton';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await login({ email, password });

    setSubmitting(false);
    if (!result.success) {
      setError(result.message || 'Unable to sign in.');
      return;
    }
    // the effect above redirects (admins → /admin, students → /dashboard)
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setSubmitting(false);
    if (err) {
      const secs = err.message.match(/after (\d+) seconds/i)?.[1];
      let msg = err.message;
      if (secs || /for security purposes/i.test(err.message)) {
        msg = `Please wait ${secs ? `${secs} seconds` : 'a moment'} before requesting another reset link — you just requested one. Check your inbox and spam folder in the meantime.`;
      } else if (/rate limit/i.test(err.message)) {
        msg = 'Too many reset emails sent — please wait about an hour and try again. (Email limit reached)';
      }
      setError(msg);
      return;
    }
    setInfo('Password reset link sent! Check your email inbox (and the spam folder) and follow the link to set a new password.');
  };

  if (mode === 'forgot') {
    return (
      <AuthLayout>
        <button
          type="button"
          onClick={() => { setMode('login'); setError(''); setInfo(''); }}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-apple-subtext hover:text-apple-text transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back to login
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-apple-text mb-2">
            මුරපදය අමතක වුණාද?
          </h2>
          <p className="text-sm text-apple-subtext">
            ඔබේ email එක ඇතුළත් කරන්න — මුරපදය නැවත සැකසීමට link එකක් අපි එවන්නෙමු.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleForgot}>
          <div className="relative">
            <MailIcon className="absolute left-4 top-[42px] w-4 h-4 text-apple-subtext pointer-events-none z-10" />
            <Input
              label="Email address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {info ? (
            <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">{info}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors disabled:opacity-50 shadow-[0_8px_24px_rgba(194,15,36,0.35)]"
          >
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-apple-text mb-2">
          නැවත සාදරයෙන් පිළිගනිමු 👋
        </h2>
        <p className="text-sm text-apple-subtext">
          ඔබේ පාඨමාලා වෙත පිවිසීමට පිවිසුම් තොරතුරු ඇතුළත් කරන්න.
        </p>
      </div>

      <GoogleSignInButton label="Continue with Google" />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium uppercase tracking-wider text-apple-subtext">
          or sign in with email
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form className="space-y-5" onSubmit={handleLogin}>
        <div className="relative">
          <MailIcon className="absolute left-4 top-[42px] w-4 h-4 text-apple-subtext pointer-events-none z-10" />
          <Input
            label="Email address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-11"
            required
          />
        </div>

        <div>
          <div className="relative">
            <LockIcon className="absolute left-4 top-[42px] w-4 h-4 text-apple-subtext pointer-events-none z-10" />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-[38px] text-apple-subtext hover:text-apple-text transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
              className="text-sm font-medium text-[#c20f24] hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors disabled:opacity-50 shadow-[0_8px_24px_rgba(194,15,36,0.35)]"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-apple-subtext">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-[#c20f24] hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
