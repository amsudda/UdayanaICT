import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type AuthUser = {
  id: string;
  role: 'student' | 'admin';
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  nic?: string;
  gender?: string;
  birthDate?: string;
  school?: string;
  district?: string;
  medium?: string;
  program?: string;
  examYear?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  avatar?: string;
};

/** Everything we collect at signup (besides credentials). */
export type StudentDetails = {
  phone?: string;
  nic?: string;
  gender?: string;
  birthDate?: string;
  school?: string;
  district?: string;
  medium?: string;
  program?: string;
  examYear?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
};

type RegisterInput = StudentDetails & { name: string; email: string; password: string };
type UpdateProfileInput = StudentDetails & { name: string; email: string; password?: string; avatar?: string };
type LoginInput = { email: string; password: string };
type Result = { success: boolean; message?: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<Result>;
  signup: (input: RegisterInput) => Promise<Result>;
  updateProfile: (input: UpdateProfileInput) => Promise<Result>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRowToUser(row: any): AuthUser {
  return {
    id: row.id,
    role: row.role ?? 'student',
    studentId: row.student_code ?? '',
    name: row.full_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? undefined,
    nic: row.nic ?? undefined,
    gender: row.gender ?? undefined,
    birthDate: row.birth_date ?? undefined,
    school: row.school ?? undefined,
    district: row.district ?? undefined,
    medium: row.medium ?? undefined,
    program: row.program ?? undefined,
    examYear: row.exam_year != null ? String(row.exam_year) : undefined,
    guardianName: row.guardian_name ?? undefined,
    guardianPhone: row.guardian_phone ?? undefined,
    address: row.address ?? undefined,
    avatar: row.avatar_url ?? undefined
  };
}

/** Map camelCase details → profile table columns. */
function detailsToColumns(d: StudentDetails) {
  return {
    phone: d.phone ?? null,
    nic: d.nic ?? null,
    gender: d.gender ?? null,
    birth_date: d.birthDate || null,
    school: d.school ?? null,
    district: d.district ?? null,
    medium: d.medium ?? null,
    program: d.program ?? null,
    exam_year: d.examYear ? Number(d.examYear) : null,
    guardian_name: d.guardianName ?? null,
    guardian_phone: d.guardianPhone ?? null,
    address: d.address ?? null
  };
}

const AuthContext_ = AuthContext;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (id: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (!error && data) setUser(mapRowToUser(data));
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const uid = data.session?.user?.id;
      if (uid) loadProfile(uid).finally(() => active && setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // defer supabase calls out of the callback (recommended pattern)
      setTimeout(() => {
        if (session?.user) void loadProfile(session.user.id);
        else setUser(null);
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }: LoginInput): Promise<Result> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    if (error) return { success: false, message: error.message };
    if (data.user) await loadProfile(data.user.id);
    return { success: true };
  };

  const signup = async ({ name, email, password, ...details }: RegisterInput): Promise<Result> => {
    const normalizedEmail = email.trim().toLowerCase();

    // Pass every detail as account metadata. The DB trigger writes the full
    // profile on creation, so it works whether or not email confirmation is on.
    const cols = detailsToColumns(details);
    const meta: Record<string, string> = { full_name: name };
    for (const [k, v] of Object.entries(cols)) {
      if (v != null) meta[k] = String(v);
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: meta }
    });
    if (error) return { success: false, message: error.message };

    const uid = data.user?.id;
    if (!uid) return { success: false, message: 'Could not create account.' };

    if (!data.session) {
      // email confirmation is ON — profile is already saved by the trigger
      return {
        success: false,
        message: 'Account created. Please check your email to confirm, then log in.'
      };
    }

    await loadProfile(uid);
    return { success: true };
  };

  const updateProfile = async ({ name, email, password, avatar, ...details }: UpdateProfileInput): Promise<Result> => {
    if (!user) return { success: false, message: 'You must be signed in to update your profile.' };

    if (password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { success: false, message: error.message };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== user.email) {
      const { error } = await supabase.auth.updateUser({ email: normalizedEmail });
      if (error) return { success: false, message: error.message };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        email: normalizedEmail,
        avatar_url: avatar ?? null,
        ...detailsToColumns(details)
      })
      .eq('id', user.id);
    if (error) return { success: false, message: error.message };

    await loadProfile(user.id);
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext_.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        login,
        signup,
        updateProfile,
        logout
      }}
    >
      {children}
    </AuthContext_.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
