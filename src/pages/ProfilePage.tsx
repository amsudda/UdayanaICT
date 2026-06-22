import type { FormEvent, ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  CameraIcon,
  CheckIcon,
  IdCardIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SaveIcon,
  ShieldCheckIcon,
  XIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { districts, examYears, genders, mediums, programs } from '../data/studentOptions';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── tiny helper ─────────────────────────────────────── */
function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] overflow-hidden transition-colors duration-300">
      <div className="px-6 pt-6 pb-3 border-b border-gray-100 dark:border-slate-800">
        <h2 className="text-base font-semibold text-apple-text dark:text-apple-light">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-apple-subtext dark:text-slate-400">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}


/* ─── main component ─────────────────────────────────── */
export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* form state */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [district, setDistrict] = useState('');
  const [school, setSchool] = useState('');
  const [medium, setMedium] = useState('');
  const [program, setProgram] = useState('');
  const [examYear, setExamYear] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [nic, setNic] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? '');
    setAddress(user.address ?? '');
    setGender(user.gender ?? '');
    setBirthDate(user.birthDate ?? '');
    setDistrict(user.district ?? '');
    setSchool(user.school ?? '');
    setMedium(user.medium ?? '');
    setProgram(user.program ?? '');
    setExamYear(user.examYear ?? '');
    setGuardianName(user.guardianName ?? '');
    setGuardianPhone(user.guardianPhone ?? '');
    setNic(user.nic ?? '');
    setAvatarPreview(user.avatar);
  }, [user]);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (password && password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      name: name.trim(),
      email,
      password: password || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      gender: gender || undefined,
      birthDate: birthDate || undefined,
      district: district || undefined,
      school: school.trim() || undefined,
      medium: medium || undefined,
      program: program || undefined,
      examYear: examYear || undefined,
      guardianName: guardianName.trim() || undefined,
      guardianPhone: guardianPhone.trim() || undefined,
      nic: nic.trim() || undefined,
      avatar: avatarPreview
    });
    setSaving(false);

    if (!result.success) {
      setError(result.message || 'Unable to update your profile.');
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setSuccess('Profile updated successfully.');
    setTimeout(() => setSuccess(''), 3500);
  };

  if (!user) return null;

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* ── page header ── */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-apple-blue">My Profile</p>
        <h1 className="text-3xl font-bold text-apple-text dark:text-apple-light mt-2 transition-colors">
          Manage your account
        </h1>
        <p className="text-apple-subtext dark:text-slate-400 mt-2 text-sm transition-colors">
          Update your personal details, contact information and profile picture.
        </p>
      </div>

      {/* ── hero / identity card ── */}
      <div className="rounded-3xl p-6 sm:p-8 bg-apple-blue dark:bg-slate-950 text-white shadow-[0_20px_50px_rgba(0,112,255,0.25)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-colors duration-300 flex flex-col sm:flex-row items-center gap-6">
        {/* avatar */}
        <div className="relative shrink-0">
          <div
            className="w-24 h-24 rounded-3xl overflow-hidden bg-white/20 flex items-center justify-center text-3xl font-bold text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] cursor-pointer ring-2 ring-white/30 hover:ring-white/60 transition-all duration-200"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-apple-blue flex items-center justify-center shadow-md hover:scale-110 transition-transform"
          >
            <CameraIcon className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleAvatarChange}
          />
        </div>

        {/* name / id */}
        <div className="text-center sm:text-left flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white">{user.name}</h2>
          <p className="text-blue-100/80 text-sm mt-0.5">{user.email}</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-2xl px-4 py-2">
            <ShieldCheckIcon className="w-4 h-4 text-blue-100" />
            <span className="text-sm font-semibold tracking-widest text-white">{user.studentId}</span>
          </div>
        </div>

        <p className="text-xs text-blue-100/60 sm:self-end hidden sm:block">
          Click the avatar to change your photo
        </p>
      </div>

      {/* ── national ID card preview ── */}
      <div className="flex flex-col items-center sm:items-start">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-apple-subtext dark:text-slate-500 mb-4 pl-1">
          Student ID Card Preview
        </p>

        {/* card — fixed aspect ratio like a real ID */}
        <div
          className="relative w-full max-w-sm overflow-hidden rounded-3xl select-none"
          style={{ aspectRatio: '1.586 / 1' }}
        >
          {/* gradient background */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a1628_0%,#0f2952_40%,#1a3a6e_70%,#0d2244_100%)]" />

          {/* decorative circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-sm" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-blue-400/10 blur-md" />
          <div className="absolute top-6 right-16 w-24 h-24 rounded-full bg-blue-500/10" />

          {/* fine grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 0, transparent 50%), repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* holographic shimmer stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />

          {/* content */}
          <div className="relative z-10 h-full flex flex-col justify-between p-5">
            {/* top row: institution + logo chip */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-200/70">
                  Sri Lanka
                </p>
                <p className="text-sm font-bold text-white leading-tight mt-0.5">
                  Udayana ICT
                </p>
              </div>
              {/* chip graphic */}
              <div className="w-9 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.3)]">
                <div className="w-full h-full rounded-md border border-yellow-200/30 grid grid-cols-3 grid-rows-3 gap-[1px] p-[3px]">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="bg-yellow-600/40 rounded-sm" />
                  ))}
                </div>
              </div>
            </div>

            {/* middle: photo + info */}
            <div className="flex items-end gap-4">
              {/* photo */}
              <div className="w-14 h-16 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="id photo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-white/60">{initials}</span>
                )}
              </div>

              {/* name + id */}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-blue-300/60 mb-1">
                  Student Name
                </p>
                <p className="text-base font-bold text-white leading-snug truncate">
                  {name || user.name}
                </p>
                <p className="text-[10px] text-blue-200/50 mt-2 uppercase tracking-widest">
                  Student ID
                </p>
                <p className="text-sm font-bold tracking-[0.22em] text-white/90 font-mono">
                  {user.studentId}
                </p>
              </div>
            </div>

            {/* bottom barcode-style strip */}
            <div className="flex items-center gap-2">
              <div className="flex gap-[2px] flex-1">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white/20 rounded-[1px]"
                    style={{ width: i % 3 === 0 ? '3px' : '1.5px', height: '14px' }}
                  />
                ))}
              </div>
              <p className="text-[8px] text-blue-200/40 font-mono tracking-widest ml-2 shrink-0">
                STUDENT
              </p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-apple-subtext/60 dark:text-slate-500 mt-2 pl-1">
          Updates live as you edit your name and photo above.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── personal info ── */}
        <Section title="Personal Information" description="Your basic profile details.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
            <Input
              label="Student ID"
              value={user.studentId}
              disabled
              readOnly
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
          </div>
        </Section>

        {/* ── academic info ── */}
        <Section title="Academic Information" description="Your program, school and exam details.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Program"
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
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Ananda College, Colombo"
              />
            </div>
            <Select
              label="Medium"
              placeholder="Select medium"
              options={mediums}
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
            />
          </div>
        </Section>

        {/* ── contact info ── */}
        <Section title="Contact Information" description="How we can reach you beyond class sessions.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="relative">
              <PhoneIcon className="absolute left-3.5 top-[38px] w-4 h-4 text-apple-subtext dark:text-slate-400 pointer-events-none" />
              <div className="pl-9">
                <Input
                  label="Phone Number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+94 71 234 5678"
                />
              </div>
            </div>
            <Select
              label="District"
              placeholder="Select district"
              options={districts}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
            <div className="relative sm:col-span-2">
              <MapPinIcon className="absolute left-3.5 top-[38px] w-4 h-4 text-apple-subtext dark:text-slate-400 pointer-events-none" />
              <div className="pl-9">
                <Input
                  label="Home Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, Province"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ── guardian info ── */}
        <Section title="Guardian Information" description="Parent or guardian contact details.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Guardian Name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Parent / guardian name"
            />
            <Input
              label="Guardian Phone"
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="+94 77 123 4567"
            />
          </div>
        </Section>

        {/* ── national id ── */}
        <Section title="National ID (NIC)" description="Your National Identity Card number.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="relative">
              <IdCardIcon className="absolute left-3.5 top-[38px] w-4 h-4 text-apple-subtext dark:text-slate-400 pointer-events-none z-10" />
              <div className="pl-9">
                <Input
                  label="NIC Number"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  placeholder="200012345678 / 991234567V"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ── security ── */}
        <Section title="Password & Security" description="Leave blank to keep your current password.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat the new password"
            />
          </div>
        </Section>

        {/* ── status messages + save ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              <XIcon className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-4 py-3 text-sm text-green-700 dark:text-green-400"
            >
              <CheckIcon className="w-4 h-4 shrink-0" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-4 pt-1">
          {/* read-only at-a-glance strip */}
          <div className="hidden sm:flex items-center gap-5 text-xs text-apple-subtext dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <MailIcon className="w-3.5 h-3.5" />
              {user.email}
            </span>
            {user.phone && (
              <span className="flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5" />
                {user.phone}
              </span>
            )}
            {user.address && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5" />
                {user.address}
              </span>
            )}
          </div>

          <Button type="submit" disabled={saving} className="flex items-center gap-2 ml-auto">
            <SaveIcon className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* ── account info tiles ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-start gap-4 transition-colors duration-300">
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 text-amber-500 shrink-0">
            <LockIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-apple-text dark:text-apple-light text-sm">Protected Student ID</h3>
            <p className="mt-1.5 text-xs text-apple-subtext dark:text-slate-400 leading-relaxed">
              Your ID is assigned at signup and used for class access, attendance records, and future verifications.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-start gap-4 transition-colors duration-300">
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 p-3 text-apple-blue shrink-0">
            <MailIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-apple-text dark:text-apple-light text-sm">Keep Your Details Current</h3>
            <p className="mt-1.5 text-xs text-apple-subtext dark:text-slate-400 leading-relaxed">
              Up-to-date contact info ensures you receive class links, purchase records, and notifications correctly.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
