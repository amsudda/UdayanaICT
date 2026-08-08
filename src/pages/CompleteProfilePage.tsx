import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IdCardIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { AuthLayout } from '../components/layout/AuthLayout';
import { districts, examYears, genders, mediums, programs, streams } from '../data/studentOptions';

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

/**
 * Shown once, right after a student signs up with Google. Collects the same
 * details the old signup form did — minus email/password, which Google owns.
 * Saving marks the profile complete and drops them into the dashboard.
 */
export function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [school, setSchool] = useState('');
  const [medium, setMedium] = useState('');
  const [stream, setStream] = useState('');
  const [program, setProgram] = useState('A/L');
  const [examYear, setExamYear] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [nic, setNic] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prefill whatever Google (or an earlier visit) already gave us.
  useEffect(() => {
    if (!user) return;
    // Already completed? No reason to be here — go to the dashboard.
    if (user.profileComplete) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setGender(user.gender ?? '');
    setBirthDate(user.birthDate ?? '');
    setAddress(user.address ?? '');
    setDistrict(user.district ?? '');
    setSchool(user.school ?? '');
    setMedium(user.medium ?? '');
    setProgram(user.program ?? 'A/L');
    setExamYear(user.examYear ?? '');
    setGuardianName(user.guardianName ?? '');
    setGuardianPhone(user.guardianPhone ?? '');
    setNic(user.nic ?? '');
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Every field is required.
    const checks: [boolean, string][] = [
      [name.trim().length < 2, 'Enter your full name.'],
      [!phone.trim(), 'Enter your phone number.'],
      [!gender, 'Select your gender.'],
      [!birthDate, 'Enter your date of birth.'],
      [!district, 'Select your district.'],
      [!address.trim(), 'Enter your home address.'],
      [!program, 'Choose your program.'],
      [!examYear, 'Select your exam year.'],
      [!school.trim(), 'Enter your school.'],
      [!medium, 'Select your medium.'],
      [!stream, 'Select your stream.'],
      [!guardianName.trim(), "Enter your guardian's name."],
      [!guardianPhone.trim(), "Enter your guardian's phone number."],
      [!nic.trim(), 'Enter your NIC number.']
    ];
    const failed = checks.find(([bad]) => bad);
    if (failed) {
      setError(failed[1]);
      return;
    }

    setSubmitting(true);
    const result = await updateProfile({
      name: name.trim(),
      email: user?.email ?? '',
      // keep the Google profile photo we already stored
      avatar: user?.avatar,
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
      nic: nic.trim() || undefined
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Unable to save your profile.');
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <AuthLayout formWidth="max-w-2xl">
      <div className="mb-7">
        <h2 className="text-3xl font-bold tracking-tight text-apple-text mb-2">
          Complete Your Profile
        </h2>
        <p className="text-sm text-apple-subtext">
          {user?.email ? (
            <>
              Logged in as <span className="font-semibold">{user.email}</span> — fill in your details
              once, and we'll set up the rest.
            </>
          ) : (
            'Fill in your details once — we will automatically set up your profile.'
          )}
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-apple-text">
        All fields are <span className="font-semibold">required</span>. You can change them later.
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* ── Personal ── */}
        <FieldGroup title="Personal Details">
          <div className="sm:col-span-2">
            <Input
              label="Full Name *"
              placeholder="Kasun Perera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Input
            label="Phone (WhatsApp) *"
            type="tel"
            placeholder="+94 71 234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Select
            label="Gender *"
            placeholder="Select gender"
            options={genders}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          />
          <Input
            label="Date of Birth *"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
          <Select
            label="District *"
            placeholder="Select district"
            options={districts}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Home Address *"
              placeholder="Street, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
        </FieldGroup>

        {/* ── Academic ── */}
        <FieldGroup title="Academic Details">
          <Select
            label="Program *"
            placeholder="A/L"
            options={programs}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          />
          <Select
            label="Exam Year *"
            placeholder="Select year"
            options={examYears}
            value={examYear}
            onChange={(e) => setExamYear(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="School *"
              placeholder="e.g. Ananda College, Colombo"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              required
            />
          </div>
          <Select
            label="Stream *"
            placeholder="Select stream"
            options={streams}
            value={stream}
            onChange={(e) => setStream(e.target.value)}
          />
          <Select
            label="Medium *"
            placeholder="Select medium"
            options={mediums}
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
          />
        </FieldGroup>

        {/* ── Guardian ── */}
        <FieldGroup title="Guardian Details">
          <Input
            label="Guardian Name *"
            placeholder="Parent / guardian name"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            required
          />
          <Input
            label="Guardian Phone *"
            type="tel"
            placeholder="+94 77 123 4567"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
            required
          />
        </FieldGroup>

        {/* ── National ID ── */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#c20f24] mb-4">
            National ID
          </h3>
          <div className="relative">
            <IdCardIcon className="absolute left-4 top-[42px] w-4 h-4 text-apple-subtext pointer-events-none z-10" />
            <Input
              label="NIC Number *"
              placeholder="200012345678 / 991234567V"
              value={nic}
              onChange={(e) => setNic(e.target.value)}
              className="pl-11"
              required
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors disabled:opacity-50 shadow-[0_8px_24px_rgba(194,15,36,0.35)]"
        >
          {submitting ? 'Saving…' : 'Save & Continue'}
        </button>
      </form>
    </AuthLayout>
  );
}
