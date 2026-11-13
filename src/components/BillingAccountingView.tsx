import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type { ClinicState, Invoice, InvoiceItem } from '../types/clinic';
import {
  calculateInvoiceTotals,
  formatCurrencyToman,
  formatPersianDate,
  toPersianDigits,
} from '../utils/clinicLogic';
import { PaymentGatewayModal } from './PaymentGatewayModal';

interface BillingAccountingViewProps {
  state: ClinicState;
  preselectedPatientId?: string | null;
  onCreateInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => void;
  onPayInvoice: (invoiceId: string, paidAmount: number, paymentRef: string) => void;
  onSyncAccounting: (invoiceId: string) => void;
}

const SERVICE_PRESETS = [
  { title: 'معاینه تخصصی و طرح درمان', price: 650000 },
  { title: 'ترمیم کامپوزیت زیبایی', price: 3200000 },
  { title: 'عصب‌کشی ۳ کانال', price: 6800000 },
  { title: 'جرم‌گیری و برساژ دو فک', price: 1950000 },
  { title: 'روکش تمام سرامیک زیرکونیا', price: 8500000 },
  { title: 'کاشت فیکسچر ایمپلنت', price: 18500000 },
];

export const BillingAccountingView: React.FC<BillingAccountingViewProps> = ({
  state,
  preselectedPatientId,
  onCreateInvoice,
  onPayInvoice,
  onSyncAccounting,
}) => {
  const doctors = state.staff.filter((s) => s.isDoctor && s.active);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(Boolean(preselectedPatientId));

  // New Invoice Builder
  const [patientId, setPatientId] = useState(
    preselectedPatientId || state.patients[0]?.id || ''
  );
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 'new-1', title: 'ترمیم کامپوزیت زیبایی', tooth: '36', quantity: 1, unitPrice: 3200000 },
  ]);
  const [discount, setDiscount] = useState('0');
  const [insurance, setInsurance] = useState('0');
  const [notes, setNotes] = useState('');

  const filteredInvoices = state.invoices.filter((inv) =>
    statusFilter === 'all' ? true : inv.status === statusFilter
  );

  const totalBilled = state.invoices.reduce(
    (s, inv) =>
      s +
      calculateInvoiceTotals(inv.items, inv.discount, inv.insuranceCoverage, inv.paidAmount)
        .netTotal,
    0
  );
  const totalCollected = state.invoices.reduce((s, inv) => s + inv.paidAmount, 0);
  const pendingAccountingCount = state.invoices.filter(
    (i) => i.accountingSync === 'pending'
  ).length;

  const draftTotals = calculateInvoiceTotals(
    items,
    Number(discount) || 0,
    Number(insurance) || 0,
    0
  );

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `it-${Date.now()}`,
        title: SERVICE_PRESETS[0].title,
        tooth: '',
        quantity: 1,
        unitPrice: SERVICE_PRESETS[0].price,
      },
    ]);
  };

  const handleExportAccountingCsv = () => {
    const header = [
      'شماره فاکتور',
      'تاریخ',
      'کد بیمار',
      'نام بیمار',
      'پزشک',
      'مبلغ خالص (تومان)',
      'پرداخت شده',
      'وضعیت حسابداری',
      'کد سند حسابداری',
    ];
    const rows = state.invoices.map((inv) => {
      const t = calculateInvoiceTotals(
        inv.items,
        inv.discount,
        inv.insuranceCoverage,
        inv.paidAmount
      );
      return [
        inv.invoiceNumber,
        formatPersianDate(inv.date),
        inv.patientCode,
        inv.patientName,
        inv.doctorName,
        String(t.netTotal),
        String(inv.paidAmount),
        inv.accountingSync === 'synced' ? 'ثبت‌شده در حسابداری' : 'در انتظار ثبت',
        inv.accountingVoucherCode ?? '-',
      ];
    });
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinic-accounting-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = state.patients.find((p) => p.id === patientId);
    const doc = doctors.find((d) => d.id === doctorId);
    if (!pat || !doc || items.length === 0) return;

    onCreateInvoice({
      patientId: pat.id,
      patientName: pat.fullName,
      patientCode: pat.patientCode,
      doctorId: doc.id,
      doctorName: doc.name,
      date: '2026-11-13',
      items,
      discount: Number(discount) || 0,
      insuranceCoverage: Number(insurance) || 0,
      paidAmount: 0,
      status: 'unpaid',
      accountingSync: 'pending',
      notes: notes.trim() || undefined,
    });
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Accounting Integration Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              حسابداری یکپارچه و صدور فاکتور آنلاین
            </h2>
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
              متصل به {state.accountingSoftwareName}
            </span>
          </div>
          <p className="text-xs text-slate-500 tabular-nums">
            کل صورت‌حساب‌ها: {formatCurrencyToman(totalBilled)} · وصولی قطعی:{' '}
            {formatCurrencyToman(totalCollected)} · اسناد منتظر ارسال به حسابداری:{' '}
            {toPersianDigits(pendingAccountingCount)} فقره
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportAccountingCsv}
            className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>خروجی اکسل حسابداری (CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>صدور فاکتور جدید</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {(
          [
            ['all', 'همه فاکتورها'],
            ['unpaid', 'پرداخت‌نشده'],
            ['partial', 'پرداخت ناقص'],
            ['paid', 'تسویه‌شده'],
          ] as const
        ).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setStatusFilter(val)}
            className={`min-h-9 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              statusFilter === val
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">شماره و تاریخ</th>
                <th className="py-3 px-4">بیمار</th>
                <th className="py-3 px-4">اقلام درمانی</th>
                <th className="py-3 px-4">مبلغ قابل پرداخت</th>
                <th className="py-3 px-4">وضعیت پرداخت</th>
                <th className="py-3 px-4">حسابداری</th>
                <th className="py-3 px-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredInvoices.map((inv) => {
                const t = calculateInvoiceTotals(
                  inv.items,
                  inv.discount,
                  inv.insuranceCoverage,
                  inv.paidAmount
                );
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono tabular-nums font-semibold text-slate-900">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {formatPersianDate(inv.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.patientName}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {inv.patientCode} · {inv.doctorName}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                      {inv.items.map((it) => it.title).join('، ')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                      <div className="font-bold text-slate-900">
                        {formatCurrencyToman(t.netTotal)}
                      </div>
                      {t.remaining > 0 && (
                        <div className="text-xs text-amber-700">
                          مانده: {formatCurrencyToman(t.remaining)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {inv.status === 'paid' ? (
                        <div className="text-xs text-emerald-700 font-medium">
                          تسویه کامل
                          {inv.paymentRef && (
                            <div className="font-mono text-[11px] text-slate-500">
                              {inv.paymentRef}
                            </div>
                          )}
                        </div>
                      ) : inv.status === 'partial' ? (
                        <span className="text-xs text-amber-700 font-medium">پرداخت جزئی</span>
                      ) : (
                        <span className="text-xs text-red-700 font-medium">در انتظار پرداخت</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {inv.accountingSync === 'synced' ? (
                        <div className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="font-mono">{inv.accountingVoucherCode}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSyncAccounting(inv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>ارسال سند به حسابداری</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {t.remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayingInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>درگاه پرداخت</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPrintingInvoice(inv)}
                          aria-label={`مشاهده و چاپ فاکتور ${inv.invoiceNumber}`}
                          className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="صدور فاکتور آنلاین"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-slate-900">صدور فاکتور آنلاین جدید</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="بستن فرم فاکتور"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">بیمار</label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {state.patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.patientCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">پزشک معالج</label>
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">ردیف‌های خدمات درمانی</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن ردیف</span>
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  >
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        list="dental-services-list"
                        value={item.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          const preset = SERVICE_PRESETS.find((s) => s.title === val);
                          setItems((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, title: val, unitPrice: preset ? preset.price : x.unitPrice }
                                : x
                            )
                          );
                        }}
                        placeholder="شرح خدمت"
                        className="w-full min-h-9 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={item.tooth || ''}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, tooth: e.target.value } : x))
                          )
                        }
                        placeholder="دندان"
                        className="w-full min-h-9 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, quantity: Number(e.target.value) || 1 } : x
                            )
                          )
                        }
                        className="w-full min-h-9 px-2 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min={0}
                        step={50000}
                        value={item.unitPrice}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, unitPrice: Number(e.target.value) || 0 } : x
                            )
                          )
                        }
                        className="w-full min-h-9 px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label="حذف ردیف"
                          className="p-1.5 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <datalist id="dental-services-list">
                  {SERVICE_PRESETS.map((s) => (
                    <option key={s.title} value={s.title} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    تخفیف کلینیک (تومان)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    سهم بیمه تکمیلی (تومان)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات فاکتور..."
                className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">مبلغ خالص قابل پرداخت بیمار:</span>
                <span className="text-lg font-bold text-teal-700 tabular-nums">
                  {formatCurrencyToman(draftTotals.netTotal)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                >
                  صدور و ثبت فاکتور آنلاین
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-10 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice View */}
      {printingInvoice && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="پیش‌نمایش فاکتور"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{state.clinicName}</h3>
                <p className="text-xs text-slate-500 mt-1">{state.clinicAddress}</p>
              </div>
              <div className="text-left font-mono text-xs tabular-nums">
                <div className="font-bold text-slate-900">{printingInvoice.invoiceNumber}</div>
                <div className="text-slate-500 mt-0.5">{formatPersianDate(printingInvoice.date)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-lg p-3">
              <div>
                <span className="text-slate-500">بیمار: </span>
                <span className="font-semibold text-slate-900">{printingInvoice.patientName}</span>
              </div>
              <div>
                <span className="text-slate-500">کد پرونده: </span>
                <span className="font-mono font-semibold">{printingInvoice.patientCode}</span>
              </div>
              <div>
                <span className="text-slate-500">پزشک معالج: </span>
                <span className="font-medium">{printingInvoice.doctorName}</span>
              </div>
              <div>
                <span className="text-slate-500">کد پیگیری بانکی: </span>
                <span className="font-mono">{printingInvoice.paymentRef ?? '—'}</span>
              </div>
            </div>

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 text-right">شرح خدمت</th>
                  <th className="py-2 text-center">تعداد</th>
                  <th className="py-2 text-left">جمع (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {printingInvoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2.5 text-slate-800">
                      {it.title} {it.tooth ? `(دندان ${toPersianDigits(it.tooth)})` : ''}
                    </td>
                    <td className="py-2.5 text-center tabular-nums">{toPersianDigits(it.quantity)}</td>
                    <td className="py-2.5 text-left font-mono tabular-nums">
                      {formatCurrencyToman(it.quantity * it.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(() => {
              const t = calculateInvoiceTotals(
                printingInvoice.items,
                printingInvoice.discount,
                printingInvoice.insuranceCoverage,
                printingInvoice.paidAmount
              );
              return (
                <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs tabular-nums">
                  <div className="flex justify-between text-slate-600">
                    <span>تخفیف و سهم بیمه:</span>
                    <span>
                      {formatCurrencyToman(
                        printingInvoice.discount + printingInvoice.insuranceCoverage
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900">
                    <span>مبلغ قابل پرداخت:</span>
                    <span>{formatCurrencyToman(t.netTotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>پرداخت‌شده:</span>
                    <span>{formatCurrencyToman(printingInvoice.paidAmount)}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-2 no-print pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 min-h-10 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ فاکتور</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintingInvoice(null)}
                className="min-h-10 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {payingInvoice && (
        <PaymentGatewayModal
          invoice={payingInvoice}
          clinicName={state.clinicName}
          onClose={() => setPayingInvoice(null)}
          onPaymentSuccess={onPayInvoice}
        />
      )}
    </div>
  );
};
