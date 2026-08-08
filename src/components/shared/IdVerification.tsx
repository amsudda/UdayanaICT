import type { ChangeEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  CheckCircleIcon,
  Clock3Icon,
  IdCardIcon,
  Loader2Icon,
  ShieldCheckIcon,
  UploadIcon,
  XCircleIcon
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';

/* One upload box for a single side of the ID card. */
function UploadBox({
  label,
  preview,
  onPick
}: {
  label: string;
  preview?: string;
  onPick: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
  };
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className="group relative flex flex-col items-center justify-center gap-2 h-40 w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-[#c20f24] bg-gray-50 dark:bg-slate-900/60 overflow-hidden transition-colors"
    >
      {preview ? (
        <>
          <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute bottom-2 right-2 text-[11px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded-lg">
            Change
          </span>
        </>
      ) : (
        <>
          <UploadIcon className="w-6 h-6 text-apple-subtext group-hover:text-[#c20f24] transition-colors" />
          <span className="text-sm font-medium text-apple-text dark:text-apple-light">{label}</span>
          <span className="text-xs text-apple-subtext">PNG or JPG</span>
        </>
      )}
      <input ref={ref} type="file" accept="image/*" className="sr-only" onChange={onChange} />
    </button>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#c20f24]/10 flex items-center justify-center text-[#c20f24] shrink-0">
          <ShieldCheckIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-apple-text dark:text-apple-light leading-tight">Identity Verification</h2>
          <p className="text-xs text-apple-subtext dark:text-slate-400 mt-0.5">
            Verify your ID to watch lessons, recordings and buy packs.
          </p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/**
 * Self-contained ID verification panel. Renders the right state for the
 * signed-in student: upload form, "under review", verified, or rejected.
 */
export function IdVerificationPanel() {
  const { user, submitIdVerification } = useAuth();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>();
  const [backPreview, setBackPreview] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;
  const status = user.verificationStatus;

  if (status === 'approved') {
    return (
      <Shell>
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-4 py-4">
          <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">You're Verified ✓</p>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-400/70">
              Your identity is confirmed — you have full access.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (status === 'pending') {
    return (
      <Shell>
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-4">
          <Clock3Icon className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Under review</p>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/70">
              We've received your ID. The tutor will approve it shortly — you'll get access once it's confirmed.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  const pickFront = (f: File) => { setFrontFile(f); setFrontPreview(URL.createObjectURL(f)); };
  const pickBack = (f: File) => { setBackFile(f); setBackPreview(URL.createObjectURL(f)); };

  const handleSubmit = async () => {
    if (!frontFile || !backFile) {
      setError('Please add both the front and back of your ID.');
      return;
    }
    setError('');
    setUploading(true);

    const upload = async (file: File, side: 'front' | 'back') => {
      const path = `${user.id}/${side}`;
      const { error: upErr } = await supabase.storage
        .from('id-cards')
        .upload(path, file, { upsert: true, contentType: file.type });
      return { path, upErr };
    };

    const f = await upload(frontFile, 'front');
    if (f.upErr) { setError(f.upErr.message); setUploading(false); return; }
    const b = await upload(backFile, 'back');
    if (b.upErr) { setError(b.upErr.message); setUploading(false); return; }

    const res = await submitIdVerification(f.path, b.path);
    setUploading(false);
    if (!res.success) setError(res.message || 'Could not submit your ID. Please try again.');
  };

  return (
    <Shell>
      {status === 'rejected' && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3">
          <XCircleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Your last submission was rejected</p>
            {user.verificationRejectReason && (
              <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-0.5">
                Reason: {user.verificationRejectReason}
              </p>
            )}
            <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-0.5">Please upload clear photos and try again.</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 mb-4 text-sm text-apple-subtext dark:text-slate-400">
        <IdCardIcon className="w-4 h-4 mt-0.5 shrink-0 text-[#c20f24]" />
        <p>Upload a clear photo of the <strong>front and back</strong> of your National ID card. Make sure your name and photo are readable.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UploadBox label="Front of ID" preview={frontPreview} onPick={pickFront} />
        <UploadBox label="Back of ID" preview={backPreview} onPick={pickBack} />
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={uploading || !frontFile || !backFile}
        className="mt-5 w-full h-12 rounded-full bg-[#c20f24] text-white font-semibold hover:bg-[#9c0c1d] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(194,15,36,0.35)]"
      >
        {uploading ? (
          <>
            <Loader2Icon className="w-5 h-5 animate-spin" /> Uploading…
          </>
        ) : (
          'Submit for verification'
        )}
      </button>
    </Shell>
  );
}

/**
 * Wraps content that requires an approved ID. Approved students see the
 * content; everyone else sees the verification panel instead.
 */
export function VerificationGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user || user.verificationStatus === 'approved') return <>{children}</>;
  return (
    <div className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-apple-text dark:text-apple-light">Verify your identity to continue</h1>
          <p className="text-sm text-apple-subtext dark:text-slate-400 mt-1.5">
            To keep classes fair to paying students, watching and buying is unlocked after we confirm your ID.
          </p>
        </div>
        <IdVerificationPanel />
      </div>
    </div>
  );
}
