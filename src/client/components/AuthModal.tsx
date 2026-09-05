import React, { useState, useEffect } from 'react';
import { X, Fingerprint, Mail, KeyRound, ArrowRight, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { api } from '../api.ts';
import { UserSession } from '../../shared/types.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'prompt_passkey'>('email');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loggedInUser, setLoggedInUser] = useState<UserSession | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  // 1. Passkey Biometric 1-Click Login
  const handlePasskeyLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.loginWithPasskey();
      onLoginSuccess(res.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('afterbuy_user', JSON.stringify(res.user));
      }
      onClose();
    } catch (err: any) {
      console.error('Passkey login failed:', err);
      if (
        err.name === 'NotAllowedError' ||
        err.message?.includes('找不到此裝置的 Passkey 憑證') ||
        err.message?.includes('The operation either timed out or was not allowed')
      ) {
        setErrorMessage('在此網域或裝置尚未綁定 Passkey。請先使用下方 Email 登入，登入後即可一鍵綁定 Touch ID / Face ID！');
      } else {
        setErrorMessage(err.message || 'Passkey 生物辨識登入失敗或已取消');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Request Email OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('請輸入正確的 Email 地址');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.sendOtp(email);
      setStep('otp');
      setCountdown(60);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '驗證碼發送失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMessage('請輸入 6 位數驗證碼');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.verifyOtp(email, otpCode);
      setLoggedInUser(res.user);
      // Immediately commit user state to prevent logout on modal dismiss/refresh
      onLoginSuccess(res.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('afterbuy_user', JSON.stringify(res.user));
      }
      // Ask user to enroll Passkey
      setStep('prompt_passkey');
    } catch (err: any) {
      setErrorMessage(err.message || '驗證碼無效或已過期');
    } finally {
      setLoading(false);
    }
  };

  // 4. Enroll Passkey on this device
  const handleEnrollPasskey = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await api.registerPasskey('我的常用手機/電腦');
      if (loggedInUser) {
        onLoginSuccess(loggedInUser);
      }
      onClose();
    } catch (err: any) {
      console.error('Passkey enrollment failed:', err);
      // Even if passkey fails, user is already logged in
      if (loggedInUser) {
        onLoginSuccess(loggedInUser);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPasskey = () => {
    if (loggedInUser) {
      onLoginSuccess(loggedInUser);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="app-surface border border-[var(--app-border)] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉登入視窗"
          className="absolute top-4 right-4 app-control ui-button min-h-11 min-w-11 flex items-center justify-center rounded-xl border hover:border-[var(--app-accent)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step 1: Login Choices (Passkey + Email OTP) */}
        {step === 'email' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl app-primary-soft border mx-auto flex items-center justify-center mb-3">
                <Fingerprint className="w-6 h-6 text-[var(--app-accent-strong)]" />
              </div>
              <h2 className="ui-section-title text-[var(--app-text)]">無密碼登入 / 註冊</h2>
              <p className="ui-meta text-[var(--app-muted)] mt-1">
                使用生物辨識或 Email 驗證碼，免記任何密碼
              </p>
            </div>

            {/* 1-Click Passkey Button */}
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={loading}
              className="app-primary ui-button w-full min-h-11 flex items-center justify-center gap-2 hover:brightness-105 font-bold rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-50 mb-4"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>使用 Face ID / 指紋秒登</span>
                </>
              )}
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-[var(--app-border)]"></div>
              <span className="px-3 ui-meta text-[var(--app-muted)] tracking-wider">或使用 Email</span>
              <div className="flex-1 border-t border-[var(--app-border)]"></div>
            </div>

            {/* Email OTP Input Form */}
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="block ui-label font-semibold text-[var(--app-text)] mb-1">電子信箱 Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--app-muted)] absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl pl-10 pr-3 min-h-11 ui-body text-[var(--app-text)] placeholder:text-[var(--app-muted-low)] outline-none transition-colors"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="ui-meta text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full min-h-11 flex items-center justify-center gap-2 app-control ui-button hover:border-[var(--app-accent)] font-semibold rounded-xl border transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>發送 6 位數驗證碼 <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Enter 6-digit OTP */}
        {step === 'otp' && (
          <div>
            <div className="text-center mb-6">
              <div className="app-primary-soft w-12 h-12 rounded-2xl border mx-auto flex items-center justify-center mb-3">
                <KeyRound className="w-6 h-6 text-[var(--app-accent-strong)]" />
              </div>
              <h2 className="ui-section-title text-[var(--app-text)]">輸入驗證碼</h2>
              <p className="ui-meta text-[var(--app-muted)] mt-1">
                已發送 6 位數驗證碼至 <span className="text-[var(--app-accent-strong)] font-semibold">{email}</span>
              </p>
            </div>

            {devOtpHint && (
              <div className="app-primary-soft mb-4 text-center border p-2.5 rounded-xl">
                <span className="ui-meta font-semibold block mb-1 text-[var(--app-accent-strong)]">【本地開發測試】驗證碼：</span>
                <span className="text-lg font-mono font-bold tracking-widest text-[var(--app-accent-strong)]">{devOtpHint}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] text-center font-mono text-2xl tracking-[0.4em] py-3 rounded-xl text-[var(--app-text)] outline-none"
                />
              </div>

              {errorMessage && (
                <div className="ui-meta text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-center">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="app-primary ui-button w-full min-h-11 flex items-center justify-center gap-2 hover:brightness-105 font-bold rounded-xl transition-transform active:scale-95 disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>驗證並登入</span>}
              </button>

              <div className="flex items-center justify-between ui-meta text-[var(--app-muted)] pt-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="min-h-9 px-2 flex items-center hover:text-[var(--app-text)] transition-colors"
                >
                  修改 Email
                </button>
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={handleSendOtp}
                  className="min-h-9 px-2 flex items-center hover:text-[var(--app-accent-strong)] transition-colors disabled:opacity-40 font-semibold"
                >
                  {countdown > 0 ? `重新發送 (${countdown}s)` : '重新發送驗證碼'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Passkey Enrollment Prompt */}
        {step === 'prompt_passkey' && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="ui-section-title text-[var(--app-text)]">啟用 Face ID / 指紋秒登？</h2>
            <p className="ui-body text-[var(--app-muted)] mt-2 leading-relaxed">
              為此裝置啟用 Passkey，下次打開 afterBUY 只要按一下指紋或人臉辨識即可直接登入，無須再收驗證碼！
            </p>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={handleEnrollPasskey}
                disabled={loading}
                className="app-primary ui-button w-full min-h-11 flex items-center justify-center gap-2 hover:brightness-105 font-bold rounded-xl shadow-sm active:scale-95 transition-transform"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Fingerprint className="w-5 h-5" /> 立即啟用 Passkey</>}
              </button>

              <button
                type="button"
                onClick={handleSkipPasskey}
                className="w-full min-h-11 ui-button text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors font-semibold"
              >
                稍後再說，直接進入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
