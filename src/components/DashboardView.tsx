import React from 'react';
import {
  ArrowUpLeft,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Send,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type {
  Appointment,
  AppointmentStatus,
  AppView,
  ClinicState,
  PermissionKey,
  RoleType,
  StaffMember,
} from '../types/clinic';
import {
  computeMonthlyAnalytics,
  formatCurrencyToman,
  formatPersianDate,
  hasPermission,
  toPersianDigits,
} from '../utils/clinicLogic';

interface DashboardViewProps {
  state: ClinicState;
  currentStaff: StaffMember | null;
  currentRole: RoleType;
  onNavigate: (view: AppView) => void;
  onOpenPatientEhr: (patientId: string) => void;
  onUpdateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  onSendReminderSms: (appointment: Appointment) => void;
}

const STATUS_LABELS: Record<AppointmentStatus, { label: string; style: string }> = {
  scheduled: { label: 'ثبت‌شده', style: 'text-slate-700 bg-slate-100 border-slate-200' },
  confirmed: { label: 'تاییدشده', style: 'text-teal-800 bg-teal-50 border-teal-200' },
  arrived: { label: 'حضور در مطب', style: 'text-amber-800 bg-amber-50 border-amber-200' },
  completed: { label: 'انجام‌شده', style: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'لغوشده', style: 'text-red-800 bg-red-50 border-red-200' },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  currentStaff,
  currentRole,
  onNavigate,
  onOpenPatientEhr,
  onUpdateAppointmentStatus,
  onSendReminderSms,
}) => {
  const can = (perm: PermissionKey) => hasPermission(currentStaff, currentRole, perm);

  const analytics = computeMonthlyAnalytics(
    state.appointments,
    state.invoices,
    state.patients
  );

  const todayDate = '2026-11-13';
  const todayAppointments = state.appointments
    .filter((a) => a.date === todayDate && a.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));

  const openConsultations = state.consultations.filter((c) => c.status === 'open');
  const unpaidInvoices = state.invoices.filter((i) => i.status !== 'paid');

  return (
    <div className="space-y-6">
      {/* Welcome / Context Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            سلام، {currentStaff?.name ?? 'همکار گرامی'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {currentStaff?.roleTitle} · امروز {formatPersianDate(todayDate, true)} ·{' '}
            {toPersianDigits(todayAppointments.length)} نوبت فعال در برنامه مطب
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('manage_appointments') && (
            <button
              type="button"
              onClick={() => onNavigate('appointments')}
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
            >
              <Calendar className="w-4 h-4" />
              <span>مدیریت نوبت‌های امروز</span>
            </button>
          )}
          {can('view_ehr') && (
            <button
              type="button"
              onClick={() => onNavigate('patients')}
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              <Users className="w-4 h-4" />
              <span>پرونده بیماران</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>نوبت‌های فعال امروز</span>
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {toPersianDigits(todayAppointments.length)} نوبت
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {toPersianDigits(
              todayAppointments.filter((a) => a.source === 'online').length
            )}{' '}
            رزرو آنلاین بیمار
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>پرونده‌های الکترونیک ثبت‌شده</span>
            <UserCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {toPersianDigits(state.patients.length)} بیمار
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {toPersianDigits(state.staff.filter((s) => s.isDoctor && s.active).length)}{' '}
            دندانپزشک فعال در کلینیک
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>وصولی ثبت‌شده در حسابداری</span>
            <Wallet className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {can('manage_billing') || can('view_reports')
              ? formatCurrencyToman(analytics.totalCollected)
              : 'محدودشده'}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {can('manage_billing') || can('view_reports')
              ? `نرخ وصول ${toPersianDigits(analytics.collectionRate)}٪`
              : 'نیازمند دسترسی مالی'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>مشاوره‌های باز پیش از درمان</span>
            <MessageSquare className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {toPersianDigits(openConsultations.length)} گفتگو
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {toPersianDigits(state.smsLogs.length)} پیامک یادآوری ارسال‌شده
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">برنامه نوبت‌های امروز</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                پیگیری پذیرش، حضور بیمار و ارسال پیامک یادآوری
              </p>
            </div>
            {can('manage_appointments') && (
              <button
                type="button"
                onClick={() => onNavigate('appointments')}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
              >
                <span>مشاهده همه</span>
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {todayAppointments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                نوبتی برای امروز ثبت نشده است.
              </div>
            ) : (
              todayAppointments.map((apt) => {
                const st = STATUS_LABELS[apt.status];
                return (
                  <div
                    key={apt.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="font-mono tabular-nums text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-2.5 py-1.5 shrink-0">
                        {toPersianDigits(apt.time)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {apt.patientName}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="font-mono tabular-nums text-xs text-slate-500">
                            {apt.patientCode}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span
                            className={`text-[11px] font-medium border rounded px-2 py-0.5 ${st.style}`}
                          >
                            {st.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {apt.service} · {apt.doctorName}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {can('view_ehr') && (
                        <button
                          type="button"
                          onClick={() => onOpenPatientEhr(apt.patientId)}
                          className="min-h-9 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          پرونده پزشکی
                        </button>
                      )}
                      {can('manage_appointments') && apt.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAppointmentStatus(
                              apt.id,
                              apt.status === 'arrived' ? 'completed' : 'arrived'
                            )
                          }
                          className="min-h-9 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {apt.status === 'arrived' ? 'اتمام ویزیت' : 'ثبت حضور'}
                          </span>
                        </button>
                      )}
                      {can('send_sms') && !apt.reminderSent && (
                        <button
                          type="button"
                          onClick={() => onSendReminderSms(apt)}
                          className="min-h-9 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>پیامک یادآوری</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Side Column: Consultations & Pending Billing */}
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">مشاوره‌های پیش از درمان</h3>
              {can('manage_consultations') && (
                <button
                  type="button"
                  onClick={() => onNavigate('consultations')}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  پاسخگویی
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {openConsultations.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">تمام مشاوره‌ها پاسخ داده شده‌اند.</p>
              ) : (
                openConsultations.map((c) => (
                  <div key={c.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{c.patientName}</span>
                      <span className="text-slate-500">{c.doctorName}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{c.subject}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">فاکتورهای منتظر تسویه</h3>
              {can('manage_billing') && (
                <button
                  type="button"
                  onClick={() => onNavigate('billing')}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  حسابداری
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {!can('manage_billing') ? (
                <p className="p-4 text-xs text-slate-500">
                  مشاهده جزئیات مالی نیازمند مجوز حسابداری است.
                </p>
              ) : unpaidInvoices.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">فاکتور باز وجود ندارد.</p>
              ) : (
                unpaidInvoices.slice(0, 4).map((inv) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{inv.patientName}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {inv.invoiceNumber} · {formatPersianDate(inv.date)}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 tabular-nums">
                      {inv.status === 'partial' ? 'پرداخت ناقص' : 'در انتظار پرداخت'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
