import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Building2,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Check,
  AlertTriangle,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { NICHE } from '../config/niche';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'profile' | 'company' | 'notifications' | 'security';

interface UserProfile {
  companyName: string;
  industry: string;
  companySize: string;
  role: string;
  displayName: string;
}

interface NotifPrefs {
  newCandidates: boolean;
  pipelineUpdates: boolean;
  weeklyDigest: boolean;
  productUpdates: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  const items: { id: Section; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'profile',       label: 'Profile',       icon: User },
    { id: 'company',       label: 'Company',        icon: Building2 },
    { id: 'notifications', label: 'Notifications',  icon: Bell },
    { id: 'security',      label: 'Security',       icon: Shield },
  ];
  return (
    <nav className="space-y-0.5">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
              isActive
                ? 'bg-brand text-white shadow-sm shadow-brand/25'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              {item.label}
            </span>
            <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white/60' : 'text-gray-300'}`} />
          </button>
        );
      })}
    </nav>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardSection({ title, subtitle, children, last = false }: { title: string; subtitle?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-6 py-5 ${!last ? 'border-b border-gray-100' : ''}`}>
      <div className="flex items-start justify-between gap-8">
        <div className="w-48 shrink-0 pt-0.5">
          <p className="text-[13px] font-semibold text-gray-900">{title}</p>
          {subtitle && <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder = '', disabled = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const inputType = type === 'password' ? (show ? 'text' : 'password') : type;
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3.5 py-2.5 text-[13px] text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all disabled:bg-gray-50 disabled:text-gray-400 pr-10"
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-[13px] font-semibold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-60 shadow-sm shadow-brand/20"
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
      {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
    </button>
  );
}

function Toggle({ on, onChange, label, description }: { on: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        {description && <p className="text-[12px] text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`w-10 h-6 rounded-full transition-all duration-200 relative shrink-0 ml-6 ${on ? 'bg-brand' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${on ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SettingsView() {
  const [section, setSection] = useState<Section>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = auth.currentUser;

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    displayName: user?.displayName ?? '',
    companyName: '',
    industry: NICHE.industries[0] ?? '',
    companySize: '',
    role: '',
  });

  // Notifications
  const [notifs, setNotifs] = useState<NotifPrefs>({
    newCandidates: true,
    pipelineUpdates: true,
    weeklyDigest: false,
    productUpdates: true,
  });

  // Security
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setProfile(p => ({
        ...p,
        displayName: user.displayName ?? '',
        companyName: d.companyName ?? '',
        industry: d.industry ?? p.industry,
        companySize: d.companySize ?? '',
        role: d.role ?? '',
      }));
      if (d.notifications) setNotifs(d.notifications);
    }).catch(() => {});
  }, [user]);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true); setError(null);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        companyName: profile.companyName,
        industry: profile.industry,
        companySize: profile.companySize,
        role: profile.role,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      flash();
    } catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const saveNotifications = async () => {
    if (!user) return;
    setSaving(true); setError(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { notifications: notifs, updatedAt: serverTimestamp() }, { merge: true });
      flash();
    } catch { setError('Failed to save.'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!user || !user.email) return;
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    if (newPw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSaving(true); setError(null);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      flash();
    } catch (e: any) {
      setError(e.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Failed to update password.');
    } finally { setSaving(false); }
  };

  const sendReset = async () => {
    if (!user?.email) return;
    await sendPasswordResetEmail(auth, user.email);
    setResetSent(true);
  };

  const isEmailProvider = user?.providerData.some(p => p.providerId === 'password');
  const set = (k: keyof UserProfile) => (v: string) => setProfile(p => ({ ...p, [k]: v }));

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-[13px] text-gray-400 mt-1">Manage your account, company, and preferences.</p>
        </div>

        <div className="flex gap-6">

          {/* Sidebar nav */}
          <div className="w-48 shrink-0">
            <SectionNav active={section} onChange={s => { setSection(s); setError(null); setSaved(false); }} />

            {/* Sign out */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >

              {/* ── Profile ──────────────────────────────────────────────── */}
              {section === 'profile' && (
                <div className="space-y-4">
                  <Card>
                    {/* Avatar row */}
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-lg font-bold text-brand shrink-0">
                        {(profile.displayName || user?.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-gray-900">{profile.displayName || user?.email}</p>
                        <p className="text-[12px] text-gray-400 mt-0.5">{user?.email}</p>
                        <p className="text-[11px] text-brand mt-1 font-medium">
                          {user?.providerData[0]?.providerId === 'google.com' ? 'Google account' : 'Email account'}
                        </p>
                      </div>
                    </div>

                    <CardSection title="Display name" subtitle="How your name appears across the platform.">
                      <Input label="Full name" value={profile.displayName} onChange={set('displayName')} placeholder="Your full name" />
                    </CardSection>

                    <CardSection title="Email address" subtitle="Your sign-in email address." last>
                      <Input label="Email" value={user?.email ?? ''} disabled type="email" />
                      <p className="text-[11px] text-gray-400 mt-1.5">Email cannot be changed here. Contact support if needed.</p>
                    </CardSection>
                  </Card>

                  {error && <ErrorBanner message={error} />}
                  <div className="flex justify-end">
                    <SaveButton saving={saving} saved={saved} onClick={saveProfile} />
                  </div>
                </div>
              )}

              {/* ── Company ──────────────────────────────────────────────── */}
              {section === 'company' && (
                <div className="space-y-4">
                  <Card>
                    <CardSection title="Company name" subtitle="Your firm's legal or trading name.">
                      <Input label="Company" value={profile.companyName} onChange={set('companyName')} placeholder="e.g. Hensel Phelps" />
                    </CardSection>

                    <CardSection title="Industry" subtitle="Primary sector for candidate matching.">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sector</label>
                        <select
                          value={profile.industry}
                          onChange={e => set('industry')(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-[13px] text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all bg-white"
                        >
                          {NICHE.industries.map(ind => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>
                    </CardSection>

                    <CardSection title="Company size" subtitle="Number of employees.">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Size</label>
                        <select
                          value={profile.companySize}
                          onChange={e => set('companySize')(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-[13px] text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all bg-white"
                        >
                          {['1–10 employees', '11–50 employees', '51–200 employees', '201–500 employees', '500+ employees'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </CardSection>

                    <CardSection title="Your role" subtitle="Your position at the company." last>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
                        <select
                          value={profile.role}
                          onChange={e => set('role')(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-[13px] text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all bg-white"
                        >
                          {['Recruiter', 'Hiring Manager', 'HR Director', 'Operations Manager', 'Admin', 'Owner'].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </CardSection>
                  </Card>

                  {error && <ErrorBanner message={error} />}
                  <div className="flex justify-end">
                    <SaveButton saving={saving} saved={saved} onClick={saveProfile} />
                  </div>
                </div>
              )}

              {/* ── Notifications ─────────────────────────────────────────── */}
              {section === 'notifications' && (
                <div className="space-y-4">
                  <Card>
                    <div className="px-6 py-5 border-b border-gray-100">
                      <p className="text-[13px] font-semibold text-gray-900">Email notifications</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">Control what {NICHE.appName} sends to {user?.email}.</p>
                    </div>
                    <div className="px-6 py-2">
                      <Toggle
                        on={notifs.newCandidates}
                        onChange={v => setNotifs(n => ({ ...n, newCandidates: v }))}
                        label="New candidate matches"
                        description="When AI finds candidates for your active roles."
                      />
                      <Toggle
                        on={notifs.pipelineUpdates}
                        onChange={v => setNotifs(n => ({ ...n, pipelineUpdates: v }))}
                        label="Pipeline updates"
                        description="Stage changes and activity across your pipeline."
                      />
                      <Toggle
                        on={notifs.weeklyDigest}
                        onChange={v => setNotifs(n => ({ ...n, weeklyDigest: v }))}
                        label="Weekly digest"
                        description="Summary of activity every Monday morning."
                      />
                      <Toggle
                        on={notifs.productUpdates}
                        onChange={v => setNotifs(n => ({ ...n, productUpdates: v }))}
                        label="Product updates"
                        description="New features and improvements to {NICHE.appName}."
                      />
                    </div>
                  </Card>

                  {error && <ErrorBanner message={error} />}
                  <div className="flex justify-end">
                    <SaveButton saving={saving} saved={saved} onClick={saveNotifications} />
                  </div>
                </div>
              )}

              {/* ── Security ──────────────────────────────────────────────── */}
              {section === 'security' && (
                <div className="space-y-4">
                  {/* Password */}
                  {isEmailProvider ? (
                    <Card>
                      <div className="px-6 py-5 border-b border-gray-100">
                        <p className="text-[13px] font-semibold text-gray-900">Change password</p>
                        <p className="text-[12px] text-gray-400 mt-0.5">Use a strong password of at least 8 characters.</p>
                      </div>
                      <CardSection title="Current password" subtitle="Required to verify your identity.">
                        <Input label="Current password" value={currentPw} onChange={setCurrentPw} type="password" placeholder="••••••••" />
                      </CardSection>
                      <CardSection title="New password" subtitle="At least 6 characters." last>
                        <div className="space-y-3">
                          <Input label="New password" value={newPw} onChange={setNewPw} type="password" placeholder="••••••••" />
                          <Input label="Confirm password" value={confirmPw} onChange={setConfirmPw} type="password" placeholder="••••••••" />
                        </div>
                      </CardSection>
                    </Card>
                  ) : (
                    <Card>
                      <div className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Lock className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-gray-900">Google account</p>
                            <p className="text-[12px] text-gray-400 mt-0.5">Your password is managed by Google. Sign in to Google to change it.</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Password reset */}
                  {isEmailProvider && (
                    <Card>
                      <div className="px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-gray-900">Password reset email</p>
                            <p className="text-[12px] text-gray-400 mt-0.5">Send a reset link to {user?.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={sendReset}
                          disabled={resetSent}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold rounded-xl border border-gray-200 text-gray-600 hover:border-brand/30 hover:text-brand hover:bg-brand/5 transition-all disabled:opacity-50"
                        >
                          {resetSent ? <><Check className="w-3.5 h-3.5 text-emerald-500" />Sent</> : 'Send link'}
                        </button>
                      </div>
                    </Card>
                  )}

                  {/* Danger zone */}
                  <Card>
                    <div className="px-6 py-5 border-b border-gray-100">
                      <p className="text-[13px] font-semibold text-gray-900">Session</p>
                    </div>
                    <div className="px-6 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                          <LogOut className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900">Sign out</p>
                          <p className="text-[12px] text-gray-400 mt-0.5">Sign out of your account on this device.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => signOut(auth)}
                        className="px-3.5 py-2 text-[12px] font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                      >
                        Sign out
                      </button>
                    </div>
                  </Card>

                  {error && <ErrorBanner message={error} />}
                  {isEmailProvider && (
                    <div className="flex justify-end">
                      <SaveButton saving={saving} saved={saved} onClick={changePassword} />
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
      <p className="text-[12px] text-red-600">{message}</p>
    </div>
  );
}
