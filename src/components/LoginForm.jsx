import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, ShieldCheck, Sprout } from 'lucide-react';
import RoleTabs from './RoleTabs';
import { useToast } from '../context/ToastContext';
import { useAuth, ROLE_META } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { DEMO_PASSWORD } from '../data/seed';

export default function LoginForm() {
  const [activeRole, setActiveRole] = useState('Farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const { login } = useAuth();
  const { db } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  // Two demo accounts per role, so every role can be tried without registering.
  const demoAccounts = db.users.filter((u) => u.role === activeRole).slice(0, 2);

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = login(email, password, activeRole);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError('');
    showToast(`Welcome back, ${res.user.name}!`, 'success');
    const from = location.state?.from;
    navigate(from && from.startsWith(ROLE_META[activeRole].path) ? from : ROLE_META[activeRole].path, { replace: true });
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    showToast("Password reset feature will be available in Phase-II.");
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Top back link */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 px-3.5 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100/60 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-100 shadow-xl shadow-emerald-950/5">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 items-center justify-center mb-3 shadow-inner">
            <Sprout className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1B1B1B] tracking-tight">
            Welcome back to AgriLogiX
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-500">
            Sign in to access your role-specific dashboard and operations.
          </p>
        </div>

        {/* 4 Role Tabs */}
        <RoleTabs activeRole={activeRole} onSelectRole={(r) => { setActiveRole(r); setError(''); }} />

        {/* Dynamic Form Heading */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1B1B1B] flex items-center gap-2">
            <span>{ROLE_META[activeRole].label} Login</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </h2>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
            Scoped Access
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-zinc-50/50 transition-all placeholder-zinc-400"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Password
              </label>
              <a
                href="#forgot"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-zinc-50/50 transition-all placeholder-zinc-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-zinc-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Remember this session</span>
            </label>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Prototype login (simulated)</span>
            </div>
          </div>

          {error && (
            <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-4 py-3.5 px-6 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-xl shadow-md shadow-emerald-800/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Login as {ROLE_META[activeRole].label}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 rounded-2xl bg-amber-50/60 border border-amber-100 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-2">
            Demo {ROLE_META[activeRole].label} accounts · password: {DEMO_PASSWORD}
          </div>
          <div className="space-y-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword(DEMO_PASSWORD); setError(''); }}
                className="w-full flex items-center justify-between gap-3 text-left text-xs bg-white border border-amber-100 rounded-lg px-3 py-2 hover:border-emerald-300 cursor-pointer"
              >
                <span className="font-bold text-zinc-800">{acc.name}</span>
                <span className="text-zinc-500 truncate">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-zinc-100 text-center text-xs text-zinc-600">
          <span>Don't have an account yet? </span>
          <Link
            to="/register"
            className="font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2"
          >
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
