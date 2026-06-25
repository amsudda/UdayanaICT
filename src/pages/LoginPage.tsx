import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/layout/AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
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
            <a href="#" className="text-sm font-medium text-[#c20f24] hover:underline">
              Forgot password?
            </a>
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
