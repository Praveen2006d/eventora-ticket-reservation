/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ReservationHold, User } from '../types.ts';
import { HoldCountdown } from '../components/HoldCountdown.tsx';
import { api } from '../api.ts';
import { formatINR, formatIndianDate } from '../utils/formatters.ts';
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Lock,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Building,
  Smartphone,
  Info,
} from 'lucide-react';

interface CheckoutViewProps {
  hold: ReservationHold;
  user: User;
  onPaymentCompleted: (result: any) => void;
  onHoldExpired: () => void;
  onReleaseHold: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  hold,
  user,
  onPaymentCompleted,
  onHoldExpired,
  onReleaseHold,
}) => {
  const [outcomeSimulation, setOutcomeSimulation] = useState<'APPROVE' | 'DECLINE' | 'TIMEOUT'>('APPROVE');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('praveen@okaxis');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'GPAY' | 'PHONEPE' | 'PAYTM' | 'BHIM'>('GPAY');
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setPaymentError(null);
    setProcessingStep('Initializing UPI & banking order with idempotency guard...');

    try {
      const idempotencyKey = `pay-client-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // 1. Submit checkout request
      const checkoutRes = await api.checkout({
        reservationId: hold.reservationId,
        outcomeSimulation,
        idempotencyKey,
      });

      setProcessingStep('Simulating Indian banking gateway round-trip authorization...');

      // 2. Poll payment status until finalized or timeout
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const status = await api.getPaymentStatus(checkoutRes.transactionId);

          if (status.paymentStatus === 'APPROVED' && status.status === 'CONFIRMED') {
            clearInterval(pollInterval);
            setProcessing(false);
            onPaymentCompleted(status);
          } else if (status.paymentStatus === 'DECLINED') {
            clearInterval(pollInterval);
            setProcessing(false);
            setPaymentError(status.failureReason || 'Simulated Indian bank declined the authorization. Check your UPI limit.');
          } else if (status.paymentStatus === 'TIMED_OUT') {
            clearInterval(pollInterval);
            setProcessing(false);
            setPaymentError('Simulated banking gateway timed out. Inventory has been returned safely.');
          } else if (attempts >= 8) {
            clearInterval(pollInterval);
            setProcessing(false);
            setPaymentError('Payment processing exceeded polling threshold. Please inspect order status.');
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          setProcessing(false);
          setPaymentError(err.message || 'Error checking payment status.');
        }
      }, 800);
    } catch (err: any) {
      setProcessing(false);
      setPaymentError(err.message || 'Checkout failed.');
    }
  };

  // 18% GST calculation on platform convenience fee
  const gstOnFee = Math.round(hold.fees * 0.18);
  const convenienceFeeExGst = Math.max(0, hold.fees - gstOnFee);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 bg-white">
      {/* 10-Minute Hold Header */}
      <HoldCountdown
        expiresAt={hold.expiresAt}
        onExpired={onHoldExpired}
        onRelease={onReleaseHold}
      />

      {/* Demo Gateway Disclaimer Notice */}
      <div className="bg-[#FFFDF8] border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-[#172033]">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-[#EA580C] shrink-0" />
          <span className="font-semibold">
            <strong>Demo Payment Gateway</strong> — No real money will be charged. Choose an outcome to test the asynchronous pipeline.
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold text-[#EA580C] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
          Test Mode
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Payment Form & Simulation Selectors */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleCheckoutSubmit}
            className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6"
          >
            <div>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black text-[#172033]">
                  Payment & Checkout
                </h1>
                <span className="text-xs text-[#15803D] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 256-bit Encrypted
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Choose your preferred Indian payment method to complete instant ticket issuance.
              </p>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#F8FAFC] rounded-2xl border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'bg-white text-[#6D28D9] shadow-xs border border-purple-200'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#6D28D9]" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === 'CARD'
                    ? 'bg-white text-[#6D28D9] shadow-xs border border-purple-200'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#8B5CF6]" />
                <span>RuPay / Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('NETBANKING')}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === 'NETBANKING'
                    ? 'bg-white text-[#6D28D9] shadow-xs border border-purple-200'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                <Building className="w-4 h-4 text-[#15803D]" />
                <span>NetBanking</span>
              </button>
            </div>

            {/* Simulated UPI Details */}
            {paymentMethod === 'UPI' && (
              <div className="bg-[#FFFDF8] border border-[#E5E7EB] rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#172033]">
                  <span>Instant UPI Autopay / Transfer</span>
                  <span className="text-[#6D28D9] text-[11px] font-bold">Zero Transaction Surcharge</span>
                </div>

                {/* Popular Indian UPI App Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUpiApp('GPAY');
                      setUpiId('praveen@okaxis');
                    }}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      selectedUpiApp === 'GPAY'
                        ? 'bg-white text-[#6D28D9] border-[#6D28D9] shadow-2xs'
                        : 'bg-white border-[#E5E7EB] text-[#64748B]'
                    }`}
                  >
                    Google Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUpiApp('PHONEPE');
                      setUpiId('praveen@ybl');
                    }}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      selectedUpiApp === 'PHONEPE'
                        ? 'bg-white text-[#6D28D9] border-[#6D28D9] shadow-2xs'
                        : 'bg-white border-[#E5E7EB] text-[#64748B]'
                    }`}
                  >
                    PhonePe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUpiApp('PAYTM');
                      setUpiId('praveen@paytm');
                    }}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      selectedUpiApp === 'PAYTM'
                        ? 'bg-white text-[#6D28D9] border-[#6D28D9] shadow-2xs'
                        : 'bg-white border-[#E5E7EB] text-[#64748B]'
                    }`}
                  >
                    Paytm UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUpiApp('BHIM');
                      setUpiId('praveen@upi');
                    }}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      selectedUpiApp === 'BHIM'
                        ? 'bg-white text-[#6D28D9] border-[#6D28D9] shadow-2xs'
                        : 'bg-white border-[#E5E7EB] text-[#64748B]'
                    }`}
                  >
                    BHIM UPI
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] block uppercase">
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#172033] font-mono focus:outline-none focus:border-[#6D28D9]"
                      placeholder="e.g. praveen@okaxis"
                    />
                    <span className="text-xs text-[#15803D] font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B]">
                    Payment notification request will be sent to your UPI app.
                  </p>
                </div>
              </div>
            )}

            {/* Simulated RuPay / Debit Card Details */}
            {paymentMethod === 'CARD' && (
              <div className="space-y-3 bg-[#FFFDF8] border border-[#E5E7EB] rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#172033]">
                  <span>Debit / Credit Card</span>
                  <span className="text-[#6D28D9] text-[11px]">RuPay • Visa • Mastercard</span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#64748B] block mb-1 uppercase">Card Number</label>
                  <input
                    type="text"
                    defaultValue="6073 •••• •••• 9924 (RuPay Platinum)"
                    disabled
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#172033] font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] block mb-1 uppercase">Valid Thru</label>
                    <input
                      type="text"
                      defaultValue="08/29"
                      disabled
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#172033] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] block mb-1 uppercase">CVV</label>
                    <input
                      type="text"
                      defaultValue="•••"
                      disabled
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#172033] font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Simulated Indian NetBanking Details */}
            {paymentMethod === 'NETBANKING' && (
              <div className="bg-[#FFFDF8] border border-[#E5E7EB] rounded-2xl p-4 text-xs space-y-2">
                <span className="text-[11px] font-bold text-[#64748B] uppercase block">Select Simulated Indian Bank</span>
                <select className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none font-semibold">
                  <option>HDFC Bank Retail NetBanking</option>
                  <option>State Bank of India (SBI)</option>
                  <option>ICICI Bank Infinity</option>
                  <option>Axis Bank Internet Banking</option>
                  <option>Kotak Mahindra Bank</option>
                  <option>Canara Bank</option>
                </select>
              </div>
            )}

            {/* Deterministic Outcome Simulator Box */}
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#172033]">
                  <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span>Test Outcome Simulator</span>
                </div>
                <span className="text-[10px] text-[#64748B] font-medium">Asynchronous Mock Banking Gateway</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOutcomeSimulation('APPROVE')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    outcomeSimulation === 'APPROVE'
                      ? 'bg-emerald-50 text-[#15803D] border border-emerald-300 shadow-2xs'
                      : 'bg-white border border-[#E5E7EB] text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  ✓ Approve
                </button>

                <button
                  type="button"
                  onClick={() => setOutcomeSimulation('DECLINE')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    outcomeSimulation === 'DECLINE'
                      ? 'bg-red-50 text-[#DC2626] border border-red-300 shadow-2xs'
                      : 'bg-white border border-[#E5E7EB] text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  ✗ Decline
                </button>

                <button
                  type="button"
                  onClick={() => setOutcomeSimulation('TIMEOUT')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    outcomeSimulation === 'TIMEOUT'
                      ? 'bg-amber-50 text-[#D97706] border border-amber-300 shadow-2xs'
                      : 'bg-white border border-[#E5E7EB] text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  ⏱ Timeout
                </button>
              </div>
            </div>

            {/* Error Message Alert */}
            {paymentError && (
              <div className="bg-red-50 border border-red-200 text-[#DC2626] p-4 rounded-2xl text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Payment Unsuccessful</span>
                </div>
                <p className="text-[11px] text-[#DC2626]/90 pl-6 leading-relaxed">
                  {paymentError}
                </p>
              </div>
            )}

            {/* Processing State Indicator */}
            {processing && (
              <div className="bg-purple-50 border border-purple-200 text-[#6D28D9] p-4 rounded-2xl text-xs space-y-2 text-center">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#6D28D9]" />
                <div className="font-bold">Contacting Bank Gateway & NPCI...</div>
                <div className="text-[11px] text-[#64748B]">{processingStep}</div>
              </div>
            )}

            {/* Submit Pay Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-[#6D28D9] hover:bg-[#5b21b6] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm shadow-md shadow-purple-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>
                {processing ? 'Processing Payment...' : `Authorize & Pay ${formatINR(hold.totalAmount)}`}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-[#172033] border-b border-[#E5E7EB] pb-3">
              Order Summary
            </h2>

            {/* Event Header Snippet */}
            <div className="flex items-center space-x-3">
              <img
                src={hold.event.posterUrl}
                alt={hold.event.title}
                className="w-14 h-14 rounded-xl object-cover border border-[#E5E7EB]"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-[#172033] truncate">
                  {hold.event.title}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {formatIndianDate(hold.event.startAt)}
                </p>
              </div>
            </div>

            {/* Reserved Items List */}
            <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
              {hold.items.map((item) => (
                <div key={item.ticketTierId} className="flex justify-between text-xs">
                  <div className="text-[#172033]">
                    <span className="font-semibold">{item.tierName}</span>
                    <span className="text-[#64748B] text-[11px] ml-1.5">× {item.quantity}</span>
                  </div>
                  <span className="font-bold text-[#172033]">
                    {formatINR(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Itemized Fee Breakdown in INR with GST */}
            <div className="pt-3 border-t border-[#E5E7EB] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#64748B]">
                <span>Tickets Subtotal</span>
                <span className="text-[#172033] font-semibold">{formatINR(hold.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Convenience Fee</span>
                <span className="text-[#172033] font-semibold">{formatINR(convenienceFeeExGst)}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Integrated GST (18%)</span>
                <span className="text-[#172033] font-semibold">{formatINR(gstOnFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#172033] pt-2 border-t border-[#E5E7EB]">
                <span>Grand Total (INR)</span>
                <span className="text-[#6D28D9] text-base">{formatINR(hold.totalAmount)}</span>
              </div>
            </div>

            {/* Attendee Info Card */}
            <div className="bg-[#FFFDF8] border border-[#E5E7EB] rounded-2xl p-3 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">Ticket Holder Details</span>
              <div className="font-bold text-[#172033]">{user.name}</div>
              <div className="text-[#64748B] text-[11px] truncate">{user.email}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
