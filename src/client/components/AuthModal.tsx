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
      onClose();
    } catch (err: any) {
      console.error('Passkey login failed:', err);
      setErrorMessage(err.message || 'Passkey 生物辨識登入失敗或已取消');
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
      <div className="app-surface border rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step 1: Login Choices (Passkey + Email OTP) */}
        {step === 'email' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center mb-3">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">無密碼登入 / 註冊</h2>
              <p className="text-xs text-slate-400 mt-1">
                使用生物辨識或 Email 驗證碼，免記任何密碼
              </p>
            </div>

            {/* 1-Click Passkey Button */}
            <button
              onClick={handlePasskeyLogin}
              disabled={loading}
              className="app-primary w-full flex items-center justify-center gap-2 hover:brightness-105 font-bold py-3 rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-[0.98] disabled:opacity-50 mb-4 text-sm"
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
              <div className="flex-1 border-t border-slate-800"></div>
              <span className="px-3 text-[11px] text-slate-500 uppercase tracking-wider">或使用 Email</span>
              <div className="flex-1 border-t border-slate-800"></div>
            </div>

            {/* Email OTP Input Form */}
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">電子信箱 Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 rounded-xl border border-slate-700 text-xs transition-all active:scale-95 disabled:opacity-50"
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
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">輸入驗證碼</h2>
              <p className="text-xs text-slate-400 mt-1">
                已發送 6 位數驗證碼至 <span className="text-sky-400 font-medium">{email}</span>
              </p>
            </div>

            {devOtpHint && (
              <div className="app-primary-soft mb-4 text-center border p-2.5 rounded-xl">
                <span className="text-[11px] block mb-1">【本地開發測試】驗證碼：</span>
                <span className="text-lg font-mono font-bold tracking-widest text-sky-300">{devOtpHint}</span>
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-center font-mono text-2xl tracking-[0.4em] py-3 rounded-xl text-white outline-none"
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-center">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="app-primary w-full flex items-center justify-center gap-2 hover:brightness-105 font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>驗證並登入</span>}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="hover:text-slate-300 transition-colors"
                >
                  修改 Email
                </button>
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={handleSendOtp}
                  className="hover:text-sky-400 transition-colors disabled:opacity-40"
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
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">啟用 Face ID / 指紋秒登？</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              為此裝置啟用 Passkey，下次打開 afterBUY 只要按一下指紋或人臉辨識即可直接登入，無須再收驗證碼！
            </p>

            <div className="mt-6 space-y-2">
              <button
                onClick={handleEnrollPasskey}
                disabled={loading}
                className="app-primary w-full flex items-center justify-center gap-2 hover:brightness-105 font-semibold py-3 rounded-xl text-sm shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Fingerprint className="w-5 h-5" /> 立即啟用 Passkey</>}
              </button>

              <button
                onClick={handleSkipPasskey}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
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
