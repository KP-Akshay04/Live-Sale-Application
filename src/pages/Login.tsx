import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, User as UserIcon, Eye, EyeOff, BarChart3, TrendingUp, ShieldAlert, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.dismiss();
      toast.error('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    const success = await login(username, password);
    setIsSubmitting(false);

    if (success) {
      toast.dismiss();
      toast.success('Successfully logged in!');
      navigate('/');
    } else {
      toast.dismiss();
      toast.error('Invalid username or password. Try the demo quick-fills!');
    }
  };

  // Demo user quick-fill helpers
  const handleQuickFill = (role: 'admin' | 'depot' | 'sales') => {
    toast.dismiss();
    if (role === 'admin') {
      setUsername('admin');
      setPassword('adminpassword');
    } else if (role === 'depot') {
      setUsername('depot');
      setPassword('depotpassword');
    } else if (role === 'sales') {
      setUsername('sales');
      setPassword('salespassword');
    }
    toast.success(`${role.toUpperCase()} credentials pre-filled.`);
  };

  return (
    <div className="min-h-screen flex bg-slate-900" id="login-page">
      {/* Left Side: Illustration & Corporate Statistics */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-slate-950 via-slate-900 to-brand-950 relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract decorative background shapes */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-display font-bold text-xl shadow-lg shadow-brand-500/30">
            LS
          </div>
          <span className="font-display font-bold text-white text-lg tracking-wider">
            LIVE SALE APPLICATION
          </span>
        </div>

        {/* Center message & graphics */}
        <div className="my-auto space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/25 tracking-widest uppercase">
              Next-Gen FMCG Sales Orchestration
            </span>
            <h1 className="text-4xl xl:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Real-time Stock, pricing & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">
                Scheme Dispatch Controller
              </span>
            </h1>
            <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
              Accelerate routes and monitor depot logistics effortlessly. Powering enterprise supply-chains, bulk pricing compliance, and sales receipts dynamically.
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {[
              { label: 'Daily Route volume', val: '42,400 KL', icon: TrendingUp, color: 'text-brand-400' },
              { label: 'Active Retail Outlets', val: '1,820+', icon: BarChart3, color: 'text-emerald-400' },
              { label: 'Average Sync Delay', val: '< 2.4s', icon: Zap, color: 'text-amber-400' },
              { label: 'Logistics Integrity', val: '99.98%', icon: ShieldAlert, color: 'text-cyan-400' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-slate-800/40 border border-slate-700/30 p-4 rounded-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{stat.label}</span>
                </div>
                <p className="text-lg font-display font-bold text-white">{stat.val}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between">
          <p>© 2026 Live Sale Application Corp.</p>
          <p className="hover:underline cursor-pointer">Security & Compliance</p>
        </div>
      </div>

      {/* Right Side: Glassmorphic Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-slate-950">
        <div className="absolute top-6 right-6 z-20 flex gap-2">
          {/* Quick Info text */}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8 bg-slate-900/50 p-8 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-2xl"
        >
          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">
              Enterprise Authentication
            </h2>
            <p className="text-slate-400 text-xs">
              Welcome back. Enter your secure credentials to coordinate dispatch.
            </p>
          </div>

          {/* Quick-Fill Credentials Panel (reviewer friendly) */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
              Demo Quick-Fill Access (No Registration Needed)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="text-[10px] font-semibold py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25 transition-all"
                id="quick-fill-admin"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('depot')}
                className="text-[10px] font-semibold py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                id="quick-fill-depot"
              >
                Depot Person
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('sales')}
                className="text-[10px] font-semibold py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all"
                id="quick-fill-sales"
              >
                Sales Officer
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="username">
                Username or Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <UserIcon className="h-4.5 w-4.5" />
                </span>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  placeholder="e.g. admin"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="password">
                  Password
                </label>
                <span className="text-[11px] font-semibold text-brand-400 hover:underline cursor-pointer">
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                  id="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                Remember me
              </label>
              <span className="text-slate-500">v3.2.0-STABLE</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              id="login-submit-button"
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-brand-600/10 hover:shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                'Secure Login'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
