import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { GoogleSignInButton } from '../components/shared/GoogleSignInButton';

const PERKS = [
  'තත්පර කිහිපයකින් — වෙනම මුරපදයක් මතක තබා ගැනීමට අවශ්‍ය නැත',
  'ඔබේ Google ගිණුම ආරක්ෂිතයි — ගිණුම බෙදාගැනීම වළක්වයි',
  'පිවිසීමෙන් පසු ඔබේ පැතිකඩ විස්තර එක් වරක් පුරවන්න'
];

/**
 * New students sign up with Google. After the redirect back, first-timers are
 * routed to /complete-profile to fill in their details.
 */
export function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <AuthLayout>
      <div className="mb-7">
        <h2 className="text-3xl font-bold tracking-tight text-apple-text mb-2">
          ගිණුමක් සාදන්න
        </h2>
        <p className="text-sm text-apple-subtext">
          ඔබේ Google ගිණුම සමඟ ලියාපදිංචි වන්න — ඉන්පසු ඔබේ පැතිකඩ විස්තර පුරවන්න.
        </p>
      </div>

      <GoogleSignInButton label="Sign up with Google" />

      <ul className="mt-7 space-y-3">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-start gap-2.5 text-sm text-apple-text">
            <CheckCircleIcon className="w-4 h-4 mt-0.5 text-[#c20f24] shrink-0" />
            <span className="leading-relaxed">{perk}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-sm text-apple-subtext">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[#c20f24] hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
