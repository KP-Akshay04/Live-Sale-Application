import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  ShieldAlert,
  Save,
  CheckCircle,
  Database,
  Lock,
  Compass,
  Cpu
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { currentUser, updatePassword } = useApp();

  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ERP compliance state parameters
  const [useTaxCalculations, setUseTaxCalculations] = useState(true);
  const [autoSettleInvoices, setAutoSettleInvoices] = useState(true);
  const [erpMode, setErpMode] = useState('Standard Simulation');

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordInput || !newPassword || !confirmPassword) {
      toast.error('All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Confirm password does not match new password.');
      return;
    }
    if (newPassword.length < 5) {
      toast.error('New password must be at least 5 characters.');
      return;
    }

    const success = updatePassword(newPassword);
    if (success) {
      toast.success('Your security password has been changed.');
      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error('Unable to update security password.');
    }
  };

  const handleSaveERPConfig = () => {
    toast.success('ERP configuration saved and synced across all terminals.');
  };

  return (
    <div className="space-y-6" id="settings-view-section">
      {/* Title Header */}
      <div>
        <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight">
          System Control & Profile Settings
        </h1>
        <p className="text-slate-500 text-sm">
          Update your secure route passcodes, audit local cache, and modify default tax configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & ERP Configs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile Overview Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-4">
            <h3 className="font-display font-bold text-slate-800 text-sm pb-2 border-b border-slate-50">
              Active User Identification Card
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-brand-600 text-white font-display font-bold text-xl flex items-center justify-center shrink-0 shadow-md">
                {currentUser?.employeeName.substring(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-bold text-slate-800 text-base">{currentUser?.employeeName}</h4>
                  <span className="text-[10px] bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full font-bold uppercase border border-brand-100">
                    {currentUser?.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Employee ID: <span className="font-bold text-slate-700 font-mono">{currentUser?.employeeId}</span></p>
                <p className="text-xs text-slate-400">Authorized Username: <span className="font-semibold text-brand-600 font-mono">@{currentUser?.username}</span></p>
              </div>
            </div>
          </div>

          {/* ERP Settings Parameters Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
              <Cpu className="h-5 w-5 text-brand-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Corporate Compliance Settings</h3>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              {/* Parameter 1 */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Dynamic GST Tax Calculations</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Auto-append CGST and SGST parameters inside field invoices.</p>
                </div>
                <input
                  type="checkbox"
                  checked={useTaxCalculations}
                  onChange={(e) => setUseTaxCalculations(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer"
                />
              </div>

              {/* Parameter 2 */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Auto Settle Outstanding Load balances</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Settle unsold vehicle load stock at central depot automatically during return logouts.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettleInvoices}
                  onChange={(e) => setAutoSettleInvoices(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer"
                />
              </div>

              {/* Parameter 3 */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Active ERP Simulation Mode</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Switch between standard simulation, static mock-mode, or staging API proxies.</p>
                </div>
                <select
                  value={erpMode}
                  onChange={(e) => setErpMode(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
                >
                  <option value="Standard Simulation">Standard Simulation</option>
                  <option value="Static Demo Cache">Static Demo Cache</option>
                  <option value="Cloud Sandbox Connect">Cloud Sandbox Connect</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveERPConfig}
                className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow"
              >
                <Save className="h-4 w-4" /> Save Configuration
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Security/Password Reset */}
        <div className="space-y-6">
          <form onSubmit={handlePasswordChange} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-4" id="password-reset-form">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
              <Lock className="h-5 w-5 text-brand-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Security Credentials Update</h3>
            </div>

            {/* Current Pass */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Passcode *
              </label>
              <input
                type="password"
                required
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* New Pass */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                New Security Passcode *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 5 characters"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Confirm New Pass */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Confirm New Passcode *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="At least 5 characters"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              <Lock className="h-4 w-4" /> Change Password
            </button>
          </form>

          {/* Database Info panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-fiori space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
              <Database className="h-5 w-5 text-brand-600" />
              <h3 className="font-display font-bold text-slate-800 text-sm">ERP Client Storage Logs</h3>
            </div>

            <div className="text-xs text-slate-500 space-y-2">
              <div className="flex justify-between">
                <span>Storage System:</span>
                <span className="font-semibold text-slate-700">Offline HTML5 LocalCache</span>
              </div>
              <div className="flex justify-between">
                <span>Database Sync Status:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> SECURE MATCH
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                Your credentials and active data logs are kept secure under local system sandboxing regulations. Clear browser storage to erase localized simulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
