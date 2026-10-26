/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../api.ts';
import { User, Role } from '../types.ts';
import { X, Lock, Mail, User as UserIcon, Building2, AlertCircle, Sparkles } from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('ATTENDEE');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        onSuccess(res.user);
      } else {
        const res = await api.register({
          name,
          email,
          password,
          role,
          organizationName: role === 'ORGANIZER' ? organizationName : undefined,
        });
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (emailVal: string, passVal: string) => {
    setMode('login');
    setEmail(emailVal);
    setPassword(passVal);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#64748B] hover:text-[#111827] p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <h2 className="text-xl font-black text-[#111827] tracking-tight">
            {mode === 'login' ? 'Sign in to Eventora' : 'Create an Account'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            {mode === 'login'
              ? 'Access your tickets, reservations, or organizer studio.'
              : 'Join as an attendee or organizer to discover and host events.'}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E5E7EB] text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'login' ? 'bg-white text-[#6D28D9] shadow-xs' : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'register' ? 'bg-white text-[#6D28D9] shadow-xs' : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <div>
              <label className="text-[#111827] font-bold block mb-1">Full Name</label>
              <div className="flex items-center px-3 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#6D28D9]">
                <UserIcon className="w-4 h-4 text-[#94A3B8] mr-2 shrink-0" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Miller"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-2.5 text-[#111827] placeholder-[#94A3B8] bg-transparent focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[#111827] font-bold block mb-1">Email Address</label>
            <div className="flex items-center px-3 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#6D28D9]">
              <Mail className="w-4 h-4 text-[#94A3B8] mr-2 shrink-0" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2.5 text-[#111827] placeholder-[#94A3B8] bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[#111827] font-bold block mb-1">Password</label>
            <div className="flex items-center px-3 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#6D28D9]">
              <Lock className="w-4 h-4 text-[#94A3B8] mr-2 shrink-0" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 text-[#111827] placeholder-[#94A3B8] bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[#111827] font-bold block mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('ATTENDEE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      role === 'ATTENDEE'
                        ? 'bg-emerald-50 border-emerald-300 text-[#15803D] shadow-2xs'
                        : 'bg-white border-[#E5E7EB] text-[#64748B]'
                    }`}
                  >
                    Attendee (Buyer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ORGANIZER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      role === 'ORGANIZER'
                        ? 'bg-purple-50 border-purple-300 text-[#6D28D9] shadow-2xs'
                        : 'bg-white border-[#E5E7EB] text-[#64748B]'
                    }`}
                  >
                    Organizer (Creator)
                  </button>
                </div>
              </div>

              {role === 'ORGANIZER' && (
                <div>
                  <label className="text-[#111827] font-bold block mb-1">Organization / Brand Name</label>
                  <div className="flex items-center px-3 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#6D28D9]">
                    <Building2 className="w-4 h-4 text-[#94A3B8] mr-2 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Live Productions"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full py-2.5 text-[#111827] placeholder-[#94A3B8] bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold py-3 rounded-xl shadow-xs transition-all cursor-pointer mt-2"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Quick Test Demo Credentials */}
        <div className="pt-3 border-t border-[#E5E7EB]">
          <div className="text-[11px] font-bold text-[#64748B] mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>Quick fill verified test accounts:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              onClick={() => fillQuickAccount('praveendevaraj2006@gmail.com', 'AttendeePass123!')}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[#15803D] font-bold cursor-pointer"
            >
              Praveen (Attendee)
            </button>
            <button
              onClick={() => fillQuickAccount('apex@events.in', 'OrganizerPass123!')}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-[#6D28D9] font-bold cursor-pointer"
            >
              Vikramaditya (Apex)
            </button>
            <button
              onClick={() => fillQuickAccount('admin@eventora.in', 'AdminPass123!')}
              className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg text-[#8B5CF6] font-bold cursor-pointer"
            >
              Dr. Rajeshwari (Admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
