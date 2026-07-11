'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { BrandMark, Wordmark } from '@/components/brand';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Phone-verification step: shown after signup, or after logging in to an
  // account whose phone isn't verified yet.
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [otp, setOtp] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  function finishAuth(data) {
    localStorage.setItem('wingman_user', JSON.stringify({
      userId: data.userId,
      email: data.email,
      netid: data.netid,
    }));
    const next = searchParams.get('next');
    if (next && next.startsWith('/')) router.push(next);
    else if (data.hasProfile) router.push('/feed');
    else router.push('/onboarding');
  }

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
        { theme: 'outline', size: 'large', width: '100%' }
      );
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
      if (!res.ok) { setError(data.error || 'Google sign-in failed'); return; }
      finishAuth(data);
    } catch {
      setError('Something went wrong with Google sign-in');
    } finally {
      setGoogleLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError('');
    setNotice('');
    setPassword('');
    setConfirm('');
    setOtp('');
    setVerifyingPhone(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (isSignup && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            phone_number: phoneNumber,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
        // Account created — now verify the phone.
        setPhoneNumber(data.phone_number || phoneNumber);
        if (data.devOtp) { setOtp(data.devOtp); setNotice(`Dev code: ${data.devOtp}`); }
        setVerifyingPhone(true);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.code === 'PHONE_NOT_VERIFIED') {
            // Send a fresh code and move to the verification step.
            setPhoneNumber(data.phone_number || '');
            const otpRes = await fetch('/api/auth/phone/request-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone_number: data.phone_number }),
            });
            const otpData = await otpRes.json().catch(() => ({}));
            if (otpData.devOtp) { setOtp(otpData.devOtp); setNotice(`Dev code: ${otpData.devOtp}`); }
            setVerifyingPhone(true);
          } else {
            setError(data.error || 'Something went wrong.');
          }
          return;
        }
        finishAuth(data);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Verification failed'); return; }
      finishAuth(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not resend the code.'); return; }
      if (data.devOtp) { setOtp(data.devOtp); setNotice(`Dev code: ${data.devOtp}`); }
      else setNotice('A new code was sent to your phone.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background px-6">
      <Script src="https://accounts.google.com/gsi/client" async defer onLoad={handleGoogleScriptLoad} />

      <div className="w-full max-w-sm mx-auto pt-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex flex-col items-center gap-3 transition-transform hover:-translate-y-0.5">
            <BrandMark size={64} />
            <div className="text-center">
              <Wordmark className="text-3xl" />
              <p className="eyebrow mt-2">you&rsquo;re the matchmaker</p>
            </div>
          </Link>

          {verifyingPhone ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">Verify your phone</h1>
              <p className="text-slate-400 text-center text-sm mb-6">
                Enter the 6-digit code we texted to {phoneNumber || 'your phone'}.
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  required
                  className="h-12 text-center text-lg font-mono tracking-widest"
                />
              </div>
              {notice && (
                <div className="bg-slate-50 text-slate-700 text-sm px-4 py-3 rounded-xl border border-slate-100">{notice}</div>
              )}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying…' : 'Verify & continue'}
              </Button>
              <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleResendOtp} disabled={loading}>
                Resend code
              </Button>
              <button
                type="button"
                onClick={() => { setVerifyingPhone(false); setOtp(''); setError(''); setNotice(''); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                Back
              </button>
            </form>
          ) : (
            <>
              <div className="flex rounded-xl border border-slate-200 p-1 mb-8 bg-slate-50">
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isSignup ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isSignup ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
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

                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Phone number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="(555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      autoComplete="tel"
                      className="h-12"
                    />
                    <p className="text-xs text-slate-500">US numbers only. We&rsquo;ll text a 6-digit code to verify it&rsquo;s you.</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading || !email || !password || (isSignup && (!confirm || !phoneNumber))}
                >
                  {loading ? (isSignup ? 'Creating account…' : 'Logging in…') : (isSignup ? 'Create account' : 'Log in')}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-background text-slate-500">or continue with</span>
                </div>
              </div>

              <div id="google-button"></div>

              <p className="mt-6 text-center text-xs text-slate-400">
                {isSignup ? 'Already have an account? ' : "Don't have an account? "}
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
