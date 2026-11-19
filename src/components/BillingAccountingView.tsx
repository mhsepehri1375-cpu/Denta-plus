import React, { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import type {
  ClinicExpense,
  ClinicState,
  ExpenseCategory,
  Invoice,
  InvoiceItem,
  PettyCashTopUp,
} from '../types/clinic';
import {
  calculateInvoiceTotals,
  computePettyCashSummary,
  EXPENSE_CATEGORIES,
  formatCurrencyToman,
  formatPersianDate,
  toPersianDigits,
} from '../utils/clinicLogic';
import { PaymentGatewayModal } from './PaymentGatewayModal';

interface BillingAccountingViewProps {
  state: ClinicState;
  currentUserName: string;
  preselectedPatientId?: string | null;
  onCreateInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => void;
  onPayInvoice: (invoiceId: string, paidAmount: number, paymentRef: string) => void;
  onSyncAccounting: (invoiceId: string) => void;
  onAddExpense: (expense: Omit<ClinicExpense, 'id'>) => void;
  onSyncExpenseAccounting: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddPettyCashTopUp: (topUp: Omit<PettyCashTopUp, 'id'>) => void;
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
  currentUserName,
  preselectedPatientId,
  onCreateInvoice,
  onPayInvoice,
  onSyncAccounting,
  onAddExpense,
  onSyncExpenseAccounting,
  onDeleteExpense,
  onAddPettyCashTopUp,
}) => {
  const doctors = state.staff.filter((s) => s.isDoctor && s.active);
  const [financeTab, setFinanceTab] = useState<'invoices' | 'purchases' | 'petty_cash'>(
    'invoices'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
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

  // Purchase / Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseSourceMode, setExpenseSourceMode] = useState<'clinic_purchase' | 'petty_cash'>(
    'clinic_purchase'
  );
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('مواد مصرفی دندانپزشکی');
  const [expVendor, setExpVendor] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('2026-11-19');
  const [expPaymentMethod, setExpPaymentMethod] = useState<ClinicExpense['paymentMethod']>(
    'کارت بانکی مطب'
  );
  const [expReceipt, setExpReceipt] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expError, setExpError] = useState('');

  // Petty Cash Top-Up Modal
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('2000000');
  const [topUpDate, setTopUpDate] = useState('2026-11-19');
  const [topUpCustodian, setTopUpCustodian] = useState('مریم کریمی (منشی)');
  const [topUpDesc, setTopUpDesc] = useState('شارژ صندوق تنخواه مطب');
  const [topUpRef, setTopUpRef] = useState('');

  const filteredInvoices = state.invoices.filter((inv) =>
    statusFilter === 'all' ? true : inv.status === statusFilter
  );

  const clinicPurchases = state.expenses.filter((e) => {
    if (e.source !== 'clinic_purchase') return false;
    if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;
    return true;
  });

  const pettyCashExpenses = state.expenses.filter((e) => e.source === 'petty_cash');
  const pettySummary = computePettyCashSummary(state.expenses, state.pettyCashTopUps);

  const totalBilled = state.invoices.reduce(
    (s, inv) =>
      s +
      calculateInvoiceTotals(inv.items, inv.discount, inv.insuranceCoverage, inv.paidAmount)
        .netTotal,
    0
  );
  const totalCollected = state.invoices.reduce((s, inv) => s + inv.paidAmount, 0);
  const netCashFlow = totalCollected - pettySummary.totalAllExpenses;

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
      'نوع سند',
      'شناسه/شماره',
      'تاریخ',
      'شرح / طرف حساب',
      'دسته‌بندی',
      'درآمد وصولی (تومان)',
      'هزینه/خرید (تومان)',
      'وضعیت حسابداری',
    ];
    const invRows = state.invoices.map((inv) => [
      'درآمد بیمار',
      inv.invoiceNumber,
      formatPersianDate(inv.date),
      inv.patientName,
      inv.doctorName,
      String(inv.paidAmount),
      '0',
      inv.accountingSync === 'synced' ? 'ثبت‌شده' : 'در انتظار',
    ]);
    const expRows = state.expenses.map((exp) => [
      exp.source === 'petty_cash' ? 'هزینه تنخواه' : 'خرید مطب',
      exp.receiptNumber || exp.id,
      formatPersianDate(exp.date),
      `${exp.title} - ${exp.vendor}`,
      exp.category,
      '0',
      String(exp.amount),
      exp.accountingSync === 'synced' ? 'ثبت‌شده' : 'در انتظار',
    ]);
    const csv = '\uFEFF' + [header, ...invRows, ...expRows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinic-full-ledger.csv';
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
      date: '2026-11-19',
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

  const openNewExpense = (source: 'clinic_purchase' | 'petty_cash') => {
    setExpenseSourceMode(source);
    setExpTitle('');
    setExpVendor(source === 'petty_cash' ? 'هزینه‌های جاری مطب' : '');
    setExpCategory(
      source === 'petty_cash' ? 'پذیرایی و ملزومات اداری' : 'مواد مصرفی دندانپزشکی'
    );
    setExpAmount('');
    setExpDate('2026-11-19');
    setExpPaymentMethod(source === 'petty_cash' ? 'تنخواه نقدی' : 'کارت بانکی مطب');
    setExpReceipt('');
    setExpNotes('');
    setExpError('');
    setShowExpenseModal(true);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(expAmount);
    if (!expTitle.trim()) {
      setExpError('عنوان خرید یا هزینه را وارد کنید.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setExpError('مبلغ معتبر بیشتر از صفر وارد کنید.');
      return;
    }

    onAddExpense({
      date: expDate,
      title: expTitle.trim(),
      category: expCategory,
      vendor: expVendor.trim() || 'تامین‌کننده مطب',
      amount: numericAmount,
      source: expenseSourceMode,
      paymentMethod: expenseSourceMode === 'petty_cash' ? 'تنخواه نقدی' : expPaymentMethod,
      receiptNumber: expReceipt.trim() || undefined,
      status: 'paid',
      recordedBy: currentUserName,
      accountingSync: 'pending',
      notes: expNotes.trim() || undefined,
    });
    setShowExpenseModal(false);
  };

  const handleCreateTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(topUpAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;
    onAddPettyCashTopUp({
      date: topUpDate,
      amount: numericAmount,
      custodian: topUpCustodian.trim() || currentUserName,
      description: topUpDesc.trim() || 'شارژ تنخواه مطب',
      referenceCode: topUpRef.trim() || `TRN-${Math.floor(10000 + Math.random() * 89999)}`,
    });
    setShowTopUpModal(false);
  };

  // Unified Petty Cash Ledger (sorted newest first)
  const pettyCashLedger = [
    ...state.pettyCashTopUps.map((t) => ({
      id: t.id,
      date: t.date,
      kind: 'topup' as const,
      title: t.description,
      actor: t.custodian,
      ref: t.referenceCode || '—',
      amount: t.amount,
    })),
    ...pettyCashExpenses.map((e) => ({
      id: e.id,
      date: e.date,
      kind: 'expense' as const,
      title: `${e.title} (${e.category})`,
      actor: e.recordedBy,
      ref: e.receiptNumber || '—',
      amount: -e.amount,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      {/* Financial Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">
                مدیریت مالی، فاکتورها، خریدها و تنخواه مطب
              </h2>
              <span className="text-xs text-slate-500">
                · متصل به {state.accountingSoftwareName}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              صدور فاکتور بیماران، ثبت فاکتور خرید مواد و لابراتوار، مدیریت صندوق تنخواه و خروجی یکپارچه حسابداری
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportAccountingCsv}
              className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>خروجی دفتر کل حسابداری (CSV)</span>
            </button>
            {financeTab === 'invoices' && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>صدور فاکتور جدید</span>
              </button>
            )}
            {financeTab === 'purchases' && (
              <button
                type="button"
                onClick={() => openNewExpense('clinic_purchase')}
                className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>ثبت خرید / هزینه مطب</span>
              </button>
            )}
            {financeTab === 'petty_cash' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(true)}
                  className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-amber-100 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors whitespace-nowrap"
                >
                  <Coins className="w-4 h-4 text-amber-800" />
                  <span>شارژ تنخواه</span>
                </button>
                <button
                  type="button"
                  onClick={() => openNewExpense('petty_cash')}
                  className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت هزینه از تنخواه</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">درآمد وصولی از بیماران</div>
            <div className="text-base font-bold text-emerald-700 mt-1 tabular-nums">
              {formatCurrencyToman(totalCollected)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              از کل {formatCurrencyToman(totalBilled)} فاکتورشده
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">خریدها و هزینه‌های مطب</div>
            <div className="text-base font-bold text-rose-700 mt-1 tabular-nums">
              {formatCurrencyToman(pettySummary.clinicPurchasesTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {toPersianDigits(
                state.expenses.filter((e) => e.source === 'clinic_purchase').length
              )}{' '}
              سند خرید ثبت‌شده
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">موجودی صندوق تنخواه</div>
            <div
              className={`text-base font-bold mt-1 tabular-nums ${
                pettySummary.currentBalance >= 0 ? 'text-teal-700' : 'text-red-700'
              }`}
            >
              {formatCurrencyToman(pettySummary.currentBalance)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              هزینه‌شده از تنخواه: {formatCurrencyToman(pettySummary.totalSpent)}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">تراز نقدی خالص (وصولی منهای هزینه‌ها)</div>
            <div
              className={`text-base font-bold mt-1 tabular-nums ${
                netCashFlow >= 0 ? 'text-slate-900' : 'text-red-700'
              }`}
            >
              {formatCurrencyToman(netCashFlow)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              مجموع کل هزینه‌ها: {formatCurrencyToman(pettySummary.totalAllExpenses)}
            </div>
          </div>
        </div>

        {/* Main 3 Finance Tabs */}
        <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFinanceTab('invoices')}
            className={`min-h-9 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              financeTab === 'invoices'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            فاکتورهای بیماران ({toPersianDigits(state.invoices.length)})
          </button>
          <button
            type="button"
            onClick={() => setFinanceTab('purchases')}
            className={`min-h-9 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              financeTab === 'purchases'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            خریدها و هزینه‌ها ({toPersianDigits(
              state.expenses.filter((e) => e.source === 'clinic_purchase').length
            )})
          </button>
          <button
            type="button"
            onClick={() => setFinanceTab('petty_cash')}
            className={`min-h-9 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              financeTab === 'petty_cash'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مدیریت تنخواه مطب
          </button>
        </div>
      </div>

      {/* TAB 1: Patient Invoices */}
      {financeTab === 'invoices' && (
        <div className="space-y-4">
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
                              <span>ارسال سند</span>
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
        </div>
      )}

      {/* TAB 2: Clinic Purchases & Expenses */}
      {financeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="expense-cat-filter" className="text-xs font-medium text-slate-600">
                فیلتر دسته‌بندی:
              </label>
              <select
                id="expense-cat-filter"
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="min-h-9 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
              مجموع خریدهای فیلترشده:{' '}
              <span className="font-bold text-slate-900">
                {formatCurrencyToman(clinicPurchases.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">تاریخ و شماره رسید</th>
                    <th className="py-3 px-4">شرح خرید / هزینه</th>
                    <th className="py-3 px-4">دسته‌بندی</th>
                    <th className="py-3 px-4">فروشنده / تامین‌کننده</th>
                    <th className="py-3 px-4">مبلغ</th>
                    <th className="py-3 px-4">حسابداری</th>
                    <th className="py-3 px-4">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {clinicPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 text-sm">
                        هنوز خریدی در این دسته‌بندی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    clinicPurchases.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-xs font-semibold text-slate-900 tabular-nums">
                            {formatPersianDate(exp.date)}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {exp.receiptNumber || 'بدون شماره'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-sm">{exp.title}</div>
                          <div className="text-xs text-slate-500">
                            ثبت توسط {exp.recordedBy} · {exp.paymentMethod}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                          {exp.category}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">{exp.vendor}</td>
                        <td className="py-3 px-4 font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                          {formatCurrencyToman(exp.amount)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {exp.accountingSync === 'synced' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {exp.accountingVoucherCode}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSyncExpenseAccounting(exp.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>ثبت سند</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(exp.id)}
                            aria-label={`حذف هزینه ${exp.title}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Petty Cash Management */}
      {financeTab === 'petty_cash' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>کل مبلغ شارژشده به تنخواه</span>
                <Coins className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2 tabular-nums">
                {formatCurrencyToman(pettySummary.totalTopUps)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>کل هزینه‌های پرداخت‌شده از تنخواه</span>
                <ShoppingBag className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-bold text-rose-700 mt-2 tabular-nums">
                {formatCurrencyToman(pettySummary.totalSpent)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>موجودی فعلی صندوق تنخواه</span>
                <Wallet className="w-4 h-4 text-teal-600" />
              </div>
              <div
                className={`text-xl font-bold mt-2 tabular-nums ${
                  pettySummary.currentBalance >= 0 ? 'text-teal-700' : 'text-red-700'
                }`}
              >
                {formatCurrencyToman(pettySummary.currentBalance)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                دفتر گردش تنخواه مطب (شارژها و هزینه‌های روزمره)
              </h3>
              <span className="text-xs text-slate-500 tabular-nums">
                {toPersianDigits(pettyCashLedger.length)} تراکنش
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">تاریخ</th>
                    <th className="py-3 px-4">نوع تراکنش</th>
                    <th className="py-3 px-4">شرح</th>
                    <th className="py-3 px-4">مسئول / ثبت‌کننده</th>
                    <th className="py-3 px-4">شماره رسید / مرجع</th>
                    <th className="py-3 px-4">مبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pettyCashLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-xs tabular-nums whitespace-nowrap">
                        {formatPersianDate(row.date)}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span
                          className={
                            row.kind === 'topup'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-rose-700 font-semibold'
                          }
                        >
                          {row.kind === 'topup' ? 'شارژ صندوق تنخواه' : 'برداشت / هزینه تنخواه'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 text-xs">{row.title}</td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {row.actor}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {row.ref}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono tabular-nums font-bold whitespace-nowrap ${
                          row.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {row.amount >= 0 ? '+' : ''}
                        {formatCurrencyToman(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                        className="w-full min-h-9 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min={0}
                        step={1}
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

      {/* New Purchase / Petty Cash Expense Modal */}
      {showExpenseModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ثبت خرید یا هزینه مطب"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {expenseSourceMode === 'petty_cash'
                  ? 'ثبت هزینه جدید از محل تنخواه مطب'
                  : 'ثبت فاکتور خرید / هزینه کلینیک'}
              </h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                aria-label="بستن فرم هزینه"
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-3.5">
              {expError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {expError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  عنوان خرید یا هزینه
                </label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="مثال: خرید کارپول بی‌حسی و رول اتوکلاو"
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">دسته‌بندی</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    مبلغ (تومان)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1}
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="1500000"
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    فروشنده / محل خرید
                  </label>
                  <input
                    type="text"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    placeholder="نام شرکت تجهیزات یا فروشگاه"
                    className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">تاریخ</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">روش پرداخت</label>
                  {expenseSourceMode === 'petty_cash' ? (
                    <input
                      type="text"
                      disabled
                      value="تنخواه نقدی"
                      className="w-full min-h-10 px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg"
                    />
                  ) : (
                    <select
                      value={expPaymentMethod}
                      onChange={(e) =>
                        setExpPaymentMethod(e.target.value as ClinicExpense['paymentMethod'])
                      }
                      className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="کارت بانکی مطب">کارت بانکی مطب</option>
                      <option value="انتقال حساب">انتقال حساب</option>
                      <option value="چک">چک</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    شماره فاکتور / رسید
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={expReceipt}
                    onChange={(e) => setExpReceipt(e.target.value)}
                    placeholder="PUR-405-..."
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">توضیحات</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="اختیاری..."
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                >
                  ثبت در دفتر مالی مطب
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="min-h-10 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Petty Cash Top-Up Modal */}
      {showTopUpModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="شارژ تنخواه مطب"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">شارژ صندوق تنخواه مطب</h3>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                aria-label="بستن"
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTopUp} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  مبلغ شارژ (تومان)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={1}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">تاریخ</label>
                  <input
                    type="date"
                    required
                    value={topUpDate}
                    onChange={(e) => setTopUpDate(e.target.value)}
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">کد پیگیری</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={topUpRef}
                    onChange={(e) => setTopUpRef(e.target.value)}
                    placeholder="اختیاری"
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  تحویل‌گیرنده / مسئول تنخواه
                </label>
                <input
                  type="text"
                  required
                  value={topUpCustodian}
                  onChange={(e) => setTopUpCustodian(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">شرح شارژ</label>
                <input
                  type="text"
                  value={topUpDesc}
                  onChange={(e) => setTopUpDesc(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                >
                  ثبت شارژ تنخواه
                </button>
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
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
