import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon, IdCardIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { AuthLayout } from '../components/layout/AuthLayout';
import { districts, examYears, genders, mediums, programs } from '../data/studentOptions';

/** Small labelled group heading inside the form. */
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#c20f24] mb-4">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();

  // account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // personal
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');

  // academic
  const [school, setSchool] = useState('');
  const [medium, setMedium] = useState('');
  const [program, setProgram] = useState('');
  const [examYear, setExamYear] = useState('');

  // guardian
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  // national id
  const [nic, setNic] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (!program) {
      setError('Please choose your program (O/L or A/L).');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await signup({
      name: name.trim(),
      email,
      password,
      phone: phone.trim() || undefined,
      gender: gender || undefined,
      birthDate: birthDate || undefined,
      address: address.trim() || undefined,
      district: district || undefined,
      school: school.trim() || undefined,
      medium: medium || undefined,
      program: program || undefined,
      examYear: examYear || undefined,
      guardianName: guardianName.trim() || undefined,
      guardianPhone: guardianPhone.trim() || undefined,
      nic: nic.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.success) {
      // Could be a real error, or the "confirm your email" notice.
      if (result.message?.toLowerCase().includes('confirm')) {
        setInfo(result.message);
      } else {
        setError(result.message || 'Unable to create account.');
      }
      return;
    }

    navigate('/dashboard');
  };

  return (
    <AuthLayout formWidth="max-w-2xl">
      <div className="mb-7">
        <h2 className="text-3xl font-bold tracking-tight text-apple-text mb-2">
          ගිණුමක් සාදන්න
        </h2>
        <p className="text-sm text-apple-subtext">
          ඔබේ විස්තර එක් වරක් පුරවන්න — අපි ඔබේ පැතිකඩ ස්වයංක්‍රීයව සකසන්නෙමු.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-apple-text">
        <span className="font-semibold">*</span> සලකුණු කළ ක්ෂේත්‍ර අනිවාර්ය වේ. අනෙක් විස්තර
        ඔබේ පැතිකඩ සම්පූර්ණ කිරීමට උපකාරී වේ — පසුව ඔබට ඒවා වෙනස් කළ හැක.
      </div>

      <form className="space-y-8" onSubmit={handleSignup}>
        {/* ── Account ── */}
        <FieldGroup title="ගිණුම් තොරතුරු / Account">
          <div className="sm:col-span-2">
            <Input
              label="Full Name *"
              placeholder="Kasun Perera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Email address *"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Input
              label="Password *"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
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
          <Input
            label="Confirm Password *"
            type={showPassword ? 'text' : 'password'}
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </FieldGroup>

        {/* ── Personal ── */}
        <FieldGroup title="පෞද්ගලික විස්තර / Personal">
          <Input
            label="Phone (WhatsApp)"
            type="tel"
            placeholder="+94 71 234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Select
            label="Gender"
            placeholder="Select gender"
            options={genders}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          />
          <Input
            label="Date of Birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <Select
            label="District"
            placeholder="Select district"
            options={districts}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Home Address"
              placeholder="Street, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </FieldGroup>

        {/* ── Academic ── */}
        <FieldGroup title="අධ්‍යාපන විස්තර / Academic">
          <Select
            label="Program *"
            placeholder="O/L or A/L"
            options={programs}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          />
          <Select
            label="Exam Year"
            placeholder="Select year"
            options={examYears}
            value={examYear}
            onChange={(e) => setExamYear(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="School"
              placeholder="e.g. Ananda College, Colombo"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </div>
          <Select
            label="Medium"
            placeholder="Select medium"
            options={mediums}
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
          />
        </FieldGroup>

        {/* ── Guardian ── */}
        <FieldGroup title="භාරකරු විස්තර / Guardian">
          <Input
            label="Guardian Name"
            placeholder="Parent / guardian name"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
          />
          <Input
            label="Guardian Phone"
            type="tel"
            placeholder="+94 77 123 4567"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
          />
        </FieldGroup>

        {/* ── National ID ── */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#c20f24] mb-4">
            ජාතික හැඳුනුම්පත / National ID
          </h3>
          <div className="relative">
            <IdCardIcon className="absolute left-4 top-[42px] w-4 h-4 text-apple-subtext pointer-events-none z-10" />
            <Input
              label="NIC Number"
              placeholder="200012345678 / 991234567V"
              value={nic}
              onChange={(e) => setNic(e.target.value)}
              className="pl-11"
            />
          </div>
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
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-apple-subtext">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[#c20f24] hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
