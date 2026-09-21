'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { BrandMark, Wordmark } from '@/components/brand';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(searchParams.get('verify') || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationNotice, setVerificationNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  // Forgot-password flow: '' (off) -> 'request' (enter netid) -> 'confirm' (code + new password)
  const [resetStep, setResetStep] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetNotice, setResetNotice] = useState('');

  // Initialize Google Sign-In after script loads
  const handleGoogleScriptLoad = () => {
    if (window.google) {
      google.accounts.id.initialize({
        client_id:
          process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
          '379185107870-dnihr4sldvtrs9i38uim0aj61u8rp6n1.apps.googleusercontent.com',
        callback: handleGoogleSignIn,
      });
      google.accounts.id.renderButton(
        document.getElementById('google-button'),
        { theme: 'outline', size: 'large', width: 280 }
      );
      setGoogleReady(true);
    }
  };

  async function handleGoogleSignIn(response) {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Google sign-in failed');
        return;
      }

      localStorage.setItem('wingman_user', JSON.stringify({
        userId: data.userId,
        email: data.email,
        netid: data.netid,
      }));

      const next = searchParams.get('next');
      if (next && next.startsWith('/')) {
        router.push(next);
      } else if (data.hasProfile) {
        router.push('/feed');
      } else {
        router.push('/onboarding');
      }
    } catch {
      setError('Something went wrong with Google sign-in');
    } finally {
      setGoogleLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
    setPendingVerificationEmail('');
    setVerificationCode('');
    setVerificationNotice('');
    setResetStep('');
    setResetCode('');
    setResetPassword('');
    setResetNotice('');
  }

  function openReset() {
    setError('');
    setResetNotice('');
    setResetCode('');
    setResetPassword('');
    setResetStep('request');
  }

  function exitReset() {
    setResetStep('');
    setResetCode('');
    setResetPassword('');
    setResetNotice('');
    setError('');
  }

  async function handleResetRequest(e) {
    e.preventDefault();
    setError('');
    setResetNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not send a reset code. Please try again.');
        return;
      }

      // Dev convenience: prefill the code when email isn't configured locally.
      if (data.devResetCode) setResetCode(data.devResetCode);
      setResetNotice(`If an account exists for ${email.trim().toLowerCase()}, a 6-digit reset code is on its way.`);
      setResetStep('confirm');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetConfirm(e) {
    e.preventDefault();
    setError('');
    setResetNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: resetCode,
          password: resetPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not reset your password.');
        return;
      }

      localStorage.setItem('wingman_user', JSON.stringify({
        userId: data.userId,
        email: data.email,
        netid: data.netid,
      }));

      const next = searchParams.get('next');
      if (next && next.startsWith('/')) {
        router.push(next);
      } else if (data.hasProfile) {
        router.push('/feed');
      } else {
        router.push('/onboarding');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailVerify(e) {
    e.preventDefault();
    setError('');
    setVerificationNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingVerificationEmail.trim().toLowerCase(), code: verificationCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Email verification failed');
        return;
      }

      localStorage.setItem('wingman_user', JSON.stringify({
        userId: data.userId,
        email: data.email,
        netid: data.netid,
      }));

      const next = searchParams.get('next');
      if (next && next.startsWith('/')) {
        router.push(next);
      } else if (data.hasProfile) {
        router.push('/feed');
      } else {
        router.push('/onboarding');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailResend() {
    setError('');
    setVerificationNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/email/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingVerificationEmail.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not resend verification code');
        return;
      }

      if (data.devVerificationCode) setVerificationCode(data.devVerificationCode);
      setVerificationNotice(data.alreadyVerified ? 'Email is already verified. Try logging in.' : 'A new code was sent.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }


  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setPendingVerificationEmail(data.email || email.trim().toLowerCase());
          setVerificationNotice('Verify your email before logging in.');
        } else {
          setError(data.error || 'Something went wrong.');
        }
        return;
      }

      if (data.requiresEmailVerification) {
        setPendingVerificationEmail(data.email);
        if (data.devVerificationCode) setVerificationCode(data.devVerificationCode);
        setVerificationNotice('Enter the 6-digit code we sent to your school email.');
        return;
      }

      localStorage.setItem('wingman_user', JSON.stringify({
        userId: data.userId,
        email: data.email,
        netid: data.netid,
      }));

      const next = searchParams.get('next');
      if (next && next.startsWith('/')) {
        router.push(next);
      } else if (data.hasProfile) {
        router.push('/feed');
      } else {
        router.push('/onboarding');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen flex flex-col bg-background px-6">
      <Script
        src="https://accounts.google.com/gsi/client"
        async
        defer
        onLoad={handleGoogleScriptLoad}
      />

      {/* Back button — pinned to the top-left corner */}
      <div className="w-full pt-6">
        <Link href="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">

          {/* Logo - clickable */}
          <Link href="/" className="mb-8 flex flex-col items-center gap-3 transition-transform hover:-translate-y-0.5">
            <BrandMark size={64} />
            <div className="text-center">
              <Wordmark className="text-3xl" />
              <p className="eyebrow mt-2">you&rsquo;re the matchmaker</p>
            </div>
          </Link>

        {pendingVerificationEmail && (
          <form onSubmit={handleEmailVerify} className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">Verify your email</h1>
            <p className="text-slate-400 text-center text-sm mb-6">
              Enter the 6-digit code sent to {pendingVerificationEmail}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email-code">Verification code</Label>
              <Input
                id="email-code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                required
                className="h-12 text-center text-lg font-mono tracking-widest"
              />
            </div>
            {verificationNotice && (
              <div className="bg-slate-50 text-slate-700 text-sm px-4 py-3 rounded-xl border border-slate-100">
                {verificationNotice}
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading || verificationCode.length !== 6}>
              {loading ? 'Verifying...' : 'Verify email'}
            </Button>
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleEmailResend} disabled={loading}>
              Resend code
            </Button>
            <button
              type="button"
              onClick={() => {
                setPendingVerificationEmail('');
                setVerificationCode('');
                setVerificationNotice('');
                setError('');
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Back to login
            </button>
          </form>
        )}

        {!pendingVerificationEmail && resetStep === 'request' && (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">Reset your password</h1>
            <p className="text-slate-400 text-center text-sm mb-6">
              Enter your Rutgers NetID and we&apos;ll email you a 6-digit reset code.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-netid">School email</Label>
              <div className="flex h-12 w-full items-center overflow-hidden rounded-xl border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <input
                  id="reset-netid"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  placeholder="netid"
                  value={email.replace(/@scarletmail\.rutgers\.edu$/, '')}
                  onChange={(e) => {
                    const id = e.target.value.replace(/@.*/, '').trim().toLowerCase();
                    setEmail(id ? `${id}@scarletmail.rutgers.edu` : '');
                  }}
                  required
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <span className="select-none whitespace-nowrap border-l border-input px-3 text-xs text-muted-foreground">
                  @scarletmail.rutgers.edu
                </span>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading || !email}>
              {loading ? 'Sending…' : 'Send reset code'}
            </Button>
            <button
              type="button"
              onClick={exitReset}
              className="w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Back to login
            </button>
          </form>
        )}

        {!pendingVerificationEmail && resetStep === 'confirm' && (
          <form onSubmit={handleResetConfirm} className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">Check your email</h1>
            <p className="text-slate-400 text-center text-sm mb-6">
              Enter the 6-digit code we sent, then choose a new password.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-code">Reset code</Label>
              <Input
                id="reset-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                required
                className="h-12 text-center text-lg font-mono tracking-widest"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showResetPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Must contain: 8+ chars, uppercase, lowercase, special character (!@#$%^&amp;*)
              </p>
            </div>
            {resetNotice && (
              <div className="bg-slate-50 text-slate-700 text-sm px-4 py-3 rounded-xl border border-slate-100">
                {resetNotice}
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading || resetCode.length !== 6 || !resetPassword}>
              {loading ? 'Resetting…' : 'Reset password'}
            </Button>
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleResetRequest} disabled={loading}>
              Resend code
            </Button>
            <button
              type="button"
              onClick={exitReset}
              className="w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Back to login
            </button>
          </form>
        )}

        {!pendingVerificationEmail && !resetStep && (
        <>

        {/* Mode toggle */}
        <div className="flex rounded-xl border border-slate-200 p-1 mb-8 bg-slate-50">
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              isSignup ? 'bg-[#ffffff] shadow-sm text-[#171717]' : 'text-white/70 hover:text-white'
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isSignup ? 'bg-[#ffffff] shadow-sm text-[#171717]' : 'text-white/70 hover:text-white'
            }`}
          >
            Log in
          </button>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          {isSignup ? 'Start finding matches through your friends.' : 'Log in to continue to Wingman.'}
        </p>

        {/* Email + password auth (Rutgers/.edu). Verification is by emailed code. */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">School email</Label>
            {/* NetID field: user types only their netid; the ScarletMail suffix
                is fixed and appended automatically to form the full email. */}
            <div className="flex h-12 w-full items-center overflow-hidden rounded-xl border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <input
                id="email"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                placeholder="netid"
                value={email.replace(/@scarletmail\.rutgers\.edu$/, '')}
                onChange={(e) => {
                  const id = e.target.value.replace(/@.*/, '').trim().toLowerCase();
                  setEmail(id ? `${id}@scarletmail.rutgers.edu` : '');
                }}
                required
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span className="select-none whitespace-nowrap border-l border-input px-3 text-xs text-muted-foreground">
                @scarletmail.rutgers.edu
              </span>
            </div>
            {isSignup && (
              <p className="text-xs text-primary-foreground/80">Enter your Rutgers NetID — we&apos;ll email a 6-digit code to your ScarletMail.</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignup && (
                <button
                  type="button"
                  onClick={openReset}
                  className="text-xs font-medium text-primary-foreground/80 hover:text-primary-foreground hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                className="h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {isSignup && (
              <p className="text-xs text-slate-500 mt-2">
                Must contain: 8+ chars, uppercase, lowercase, special character (!@#$%^&amp;*)
              </p>
            )}
          </div>

          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || !email || !password || (isSignup && !confirm)}
          >
            {loading ? (isSignup ? 'Creating account…' : 'Logging in…') : (isSignup ? 'Create account' : 'Log in')}
          </Button>

          {/* Clickwrap consent — surfacing this at the point of sign-up is what
              makes the Terms enforceable, not merely linking them in a footer. */}
          {isSignup && (
            <p className="text-center text-xs text-primary-foreground/80">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="font-semibold underline underline-offset-2 hover:text-primary-foreground">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-semibold underline underline-offset-2 hover:text-primary-foreground">
                Privacy Policy
              </Link>
              . You must be 18 or older to use Wingman.
            </p>
          )}
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-background text-slate-500">or continue with</span>
          </div>
        </div>

        <div id="google-button" className="flex justify-center"></div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {isSignup
            ? 'Already have an account? '
            : "Don't have an account? "}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? 'login' : 'signup')}
            className="text-black hover:underline font-medium"
          >
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </p>
        </>
        )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
