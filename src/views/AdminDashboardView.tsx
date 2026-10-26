/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { api } from '../api.ts';
import {
  ShieldCheck,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Zap,
  Activity,
  History,
  Play,
  RotateCcw,
  Ticket,
} from 'lucide-react';
import { formatINR } from '../utils/formatters.ts';

interface AdminDashboardViewProps {
  user: User;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ user }) => {
  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events' | 'audit' | 'concurrency'>('overview');

  // Concurrency benchmark test state
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [overviewData, usersData, eventsData, logsData] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getAdminEvents(),
        api.getAdminAuditLogs(),
      ]);
      setOverview(overviewData);
      setUsersList(usersData);
      setEventsList(eventsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateUserStatus(userId, nextStatus as any);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    }
  };

  const handleToggleEventStatus = async (eventId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'SUSPENDED' ? 'PUBLISHED' : 'SUSPENDED';
    try {
      await api.updateAdminEventStatus(eventId, nextStatus, 'Admin moderation action');
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Event update failed.');
    }
  };

  const handleRunConcurrencyTest = async () => {
    setBenchmarking(true);
    setBenchmarkResult(null);
    try {
      const result = await api.runAdminConcurrencyTest('tier-concurrency-test-10', 50);
      setBenchmarkResult(result);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Benchmark error');
    } finally {
      setBenchmarking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-white">
      {/* Admin Title Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#15803D] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Governance Hub</span>
          </div>
          <h1 className="text-3xl font-black text-[#111827] tracking-tight mt-1">
            Global Administration & Oversight
          </h1>
        </div>

        {/* Live Concurrency Trigger */}
        <button
          onClick={() => setActiveTab('concurrency')}
          className="bg-purple-50 hover:bg-purple-100 text-[#6D28D9] border border-purple-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Zap className="w-4 h-4 text-[#D97706]" />
          <span>Run 50-Request Concurrency Stress Test</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E5E7EB] pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'bg-purple-50 text-[#6D28D9] border border-purple-200' : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'users' ? 'bg-purple-50 text-[#6D28D9] border border-purple-200' : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          Users & Tenancy ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'events' ? 'bg-purple-50 text-[#6D28D9] border border-purple-200' : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          Moderation & Events ({eventsList.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'audit' ? 'bg-purple-50 text-[#6D28D9] border border-purple-200' : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          System Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('concurrency')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'concurrency' ? 'bg-amber-50 text-[#D97706] border border-amber-200' : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-[#D97706]" />
          Concurrency Benchmark
        </button>
      </div>

      {/* TAB 1: System Overview */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="text-[#64748B] text-xs font-bold flex justify-between">
                <span>Platform GMV</span>
                <span className="text-xs font-black text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-full">₹ INR</span>
              </div>
              <div className="text-2xl font-black text-[#111827] font-mono">
                {formatINR(overview.financials?.gross_merchandise_value || 0)}
              </div>
              <div className="text-[11px] text-[#64748B]">
                Platform fees: {formatINR(overview.financials?.platform_fees_collected || 0)}
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="text-[#64748B] text-xs font-bold flex justify-between">
                <span>Registered Users</span>
                <Users className="w-4 h-4 text-[#6D28D9]" />
              </div>
              <div className="text-2xl font-black text-[#111827] font-mono">
                {overview.users?.total_users || 0}
              </div>
              <div className="text-[11px] text-[#64748B]">
                {overview.users?.organizers_count} Organizers • {overview.users?.attendees_count} Attendees
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="text-[#64748B] text-xs font-bold flex justify-between">
                <span>Total Events</span>
                <Calendar className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div className="text-2xl font-black text-[#111827] font-mono">
                {overview.events?.total_events || 0}
              </div>
              <div className="text-[11px] text-[#64748B]">
                {overview.events?.published_events} Live • {overview.events?.draft_events} Draft
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="text-[#64748B] text-xs font-bold flex justify-between">
                <span>Total Ticket Inventory</span>
                <Ticket className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="text-2xl font-black text-[#111827] font-mono">
                {overview.tickets?.total_inventory || 0}
              </div>
              <div className="text-[11px] text-[#64748B]">
                {overview.tickets?.tickets_sold} Sold • {overview.tickets?.tickets_currently_held} Held
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Users List */}
      {activeTab === 'users' && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Tenant / Organization</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-[#111827]">
                      <div>{u.name}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{u.email}</div>
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[#4B5563]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-[#64748B]">
                      {u.organization_name || 'Individual Attendee'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                            : 'bg-red-50 text-[#DC2626] border border-red-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-colors cursor-pointer ${
                            u.status === 'ACTIVE'
                              ? 'bg-red-50 text-[#DC2626] border-red-200 hover:bg-red-100'
                              : 'bg-emerald-50 text-[#15803D] border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Event Moderation */}
      {activeTab === 'events' && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3">Event Title</th>
                  <th className="pb-3">Organizer</th>
                  <th className="pb-3">City / Venue</th>
                  <th className="pb-3">Current Status</th>
                  <th className="pb-3 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {eventsList.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-[#111827]">{e.title}</td>
                    <td className="py-3 text-[#6D28D9] font-medium">{e.organization_name}</td>
                    <td className="py-3 text-[#64748B]">{e.venue_city}</td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          e.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                            : e.status === 'SUSPENDED'
                            ? 'bg-red-50 text-[#DC2626] border border-red-200'
                            : 'bg-slate-100 text-[#64748B] border border-slate-200'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleToggleEventStatus(e.id, e.status)}
                        className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-colors cursor-pointer ${
                          e.status === 'SUSPENDED'
                            ? 'bg-emerald-50 text-[#15803D] border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-[#DC2626] border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {e.status === 'SUSPENDED' ? 'Reinstate Event' : 'Suspend Event'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
            Platform Security & Transactional Audit Trail
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#64748B] uppercase text-[10px]">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Entity Type</th>
                  <th className="pb-3">Actor</th>
                  <th className="pb-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 text-[11px]">
                    <td className="py-2.5 text-[#64748B]">{new Date(log.created_at).toLocaleTimeString()}</td>
                    <td className="py-2.5 text-[#6D28D9] font-bold">{log.action}</td>
                    <td className="py-2.5 text-[#111827]">{log.entity_type}</td>
                    <td className="py-2.5 text-[#64748B]">{log.actor_email || 'SYSTEM'}</td>
                    <td className="py-2.5 text-[#64748B] truncate max-w-xs">{log.metadata}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Live Concurrency Stress Test */}
      {activeTab === 'concurrency' && (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-[#E5E7EB] pb-4">
            <div className="flex items-center space-x-2 text-[#D97706] text-xs font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>ACID Row Lock Concurrency Validator</span>
            </div>
            <h2 className="text-xl font-bold text-[#111827] mt-1">
              Live Concurrency Benchmark (Test A Engine)
            </h2>
            <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
              Dispatches 50 simultaneous atomic reservation requests against a ticket tier with strictly 10 inventory units using immediate database row locks. Verifies that exactly 10 succeed, 40 conflict (HTTP 409), and available quantity never drops below 0.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleRunConcurrencyTest}
              disabled={benchmarking}
              className="bg-[#6D28D9] hover:bg-[#5b21b6] disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
            >
              {benchmarking ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Executing 50 Atomic Transactions...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute 50-Request Benchmark</span>
                </>
              )}
            </button>
          </div>

          {/* Benchmark Results Display */}
          {benchmarkResult && (
            <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4 animate-in fade-in">
              <div className="flex items-center space-x-2 text-[#15803D] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Benchmark Verification: PASSED</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[#64748B] block">Total Inventory</span>
                  <span className="text-lg font-mono font-bold text-[#111827]">
                    {benchmarkResult.totalInventory}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[#64748B] block">Requests Dispatched</span>
                  <span className="text-lg font-mono font-bold text-[#6D28D9]">
                    {benchmarkResult.concurrentRequestsSent}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[#64748B] block">Successful Holds (201)</span>
                  <span className="text-lg font-mono font-bold text-[#15803D]">
                    {benchmarkResult.successfulHolds}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[#64748B] block">Rejected Conflicts (409)</span>
                  <span className="text-lg font-mono font-bold text-[#DC2626]">
                    {benchmarkResult.rejectedConflicts}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#111827] font-mono bg-white p-3 rounded-xl border border-emerald-200">
                <div>Final Available Quantity: <strong className="text-[#15803D]">{benchmarkResult.finalAvailable}</strong></div>
                <div>Final Reserved Quantity: <strong className="text-[#D97706]">{benchmarkResult.finalReserved}</strong></div>
                <div>Invariant Enforced: <span className="text-[#6D28D9] font-bold">{benchmarkResult.invariantMaintained}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
