import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarCog,
  Check,
  MessageSquareText,
  Plus,
  Send,
  X,
} from 'lucide-react';
import type {
  Appointment,
  AppointmentStatus,
  ClinicState,
  Patient,
  StaffMember,
} from '../types/clinic';
import {
  formatPersianDate,
  getDoctorDayAvailability,
  hasAppointmentConflict,
  renderSmsTemplate,
  toPersianDigits,
} from '../utils/clinicLogic';

interface AppointmentsSmsViewProps {
  state: ClinicState;
  canManageAppointments: boolean;
  canSendSms: boolean;
  canViewEhr: boolean;
  onCreateAppointment: (apt: Omit<Appointment, 'id'>) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
  onSendSmsReminder: (appointment: Appointment, customMessage?: string) => void;
  onUpdateSmsTemplate: (template: string) => void;
  onOpenPatientEhr: (patientId: string) => void;
  onOpenBookingSettings: () => void;
}

const STATUS_MAP: Record<AppointmentStatus, { label: string; style: string }> = {
  scheduled: { label: 'ثبت‌شده', style: 'text-slate-700 bg-slate-100 border-slate-200' },
  confirmed: { label: 'تاییدشده', style: 'text-teal-800 bg-teal-50 border-teal-200' },
  arrived: { label: 'حضور در مطب', style: 'text-amber-800 bg-amber-50 border-amber-200' },
  completed: { label: 'تکمیل‌شده', style: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'لغوشده', style: 'text-red-800 bg-red-50 border-red-200' },
};

export const AppointmentsSmsView: React.FC<AppointmentsSmsViewProps> = ({
  state,
  canManageAppointments,
  canSendSms,
  canViewEhr,
  onCreateAppointment,
  onUpdateStatus,
  onSendSmsReminder,
  onUpdateSmsTemplate,
  onOpenPatientEhr,
  onOpenBookingSettings,
}) => {
  const doctors: StaffMember[] = state.staff.filter((s) => s.isDoctor && s.active);
  const [activeTab, setActiveTab] = useState<'schedule' | 'sms'>('schedule');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-19');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Appointment Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [patientId, setPatientId] = useState<string>(state.patients[0]?.id ?? '');
  const [doctorId, setDoctorId] = useState<string>(doctors[0]?.id ?? '');
  const [aptDate, setAptDate] = useState<string>('2026-11-19');
  const [aptTime, setAptTime] = useState<string>('11:00');
  const [aptWindowLabel, setAptWindowLabel] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [service, setService] = useState<string>('معاینه و جرم‌گیری');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // SMS Template State
  const [templateDraft, setTemplateDraft] = useState(state.smsTemplate);
  const [smsNotice, setSmsNotice] = useState('');

  const filteredAppointments = state.appointments
    .filter((a) => {
      if (selectedDate && a.date !== selectedDate) return false;
      if (doctorFilter !== 'all' && a.doctorId !== doctorFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const modalAvailability = getDoctorDayAvailability(
    state.bookingConfigs[doctorId],
    state.appointments,
    doctorId,
    aptDate
  );

  const handleOpenNew = () => {
    const firstPatient = state.patients[0]?.id ?? '';
    const firstDoc = doctors[0]?.id ?? '';
    const targetDate = selectedDate || '2026-11-19';
    setPatientId(firstPatient);
    setDoctorId(firstDoc);
    setAptDate(targetDate);
    const avail = getDoctorDayAvailability(
      state.bookingConfigs[firstDoc],
      state.appointments,
      firstDoc,
      targetDate
    );
    setAptTime(avail.availableSlots[0] ?? '09:00');
    setAptWindowLabel(
      avail.windows[0]
        ? `${avail.windows[0].label} (${toPersianDigits(avail.windows[0].start)} تا ${toPersianDigits(
            avail.windows[0].end
          )})`
        : 'پذیرش روزانه'
    );
    setFormError('');
    setShowNewModal(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient: Patient | undefined = state.patients.find((p) => p.id === patientId);
    const doctor = doctors.find((d) => d.id === doctorId);
    if (!patient || !doctor) {
      setFormError('لطفاً بیمار و پزشک معالج را انتخاب کنید.');
      return;
    }
    if (!service.trim()) {
      setFormError('عنوان خدمت یا علت مراجعه را وارد کنید.');
      return;
    }
    if (!modalAvailability.isWorkingDay) {
      setFormError(modalAvailability.reason || 'پزشک در این روز برنامه حضور ندارد.');
      return;
    }
    if (modalAvailability.remainingCapacity <= 0) {
      setFormError('ظرفیت روزانه این پزشک در تاریخ انتخابی تکمیل شده است.');
      return;
    }
    if (
      modalAvailability.enableExactTimeSlots &&
      hasAppointmentConflict(state.appointments, doctor.id, aptDate, aptTime, duration)
    ) {
      setFormError('این بازه زمانی با نوبت دیگری برای این پزشک تداخل دارد.');
      return;
    }

    const fallbackWin = modalAvailability.windows[0]
      ? `${modalAvailability.windows[0].label} (${toPersianDigits(
          modalAvailability.windows[0].start
        )} تا ${toPersianDigits(modalAvailability.windows[0].end)})`
      : 'پذیرش روزانه';

    onCreateAppointment({
      patientId: patient.id,
      patientName: patient.fullName,
      patientCode: patient.patientCode,
      patientPhone: patient.phone,
      doctorId: doctor.id,
      doctorName: doctor.name,
      date: aptDate,
      time: modalAvailability.enableExactTimeSlots ? aptTime : aptWindowLabel || fallbackWin,
      shiftLabel: modalAvailability.enableExactTimeSlots
        ? undefined
        : aptWindowLabel || fallbackWin,
      durationMinutes: duration,
      service: service.trim(),
      status: 'confirmed',
      source: 'clinic',
      notes: notes.trim() || undefined,
      reminderSent: false,
    });
    setSelectedDate(aptDate);
    setShowNewModal(false);
    setNotes('');
  };

  const handleBulkReminders = () => {
    const targets = state.appointments.filter(
      (a) =>
        a.date === selectedDate &&
        a.status !== 'cancelled' &&
        a.status !== 'completed' &&
        !a.reminderSent
    );
    if (targets.length === 0) {
      setSmsNotice('نوبت ارسال‌نشده‌ای برای تاریخ انتخابی وجود ندارد.');
      return;
    }
    targets.forEach((apt) => onSendSmsReminder(apt));
    setSmsNotice(
      `تعداد ${toPersianDigits(targets.length)} پیامک یادآوری در صف ارسال قرار گرفت و ثبت شد.`
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Sub-tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`min-h-9 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تقویم و مدیریت نوبت‌ها
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`min-h-9 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'sms'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            پیامک یادآوری ({toPersianDigits(state.smsLogs.length)})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageAppointments && (
            <button
              type="button"
              onClick={onOpenBookingSettings}
              className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap"
            >
              <CalendarCog className="w-4 h-4 text-teal-600" />
              <span>تنظیمات نوبت‌گیری</span>
            </button>
          )}
          {canSendSms && (
            <button
              type="button"
              onClick={handleBulkReminders}
              className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              <Send className="w-4 h-4 text-teal-600" />
              <span>ارسال گروهی پیامک یادآوری</span>
            </button>
          )}
          {canManageAppointments && (
            <button
              type="button"
              onClick={handleOpenNew}
              className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت نوبت جدید</span>
            </button>
          )}
        </div>
      </div>

      {smsNotice && (
        <div className="flex items-center justify-between gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{smsNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSmsNotice('')}
            aria-label="بستن اعلان"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'schedule' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">تاریخ برنامه</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {selectedDate ? formatPersianDate(selectedDate, true) : 'همه تاریخ‌ها'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">دندانپزشک</label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="all">همه پزشکان</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">وضعیت نوبت</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="all">همه وضعیت‌ها</option>
                {(Object.keys(STATUS_MAP) as AppointmentStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_MAP[st].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setDoctorFilter('all');
                  setStatusFilter('all');
                }}
                className="w-full min-h-10 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                نمایش کل نوبت‌ها (حذف فیلتر تاریخ)
              </button>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">زمان و تاریخ</th>
                    <th className="py-3 px-4">بیمار و کد پرونده</th>
                    <th className="py-3 px-4">پزشک معالج</th>
                    <th className="py-3 px-4">خدمت درمانی</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">پیامک</th>
                    <th className="py-3 px-4">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        نوبتی مطابق فیلتر انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt) => {
                      const st = STATUS_MAP[apt.status];
                      return (
                        <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono tabular-nums font-semibold text-slate-900">
                              {toPersianDigits(apt.time)}
                            </div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {formatPersianDate(apt.date)} · {toPersianDigits(apt.durationMinutes)} دقیقه
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{apt.patientName}</div>
                            <div className="text-xs text-slate-500 font-mono tabular-nums">
                              {apt.patientCode} · {toPersianDigits(apt.patientPhone)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                            <div>{apt.doctorName}</div>
                            <div className="text-xs text-slate-400">
                              {apt.source === 'online' ? 'رزرو آنلاین بیمار' : 'ثبت پذیرش مطب'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{apt.service}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {canManageAppointments ? (
                              <select
                                aria-label={`تغییر وضعیت نوبت ${apt.patientName}`}
                                value={apt.status}
                                onChange={(e) =>
                                  onUpdateStatus(apt.id, e.target.value as AppointmentStatus)
                                }
                                className={`text-xs font-medium border rounded-md px-2 py-1 ${st.style}`}
                              >
                                {(Object.keys(STATUS_MAP) as AppointmentStatus[]).map((k) => (
                                  <option key={k} value={k}>
                                    {STATUS_MAP[k].label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`text-xs font-medium border rounded-md px-2 py-1 ${st.style}`}
                              >
                                {st.label}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {apt.reminderSent ? (
                              <span className="text-xs text-emerald-700 font-medium">ارسال شده</span>
                            ) : canSendSms ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onSendSmsReminder(apt);
                                  setSmsNotice(`پیامک یادآوری برای ${apt.patientName} ارسال شد.`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>ارسال پیامک</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">ارسال نشده</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {canViewEhr && (
                              <button
                                type="button"
                                onClick={() => onOpenPatientEhr(apt.patientId)}
                                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                              >
                                پرونده بیمار
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* SMS Reminder Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-semibold text-slate-900">قالب پیامک یادآوری نوبت</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              متغیرهای قابل استفاده:{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">{'{patient}'}</code> نام بیمار،{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">{'{doctor}'}</code> نام پزشک،{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">{'{date}'}</code> تاریخ،{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">{'{time}'}</code> ساعت،{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">{'{clinic}'}</code> نام مطب
            </p>
            <textarea
              rows={4}
              value={templateDraft}
              disabled={!canSendSms}
              onChange={(e) => setTemplateDraft(e.target.value)}
              className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 disabled:bg-slate-100"
            />
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
              <div className="font-semibold text-slate-700 mb-1">پیش‌نمایش پیامک:</div>
              {renderSmsTemplate(templateDraft, {
                patientName: 'نیلوفر پارسا',
                doctorName: 'دکتر سارا محمدی',
                date: '2026-11-19',
                time: '10:00',
                clinicName: state.clinicName,
              })}
            </div>
            {canSendSms && (
              <button
                type="button"
                onClick={() => {
                  onUpdateSmsTemplate(templateDraft);
                  setSmsNotice('قالب پیامک یادآوری ذخیره شد.');
                }}
                className="w-full min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
              >
                ذخیره قالب پیامک
              </button>
            )}
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">تاریخچه پیامک‌های ارسالی</h3>
              <span className="text-xs text-slate-500 tabular-nums">
                مجموع {toPersianDigits(state.smsLogs.length)} پیامک
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {state.smsLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="font-semibold text-slate-900">
                      {log.patientName}{' '}
                      <span className="font-mono tabular-nums font-normal text-slate-500">
                        ({toPersianDigits(log.phone)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 tabular-nums">
                      <span>{toPersianDigits(log.sentAt)}</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-medium">تحویل به مخابرات</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ثبت نوبت جدید"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-semibold text-slate-900">ثبت نوبت جدید</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                aria-label="بستن فرم نوبت"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب بیمار</label>
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

              <div
                className={`grid grid-cols-1 ${
                  modalAvailability.enableExactTimeSlots ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                } gap-3`}
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">تاریخ</label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setAptDate(nextDate);
                      const avail = getDoctorDayAvailability(
                        state.bookingConfigs[doctorId],
                        state.appointments,
                        doctorId,
                        nextDate
                      );
                      if (avail.availableSlots[0]) setAptTime(avail.availableSlots[0]);
                      if (avail.windows[0]) {
                        setAptWindowLabel(
                          `${avail.windows[0].label} (${toPersianDigits(
                            avail.windows[0].start
                          )} تا ${toPersianDigits(avail.windows[0].end)})`
                        );
                      }
                    }}
                    className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                  />
                </div>
                {modalAvailability.enableExactTimeSlots && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ساعت دقیق</label>
                    <input
                      type="time"
                      required
                      value={aptTime}
                      onChange={(e) => setAptTime(e.target.value)}
                      className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">مدت (دقیقه)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value={30}>۳۰ دقیقه</option>
                    <option value={45}>۴۵ دقیقه</option>
                    <option value={60}>۶۰ دقیقه</option>
                    <option value={90}>۹۰ دقیقه</option>
                  </select>
                </div>
              </div>

              {/* Availability Status & Slots or Shift Windows */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-700">
                    وضعیت برنامه {formatPersianDate(aptDate, true)}:
                  </span>
                  {modalAvailability.isWorkingDay ? (
                    <span
                      className={`font-medium tabular-nums ${
                        modalAvailability.remainingCapacity > 0
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                    >
                      ظرفیت باقیمانده: {toPersianDigits(modalAvailability.remainingCapacity)} از{' '}
                      {toPersianDigits(modalAvailability.dailyCapacity)} نفر
                    </span>
                  ) : (
                    <span className="font-medium text-red-700">
                      {modalAvailability.reason || 'پزشک در این روز حضور ندارد'}
                    </span>
                  )}
                </div>

                {modalAvailability.isWorkingDay && modalAvailability.enableExactTimeSlots ? (
                  modalAvailability.availableSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {modalAvailability.availableSlots.slice(0, 10).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setAptTime(slot)}
                          className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-md border transition-colors ${
                            aptTime === slot
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {toPersianDigits(slot)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700">
                      ساعت خالی در این روز باقی نمانده است. می‌توانید از تنظیمات نوبت‌گیری ساعات را ویرایش کنید.
                    </div>
                  )
                ) : modalAvailability.isWorkingDay && !modalAvailability.enableExactTimeSlots ? (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-slate-600">
                      حالت بدون ساعت دقیق فعال است — بازه زمانی حضور بیمار را انتخاب کنید:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {modalAvailability.windows.map((win) => {
                        const labelText = `${win.label} (${toPersianDigits(
                          win.start
                        )} تا ${toPersianDigits(win.end)})`;
                        return (
                          <button
                            key={win.id}
                            type="button"
                            onClick={() => setAptWindowLabel(labelText)}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                              aptWindowLabel === labelText
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {labelText}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  خدمت درمانی / علت مراجعه
                </label>
                <input
                  type="text"
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">توضیحات پذیرش</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اختیاری..."
                  className="w-full min-h-10 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-10 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                >
                  ثبت قطعی نوبت
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="min-h-10 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
