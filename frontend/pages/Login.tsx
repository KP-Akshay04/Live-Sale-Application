import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Zap,
  ArrowRight,
  ShieldCheck,
  Truck,
  Warehouse,
  Layers,
  Sparkles,
  CheckCircle2,
  Activity,
  Cpu
} from 'lucide-react';
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

  const handleForgotPassword = () => {
    toast.dismiss();
    toast('Default demo passwords: adminpassword / depotpassword / salespassword', { icon: 'ℹ️' });
  };

  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden relative" id="login-page">
      {/* Background Ambient Glow FX */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[180px]" />
      </div>

      {/* TOP NAVIGATION HEADER */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-display font-black text-xl shadow-lg shadow-blue-500/30 border border-blue-400/30">
            LS
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-white text-base tracking-wider leading-none">
              LIVE SALE APPLICATION
            </span>
            <span className="text-[10px] text-blue-400 font-medium tracking-widest uppercase mt-0.5">
              Enterprise Distribution Suite
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
          <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
          <a href="#solutions" className="hover:text-cyan-400 transition-colors">Solutions</a>
          <a href="#benefits" className="hover:text-cyan-400 transition-colors">Benefits</a>
          <a href="#about" className="hover:text-cyan-400 transition-colors">About Us</a>
          <a href="#contact" className="hover:text-cyan-400 transition-colors">Contact</a>
        </nav>

        {/* System Version Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-inner">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>v3.2.0</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">STABLE</span>
        </div>
      </header>

      {/* MAIN HERO & AUTH SECTION */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 md:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* LEFT COLUMN: Enterprise Positioning & Route Logistics Visual */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Header Title & Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-cyan-400 border border-blue-500/25 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Next-Gen FMCG Sales Orchestration</span>
              </div>

              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-display font-black text-white tracking-tight leading-[1.15]">
                Real-time Stock, Pricing & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300">
                  Scheme Dispatch Controller
                </span>
              </h1>

              <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl font-normal">
                Accelerate routes and monitor depot logistics effortlessly. Powering enterprise supply chains, bulk pricing compliance, and sales receipts dynamically.
              </p>
            </motion.div>

            {/* ISOMETRIC / HUD ROUTE LOGISTICS GRAPHIC CARD */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 backdrop-blur-xl overflow-hidden shadow-2xl group"
            >
              {/* Subtle background grid pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

              {/* Graphic Title Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Live Distribution & Route Monitor
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                    Active Sync
                  </span>
                </div>
              </div>

              {/* SVG / Vector Route Network Illustration */}
              <div className="relative h-56 sm:h-64 w-full rounded-xl bg-slate-950/80 border border-slate-800/60 flex items-center justify-center overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid Lines */}
                  <path d="M0 130 H600 M300 0 V260" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  <path d="M100 0 L500 260" stroke="#0f172a" strokeWidth="1" opacity="0.3" />
                  <path d="M500 0 L100 260" stroke="#0f172a" strokeWidth="1" opacity="0.3" />

                  {/* Connected Dispatch Network Path Lines */}
                  <path d="M120 180 C 200 180, 220 80, 320 100 C 420 120, 450 200, 520 160" stroke="url(#routeGradient)" strokeWidth="3" fill="none" strokeDasharray="6 4" />
                  <path d="M120 180 Q 280 230 480 90" stroke="#1e3a8a" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.6" />

                  {/* Animated Glowing Pulses on Route */}
                  <circle cx="210" cy="120" r="4" fill="#38bdf8">
                    <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="380" cy="115" r="4" fill="#34d399">
                    <animate attributeName="r" values="3;6;3" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Route Gradients */}
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Node 1: Primary Warehouse / Central Depot */}
                  <g transform="translate(90, 150)">
                    <rect x="0" y="0" width="60" height="50" rx="8" fill="#0f172a" stroke="#2563eb" strokeWidth="2" />
                    <rect x="8" y="8" width="44" height="34" rx="4" fill="#1e293b" />
                    <path d="M16 25 L30 15 L44 25" stroke="#38bdf8" strokeWidth="2" fill="none" />
                    <circle cx="30" cy="32" r="3" fill="#60a5fa" />
                    <text x="30" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">Central Depot</text>
                  </g>

                  {/* Node 2: Distribution Van / Transit Hub */}
                  <g transform="translate(290, 70)">
                    <rect x="0" y="0" width="60" height="50" rx="8" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
                    <rect x="8" y="8" width="44" height="34" rx="4" fill="#1e293b" />
                    <circle cx="30" cy="25" r="8" fill="#0284c7" opacity="0.3" />
                    <path d="M24 25 H36 M30 19 V31" stroke="#22d3ee" strokeWidth="2" />
                    <text x="30" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">Route Logistics</text>
                  </g>

                  {/* Node 3: Retail Outlets / End Stores */}
                  <g transform="translate(480, 130)">
                    <rect x="0" y="0" width="60" height="50" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                    <rect x="8" y="8" width="44" height="34" rx="4" fill="#1e293b" />
                    <path d="M20 20 H40 V34 H20 Z" fill="none" stroke="#34d399" strokeWidth="1.5" />
                    <path d="M16 20 L30 12 L44 20" stroke="#34d399" strokeWidth="2" fill="none" />
                    <text x="30" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">Retail Outlets</text>
                  </g>
                </svg>

                {/* Floating HUD Card 1: Live Stock Overview */}
                <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 backdrop-blur-md shadow-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Warehouse className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Stock Control</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800/50">Active</span>
                    </div>
                    <div className="text-xs font-bold font-display text-white">Depot & Van Sync</div>
                  </div>
                </div>

                {/* Floating HUD Card 2: Dispatch Status Ring */}
                <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 backdrop-blur-md shadow-xl flex items-center gap-3">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="w-10 h-10 transform -rotate-90">
                      <circle cx="20" cy="20" r="16" stroke="#1e293b" strokeWidth="3.5" fill="transparent" />
                      <circle cx="20" cy="20" r="16" stroke="#06b6d4" strokeWidth="3.5" fill="transparent" strokeDasharray="100" strokeDashoffset="10" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[9px] font-bold font-mono text-cyan-400">100%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Dispatch Engine</span>
                    <span className="text-xs font-bold text-white">Automated Routes</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* FEATURE CARDS / SYSTEM HIGHLIGHTS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { title: 'Real-time Stock', desc: 'Depot & Line Sale visibility', icon: Warehouse, color: 'text-blue-400', border: 'border-blue-500/20' },
                { title: 'Smart Pricing', desc: 'Central price list controls', icon: BarChart3, color: 'text-emerald-400', border: 'border-emerald-500/20' },
                { title: 'Scheme Engine', desc: 'Dynamic campaign schemes', icon: Zap, color: 'text-amber-400', border: 'border-amber-500/20' },
                { title: 'Secure Operations', desc: 'Role-based access matrix', icon: ShieldAlert, color: 'text-cyan-400', border: 'border-cyan-500/20' },
              ].map((card, idx) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + idx * 0.08 }}
                  className={`p-3.5 rounded-xl bg-slate-900/50 border ${card.border} backdrop-blur-md space-y-1 hover:bg-slate-800/40 transition-all`}
                >
                  <div className="flex items-center gap-1.5">
                    <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                    <span className="text-xs font-bold text-white">{card.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">{card.desc}</p>
                </motion.div>
              ))}
            </div>

          </div>

          {/* RIGHT COLUMN: ENTERPRISE AUTHENTICATION PANEL */}
          <div className="lg:col-span-5 w-full">
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden space-y-6"
            >
              {/* Subtle top glowing highlight line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400" />

              {/* Panel Header */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                      Enterprise Authentication
                    </h2>
                    <p className="text-slate-400 text-xs">
                      Welcome back! Enter your secure credentials to coordinate dispatch.
                    </p>
                  </div>
                </div>
              </div>

              {/* DEMO ACCESS QUICK-FILL BOX */}
              <div className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    Demo Access (No Registration Needed)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">1-Click Auto-Fill</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin')}
                    className="py-2 px-2.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 active:scale-95 transition-all text-center cursor-pointer shadow-xs"
                    id="quick-fill-admin"
                  >
                    Super Admin
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('depot')}
                    className="py-2 px-2.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 active:scale-95 transition-all text-center cursor-pointer shadow-xs"
                    id="quick-fill-depot"
                  >
                    Depot Person
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('sales')}
                    className="py-2 px-2.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 active:scale-95 transition-all text-center cursor-pointer shadow-xs"
                    id="quick-fill-sales"
                  >
                    Sales Officer
                  </button>
                </div>
              </div>

              {/* AUTHENTICATION FORM */}
              <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
                
                {/* Username Input */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Username or Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <UserIcon className="w-4.5 h-4.5" />
                    </span>
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4.5 h-4.5" />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      id="toggle-password-visibility"
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-xs font-medium text-slate-400">Remember me</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">SSL 256-Bit Secure</span>
                </div>

                {/* Login Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="login-submit-button"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Secure Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </motion.div>
          </div>

        </div>

        {/* FEATURES / HIGHLIGHTS STRIP */}
        <div className="mt-12 pt-8 border-t border-slate-800/60" id="features">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { title: 'Real-time Visibility', desc: 'Get complete visibility of stock, routes, and dispatch in real-time.', icon: Eye },
              { title: 'Faster Dispatch', desc: 'Intelligent route planning and auto-dispatch for maximum efficiency.', icon: Truck },
              { title: 'Compliance Ready', desc: 'Built-in pricing, scheme & GST compliance to reduce errors.', icon: ShieldCheck },
              { title: 'Actionable Insights', desc: 'Powerful dashboards and reports for data-driven decisions.', icon: Layers },
              { title: 'Secure & Reliable', desc: 'Enterprise-grade security with 99.98% uptime guarantee.', icon: CheckCircle2 },
            ].map((feature) => (
              <div key={feature.title} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5 hover:bg-slate-800/30 transition-all">
                <feature.icon className="w-5 h-5 text-cyan-400 mb-1" />
                <h3 className="text-xs font-bold text-white">{feature.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ENTERPRISE CORE CAPABILITIES BADGE STRIP */}
        <div className="mt-8 p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center md:text-left">
            Enterprise Sales & Distribution Engine
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-400 font-mono tracking-widest opacity-80">
            <span className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> GST COMPLIANT</span>
            <span className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> MULTI-DEPOT</span>
            <span className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> LINE SALE MANIFEST</span>
            <span className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> REAL-TIME SCHEMES</span>
            <span className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ROLE-BASED AUTH</span>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© 2026 Live Sale Application Corp. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <span className="hover:text-slate-300 transition-colors cursor-pointer">Security</span>
          <span>•</span>
          <span className="hover:text-slate-300 transition-colors cursor-pointer">Compliance</span>
          <span>•</span>
          <span className="hover:text-slate-300 transition-colors cursor-pointer">Reliability</span>
        </div>
      </footer>
    </div>
  );
};

export default Login;

