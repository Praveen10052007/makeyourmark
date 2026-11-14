import React, { useState } from 'react';
import { X, Lock, Mail, User, Eye, EyeOff, ShieldCheck, LogOut, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { UserSession } from '../types';
import {
  signInWithGoogleWorkspace,
  logoutFirebase,
} from '../services/firebaseClient';
import {
  registerLocalAccount,
  loginLocalAccount,
  resetLocalAccountPassword,
  logoutLocalAccount,
} from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onLogin: (session: UserSession) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, session, onLogin, onLogout }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [issuedRecoveryCode, setIssuedRecoveryCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginLocalAccount({ email: email.trim(), password });
      onLogin({
        isAuthenticated: true,
        isGuest: false,
        uid: res.user.uid,
        authProvider: 'local-email',
        emailVerified: false,
        workspaceConnected: false,
        email: res.user.email,
        name: res.user.name,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Check your email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Please provide your name, valid email, and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await registerLocalAccount({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setIssuedRecoveryCode(res.recoveryCode);
      setNotice(`Account created! Save your recovery code safely: ${res.recoveryCode}`);
      onLogin({
        isAuthenticated: true,
        isGuest: false,
        uid: res.user.uid,
        authProvider: 'local-email',
        emailVerified: false,
        workspaceConnected: false,
        email: res.user.email,
        name: res.user.name,
      });
    } catch (err: any) {
      setError(err.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !recoveryCode.trim() || newPassword.length < 6) {
      setError('Enter your registered email, recovery code, and a new password (min 6 chars).');
      return;
    }
    setLoading(true);
    try {
      const res = await resetLocalAccountPassword({
        email: email.trim(),
        recoveryCode: recoveryCode.trim(),
        newPassword,
      });
      setIssuedRecoveryCode(res.newRecoveryCode);
      setNotice(`Password updated! Your new recovery code is: ${res.newRecoveryCode}`);
      setMode('signin');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const { user, accessToken } = await signInWithGoogleWorkspace();
      onLogin({
        isAuthenticated: true,
        isGuest: false,
        uid: user.uid,
        authProvider: 'google',
        emailVerified: user.emailVerified,
        workspaceConnected: Boolean(accessToken),
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Google User',
        avatar: user.photoURL || undefined,
      });
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in was cancelled or blocked.';
      setError(msg.includes('popup-blocked') ? 'Browser blocked sign-in popup. Please allow popups for this site and retry.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    onLogin({
      isAuthenticated: true,
      isGuest: true,
      authProvider: 'guest',
      email: 'guest@makeyourmark.local',
      name: 'Guest Learner',
    });
    onClose();
  };

  const handleSignOutAll = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([logoutFirebase(), logoutLocalAccount()]);
      onLogout();
      setNotice('Signed out cleanly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-2xl transition-all">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white font-black text-sm shadow-md shadow-orange-500/20">
            MYM
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">MakeYourMark Account</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Cloud Sync, Google Docs Export & Local Session</p>
          </div>
        </div>

        {/* Current Active Session Banner */}
        {session.isAuthenticated && !session.isGuest && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate">{session.name}</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                {session.email} • {session.authProvider === 'google' ? 'Google & Workspace' : 'Local Account'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOutAll}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <p>{notice}</p>
              {issuedRecoveryCode && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-1 inline-block rounded-lg bg-orange-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-orange-500"
                >
                  Continue to Platform
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Google + Workspace Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 px-4 text-xs font-bold text-zinc-800 dark:text-white hover:border-orange-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-sm"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google (Cloud Sync & Google Docs)</span>
        </button>

        {/* Divider */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[11px] font-semibold text-zinc-400">OR LOCAL EMAIL ACCOUNT</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {(mode === 'signin' || mode === 'signup') && (
          <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 mb-4">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'signin'
                  ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-9 pr-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Password</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  Reset with Recovery Code
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-9 pr-10 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-600/20 transition disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Karthik Raman"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-9 pr-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-9 pr-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Password (min 6 characters)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-9 pr-10 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-600/20 transition disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Enter your registered email and the recovery code issued when you signed up to set a new password.
            </p>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Registered Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Recovery Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="Enter recovery code"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-9 pr-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-500 py-2.5 text-xs font-bold text-white"
              >
                Update Password
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleGuestContinue}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/50 transition"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Continue in Instant Guest Mode (Local Browser Storage)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
