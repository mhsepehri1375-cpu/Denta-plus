import React, { useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import type { Invoice } from '../types/clinic';
import {
  calculateInvoiceTotals,
  formatCurrencyToman,
  toPersianDigits,
} from '../utils/clinicLogic';

interface PaymentGatewayModalProps {
  invoice: Invoice;
  clinicName: string;
  onClose: () => void;
  onPaymentSuccess: (invoiceId: string, paidAmount: number, paymentRef: string) => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  invoice,
  clinicName,
  onClose,
  onPaymentSuccess,
}) => {
  const totals = calculateInvoiceTotals(
    invoice.items,
    invoice.discount,
    invoice.insuranceCoverage,
    invoice.paidAmount
  );

  const [payAmount, setPayAmount] = useState<string>(String(totals.remaining));
  const [cardNumber, setCardNumber] = useState('6037-9975-4120-8834');
  const [cvv2, setCvv2] = useState('418');
  const [expMonth, setExpMonth] = useState('11');
  const [expYear, setExpYear] = useState('07');
  const [pin, setPin] = useState('849201');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPay = Number(payAmount);
    if (!Number.isFinite(numericPay) || numericPay <= 0) {
      setError('مبلغ پرداختی باید بیشتر از صفر باشد.');
      return;
    }
    if (numericPay > totals.remaining) {
      setError('مبلغ پرداختی نمی‌تواند از مانده بدهی بیشتر باشد.');
      return;
    }
    if (cardNumber.replace(/\D/g, '').length < 16) {
      setError('شماره کارت ۱۶ رقمی معتبر وارد کنید.');
      return;
    }
    if (cvv2.trim().length < 3 || pin.trim().length < 4) {
      setError('کد CVV2 و رمز دوم را بررسی کنید.');
      return;
    }

    setError('');
    setProcessing(true);
    setTimeout(() => {
      const refCode = `SHP-${Math.floor(1000000 + Math.random() * 8999999)}`;
      setProcessing(false);
      setSuccessRef(refCode);
      onPaymentSuccess(invoice.id, numericPay, refCode);
    }, 450);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="درگاه پرداخت مستقیم بانکی"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
        {/* Gateway Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-semibold">درگاه پرداخت مستقیم شاپرک</h3>
              <p className="text-xs text-slate-300 mt-0.5">{clinicName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن درگاه پرداخت"
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successRef ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">پرداخت با موفقیت انجام شد</h4>
              <p className="text-sm text-slate-600 mt-1">
                تراکنش در پرونده مالی بیمار و سیستم حسابداری کلینیک ثبت گردید.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-2 text-right">
              <div className="flex justify-between">
                <span className="text-slate-500">شماره فاکتور:</span>
                <span className="font-mono tabular-nums font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">نام بیمار:</span>
                <span className="font-medium">{invoice.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مبلغ پرداخت‌شده:</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  {formatCurrencyToman(Number(payAmount))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">کد پیگیری بانکی:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {successRef}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-11 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              بازگشت به سامانه
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs text-slate-500">
                  فاکتور <span className="font-mono">{invoice.invoiceNumber}</span> ·{' '}
                  {invoice.patientName}
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                  مانده قابل پرداخت: {formatCurrencyToman(totals.remaining)}
                </div>
              </div>
              <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-2.5 py-1">
                تسویه مستقیم
              </span>
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                مبلغ پرداختی (تومان)
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                min={1000}
                max={totals.remaining}
                className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                شماره کارت بانکی (۱۶ رقم)
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 pl-10 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                />
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">CVV2</label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={4}
                  value={cvv2}
                  onChange={(e) => setCvv2(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ماه انقضا</label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={2}
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">سال انقضا</label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={2}
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                رمز اینترنتی (پویا)
              </label>
              <input
                type="password"
                dir="ltr"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={processing}
                className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {processing
                    ? 'در حال ارتباط با شبکه بانکی...'
                    : `پرداخت ${toPersianDigits(
                        new Intl.NumberFormat('en-US').format(Number(payAmount) || 0)
                      )} تومان`}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
