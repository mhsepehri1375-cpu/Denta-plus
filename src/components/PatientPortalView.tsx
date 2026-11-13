import React, { useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  MessageSquarePlus,
  Search,
} from 'lucide-react';
import type { ClinicState, Invoice } from '../types/clinic';
import {
  calculateInvoiceTotals,
  DEFAULT_CLINIC_SLOTS,
  formatCurrencyToman,
  formatPersianDate,
  getAvailableSlots,
  normalizeDigits,
  toPersianDigits,
} from '../utils/clinicLogic';
import { DOCTOR_AVATARS } from '../utils/mediaAssets';
import { PaymentGatewayModal } from './PaymentGatewayModal';

interface PatientPortalViewProps {
  state: ClinicState;
  onOnlineBooking: (data: {
    doctorId: string;
    date: string;
    time: string;
    service: string;
    patientName: string;
    phone: string;
    nationalId: string;
  }) => { bookingCode: string };
  onPayInvoice: (invoiceId: string, paidAmount: number, paymentRef: string) => void;
  onStartConsultation: (data: {
    patientName: string;
    patientPhone: string;
    doctorId: string;
    subject: string;
    message: string;
  }) => void;
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({
  state,
  onOnlineBooking,
  onPayInvoice,
  onStartConsultation,
}) => {
  const doctors = state.staff.filter((s) => s.isDoctor && s.active);
  const [portalTab, setPortalTab] = useState<'booking' | 'payment' | 'consult'>('booking');

  // Booking State
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id ?? '');
  const [bookDate, setBookDate] = useState('2026-11-14');
  const [bookTime, setBookTime] = useState('09:30');
  const [bookService, setBookService] = useState('معاینه و مشاوره تخصصی');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientNationalId, setPatientNationalId] = useState('');
  const [bookingConfirmedCode, setBookingConfirmedCode] = useState<string | null>(null);

  // Payment Lookup State
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  // Consultation State
  const [conName, setConName] = useState('');
  const [conPhone, setConPhone] = useState('');
  const [conDoctorId, setConDoctorId] = useState(doctors[0]?.id ?? '');
  const [conSubject, setConSubject] = useState('');
  const [conMessage, setConMessage] = useState('');
  const [conSent, setConSent] = useState(false);

  const openSlots = getAvailableSlots(
    state.appointments,
    selectedDoctorId,
    bookDate,
    DEFAULT_CLINIC_SLOTS
  );

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !bookTime || !patientName.trim() || !patientPhone.trim()) return;
    const res = onOnlineBooking({
      doctorId: selectedDoctorId,
      date: bookDate,
      time: bookTime,
      service: bookService,
      patientName: patientName.trim(),
      phone: patientPhone.trim(),
      nationalId: patientNationalId.trim() || '0000000000',
    });
    setBookingConfirmedCode(res.bookingCode);
  };

  const unpaidInvoices = state.invoices.filter((inv) => {
    const t = calculateInvoiceTotals(
      inv.items,
      inv.discount,
      inv.insuranceCoverage,
      inv.paidAmount
    );
    if (t.remaining <= 0) return false;
    const q = normalizeDigits(invoiceSearch.trim().toLowerCase());
    if (!q) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.patientCode.toLowerCase().includes(q) ||
      inv.patientName.toLowerCase().includes(q)
    );
  });

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conName.trim() || !conPhone.trim() || !conMessage.trim()) return;
    onStartConsultation({
      patientName: conName.trim(),
      patientPhone: conPhone.trim(),
      doctorId: conDoctorId,
      subject: conSubject.trim() || 'درخواست مشاوره آنلاین پیش از درمان',
      message: conMessage.trim(),
    });
    setConSent(true);
    setConName('');
    setConPhone('');
    setConSubject('');
    setConMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Portal Hero / Mode Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            پورتال آنلاین مراجعین {state.clinicName}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            انتخاب دندانپزشک و رزرو نوبت آنلاین · تسویه مستقیم فاکتور · مشاوره آنلاین پیش از درمان
          </p>
        </div>

        <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setPortalTab('booking')}
            className={`min-h-9 px-2 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              portalTab === 'booking'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            رزرو نوبت آنلاین
          </button>
          <button
            type="button"
            onClick={() => setPortalTab('payment')}
            className={`min-h-9 px-2 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              portalTab === 'payment'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            پرداخت فاکتور ({toPersianDigits(unpaidInvoices.length)})
          </button>
          <button
            type="button"
            onClick={() => setPortalTab('consult')}
            className={`min-h-9 px-2 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              portalTab === 'consult'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مشاوره آنلاین
          </button>
        </div>
      </div>

      {portalTab === 'booking' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Step 1: Select Doctor */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">
              ۱. انتخاب دندانپزشک متخصص
            </h3>
            <div className="space-y-3">
              {doctors.map((doc) => {
                const selected = doc.id === selectedDoctorId;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      const slots = getAvailableSlots(state.appointments, doc.id, bookDate);
                      setBookTime(slots[0] ?? '');
                    }}
                    className={`w-full text-right bg-white border rounded-xl p-4 flex items-start gap-3.5 transition-colors ${
                      selected
                        ? 'border-teal-600 ring-1 ring-teal-600 bg-teal-50/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {doc.avatarKey ? (
                      <img
                        src={DOCTOR_AVATARS[doc.avatarKey]}
                        alt={doc.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0" />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-slate-900">{doc.name}</div>
                      <div className="text-xs font-medium text-teal-700">{doc.specialty}</div>
                      {doc.bio && <p className="text-xs text-slate-500 leading-relaxed">{doc.bio}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 & 3: Slot & Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
            {bookingConfirmedCode ? (
              <div className="py-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">
                  نوبت آنلاین شما با موفقیت ثبت شد
                </h3>
                <p className="text-sm text-slate-600">
                  کد رهگیری رزرو:{' '}
                  <span className="font-mono font-bold text-teal-700">{bookingConfirmedCode}</span> ·
                  تاریخ {formatPersianDate(bookDate, true)} ساعت {toPersianDigits(bookTime)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setBookingConfirmedCode(null);
                    setPatientName('');
                    setPatientPhone('');
                    setPatientNationalId('');
                  }}
                  className="min-h-10 px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                >
                  ثبت نوبت جدید
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookSubmit} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  ۲. انتخاب تاریخ، ساعت آزاد و مشخصات بیمار
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">تاریخ مراجعه</label>
                    <input
                      type="date"
                      value={bookDate}
                      onChange={(e) => {
                        setBookDate(e.target.value);
                        const slots = getAvailableSlots(
                          state.appointments,
                          selectedDoctorId,
                          e.target.value
                        );
                        setBookTime(slots[0] ?? '');
                      }}
                      className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {formatPersianDate(bookDate, true)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">خدمت مورد نظر</label>
                    <select
                      value={bookService}
                      onChange={(e) => setBookService(e.target.value)}
                      className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="معاینه و مشاوره تخصصی">معاینه و مشاوره تخصصی</option>
                      <option value="جرم‌گیری و زیبایی">جرم‌گیری و زیبایی</option>
                      <option value="ترمیم و عصب‌کشی">ترمیم و عصب‌کشی</option>
                      <option value="مشاوره ایمپلنت">مشاوره ایمپلنت</option>
                      <option value="مشاوره ارتودنسی">مشاوره ارتودنسی</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    ساعت‌های آزاد پزشک انتخاب‌شده
                  </label>
                  {openSlots.length === 0 ? (
                    <p className="text-xs text-red-600">
                      در این تاریخ نوبت آزادی برای این پزشک باقی نمانده است.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {openSlots.slice(0, 12).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setBookTime(slot)}
                          className={`min-h-10 text-xs font-mono tabular-nums rounded-lg border transition-colors ${
                            bookTime === slot
                              ? 'bg-teal-600 text-white border-teal-600 font-semibold'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {toPersianDigits(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">نام کامل بیمار</label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="نام و نام خانوادگی"
                      className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">شماره همراه</label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="0912..."
                      className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">کدملی</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={patientNationalId}
                      onChange={(e) => setPatientNationalId(e.target.value)}
                      placeholder="0012345678"
                      className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!bookTime}
                  className="w-full min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>تایید و رزرو نهایی نوبت</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {portalTab === 'payment' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                تسویه آنلاین فاکتور از طریق درگاه پرداخت مستقیم
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                شماره فاکتور، کد بیمار یا نام بیمار را جستجو و مستقیم پرداخت کنید.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="search"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="جستجوی شماره فاکتور یا نام..."
                className="w-full min-h-10 pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {unpaidInvoices.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                در حال حاضر فاکتور پرداخت‌نشده‌ای مطابق جستجوی شما وجود ندارد.
              </div>
            ) : (
              unpaidInvoices.map((inv) => {
                const t = calculateInvoiceTotals(
                  inv.items,
                  inv.discount,
                  inv.insuranceCoverage,
                  inv.paidAmount
                );
                return (
                  <div
                    key={inv.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span>{inv.patientName}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono text-xs text-teal-700">{inv.invoiceNumber}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {inv.doctorName} · {formatPersianDate(inv.date, true)} ·{' '}
                        {inv.items.map((x) => x.title).join('، ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left tabular-nums">
                        <div className="text-xs text-slate-500">مانده قابل پرداخت</div>
                        <div className="text-base font-bold text-slate-900">
                          {formatCurrencyToman(t.remaining)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPayingInvoice(inv)}
                        className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>پرداخت آنلاین</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {portalTab === 'consult' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquarePlus className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">ارسال درخواست مشاوره پیش از درمان</h3>
          </div>

          {conSent && (
            <div className="mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
              پیام مشاوره شما به پزشک ارسال شد و در بخش «مشاوره آنلاین» مطب قابل مشاهده و پاسخگویی است.
            </div>
          )}

          <form onSubmit={handleConsultSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">نام شما</label>
                <input
                  type="text"
                  required
                  value={conName}
                  onChange={(e) => setConName(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">شماره تماس</label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={conPhone}
                  onChange={(e) => setConPhone(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب پزشک</label>
                <select
                  value={conDoctorId}
                  onChange={(e) => setConDoctorId(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">موضوع مشاوره</label>
                <input
                  type="text"
                  value={conSubject}
                  onChange={(e) => setConSubject(e.target.value)}
                  placeholder="مثال: مشاوره ایمپلنت یا درد دندان"
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">شرح سوال یا مشکل دندانی</label>
              <textarea
                rows={4}
                required
                value={conMessage}
                onChange={(e) => setConMessage(e.target.value)}
                placeholder="علائم، محل درد یا سوال خود را بنویسید..."
                className="w-full p-3 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="min-h-11 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            >
              ارسال پیام مشاوره به پزشک
            </button>
          </form>
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
