import React, { useState } from 'react';
import {
  CalendarCog,
  CalendarOff,
  Check,
  Clock,
  Copy,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  AttendanceWindow,
  ClinicState,
  DateOverrideRule,
  DayScheduleRule,
  DoctorBookingConfig,
  PersianWeekday,
} from '../types/clinic';
import {
  createDefaultBookingConfig,
  formatPersianDate,
  generateSlotsFromWindows,
  PERSIAN_WEEKDAYS,
  toPersianDigits,
} from '../utils/clinicLogic';

interface BookingSettingsViewProps {
  state: ClinicState;
  canEdit: boolean;
  onSaveConfig: (doctorId: string, config: DoctorBookingConfig) => void;
  onApplyToAllDoctors: (sourceConfig: DoctorBookingConfig) => void;
}

export const BookingSettingsView: React.FC<BookingSettingsViewProps> = ({
  state,
  canEdit,
  onSaveConfig,
  onApplyToAllDoctors,
}) => {
  const doctors = state.staff.filter((s) => s.isDoctor && s.active);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id ?? '');
  const [selectedWeekday, setSelectedWeekday] = useState<PersianWeekday>(0);
  const [manualSlotInput, setManualSlotInput] = useState('13:00');
  const [notice, setNotice] = useState('');

  // Date Override Form
  const [overrideDate, setOverrideDate] = useState('2026-11-22');
  const [overrideClosed, setOverrideClosed] = useState(true);
  const [overrideCapacity, setOverrideCapacity] = useState('6');
  const [overrideNote, setOverrideNote] = useState('');

  const config: DoctorBookingConfig =
    state.bookingConfigs[selectedDoctorId] ?? createDefaultBookingConfig(selectedDoctorId);

  const dayRule: DayScheduleRule = config.weekSchedule[selectedWeekday];

  const updateConfig = (updater: (prev: DoctorBookingConfig) => DoctorBookingConfig) => {
    if (!canEdit) return;
    const next = updater(config);
    onSaveConfig(selectedDoctorId, next);
    setNotice('تنظیمات نوبت‌گیری ذخیره و در بخش رزرو کاربر اعمال شد.');
  };

  const updateDayRule = (updater: (prev: DayScheduleRule) => DayScheduleRule) => {
    updateConfig((prev) => ({
      ...prev,
      weekSchedule: {
        ...prev.weekSchedule,
        [selectedWeekday]: updater(prev.weekSchedule[selectedWeekday]),
      },
    }));
  };

  const handleToggleExactTimeSlots = (enabled: boolean) => {
    updateConfig((prev) => ({
      ...prev,
      enableExactTimeSlots: enabled,
    }));
  };

  const handleAddWindow = () => {
    const newWin: AttendanceWindow = {
      id: `win-${Date.now()}`,
      label: dayRule.windows.length === 0 ? 'شیفت صبح' : 'شیفت عصر',
      start: dayRule.windows.length === 0 ? '09:00' : '15:00',
      end: dayRule.windows.length === 0 ? '13:00' : '19:00',
    };
    updateDayRule((prev) => ({
      ...prev,
      enabled: true,
      windows: [...prev.windows, newWin],
    }));
  };

  const handleUpdateWindow = (
    winId: string,
    patch: Partial<Pick<AttendanceWindow, 'label' | 'start' | 'end'>>
  ) => {
    updateDayRule((prev) => ({
      ...prev,
      windows: prev.windows.map((w) => (w.id === winId ? { ...w, ...patch } : w)),
    }));
  };

  const handleDeleteWindow = (winId: string) => {
    updateDayRule((prev) => ({
      ...prev,
      windows: prev.windows.filter((w) => w.id !== winId),
    }));
  };

  const handleAddManualSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSlotInput) return;
    updateDayRule((prev) => ({
      ...prev,
      manualAddedSlots: Array.from(new Set([...prev.manualAddedSlots, manualSlotInput])),
      removedSlots: prev.removedSlots.filter((s) => s !== manualSlotInput),
    }));
  };

  const handleToggleSlotRemoval = (slot: string) => {
    const isRemoved = dayRule.removedSlots.includes(slot);
    updateDayRule((prev) => ({
      ...prev,
      removedSlots: isRemoved
        ? prev.removedSlots.filter((s) => s !== slot)
        : [...prev.removedSlots, slot],
    }));
  };

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) return;
    const rule: DateOverrideRule = {
      date: overrideDate,
      closed: overrideClosed,
      dailyCapacity: overrideClosed ? 0 : Math.max(1, Number(overrideCapacity) || 6),
      note: overrideNote.trim() || (overrideClosed ? 'تعطیلی / مرخصی پزشک' : 'تغییر ظرفیت روزانه'),
    };
    updateConfig((prev) => ({
      ...prev,
      dateOverrides: [
        rule,
        ...prev.dateOverrides.filter((o) => o.date !== overrideDate),
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setOverrideNote('');
  };

  const handleRemoveOverride = (date: string) => {
    updateConfig((prev) => ({
      ...prev,
      dateOverrides: prev.dateOverrides.filter((o) => o.date !== date),
    }));
  };

  // All generated + manually added slots (including removed ones so staff can toggle them back on)
  const rawSlotsForDay = generateSlotsFromWindows(
    dayRule.windows,
    config.slotDurationMinutes,
    dayRule.manualAddedSlots,
    []
  );
  const activeSlotCount = rawSlotsForDay.filter((s) => !dayRule.removedSlots.includes(s)).length;

  return (
    <div className="space-y-6">
      {/* Header & Doctor Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarCog className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">
              تنظیمات نحوه نوبت‌گیری و برنامه حضور
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            تنظیم دستی روزها، بازه‌های حضور، ظرفیت روزانه، افزودن یا حذف ساعت دقیق؛ تغییرات بلافاصله در پورتال رزرو کاربر اعمال می‌شود.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <label htmlFor="booking-config-doctor" className="sr-only">
              انتخاب پزشک برای تنظیم برنامه
            </label>
            <select
              id="booking-config-doctor"
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                setNotice('');
              }}
              className="min-h-10 px-3 py-2 text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty ?? 'دندانپزشک'})
                </option>
              ))}
            </select>
          </div>
          {canEdit && doctors.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onApplyToAllDoctors(config);
                setNotice('این تنظیمات برای تمام پزشکان کلینیک کپی و اعمال شد.');
              }}
              className="min-h-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              <Copy className="w-4 h-4" />
              <span>اعمال برای همه پزشکان</span>
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <Check className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Mode Selection: Exact Clock Hours vs. Window + Daily Capacity Only */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              ۱. الگوی نمایش ساعت در صفحه رزرو نوبت
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              می‌توانید ساعت دقیق را فعال نگه دارید یا ساعت را کاملاً بردارید و فقط بر اساس بازه حضور و ظرفیت روزانه نوبت بگیرید.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => handleToggleExactTimeSlots(true)}
            className={`text-right p-4 rounded-xl border transition-colors ${
              config.enableExactTimeSlots
                ? 'border-teal-600 bg-teal-50/60 ring-1 ring-teal-600'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                نوبت‌گیری با ساعت دقیق (انتخاب ساعت توسط بیمار)
              </span>
              <Clock
                className={`w-4 h-4 ${
                  config.enableExactTimeSlots ? 'text-teal-700' : 'text-slate-400'
                }`}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              ساعات آزاد بر اساس بازه‌های حضور و فاصله زمانی تولید می‌شوند و می‌توانید هر ساعت را دستی اضافه یا مسدود کنید.
            </p>
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={() => handleToggleExactTimeSlots(false)}
            className={`text-right p-4 rounded-xl border transition-colors ${
              !config.enableExactTimeSlots
                ? 'border-teal-600 bg-teal-50/60 ring-1 ring-teal-600'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                حذف ساعت دقیق (فقط بازه زمانی حضور و ظرفیت روزانه)
              </span>
              <Users
                className={`w-4 h-4 ${
                  !config.enableExactTimeSlots ? 'text-teal-700' : 'text-slate-400'
                }`}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              ساعت دقیق از فرم رزرو حذف می‌شود؛ بیمار فقط روز و بازه حضور (مثلاً شیفت صبح یا عصر) را انتخاب می‌کند تا سقف ظرفیت روزانه.
            </p>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label
              htmlFor="slot-duration-select"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              فاصله زمانی هر نوبت (دقیقه)
            </label>
            <select
              id="slot-duration-select"
              disabled={!canEdit || !config.enableExactTimeSlots}
              value={config.slotDurationMinutes}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  slotDurationMinutes: Number(e.target.value),
                }))
              }
              className="w-full min-h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
            >
              <option value={15}>۱۵ دقیقه</option>
              <option value={20}>۲۰ دقیقه</option>
              <option value={30}>۳۰ دقیقه</option>
              <option value={45}>۴۵ دقیقه</option>
              <option value={60}>۶۰ دقیقه</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="default-capacity-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              ظرفیت پیش‌فرض روزانه (نفر)
            </label>
            <input
              id="default-capacity-input"
              type="number"
              min={1}
              max={100}
              disabled={!canEdit}
              value={config.defaultDailyCapacity}
              onChange={(e) => {
                const cap = Math.max(1, Number(e.target.value) || 1);
                updateConfig((prev) => ({
                  ...prev,
                  defaultDailyCapacity: cap,
                }));
              }}
              className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="horizon-days-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              بازه مجاز رزرو آنلاین (روز آینده)
            </label>
            <input
              id="horizon-days-input"
              type="number"
              min={1}
              max={120}
              disabled={!canEdit}
              value={config.bookingHorizonDays}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  bookingHorizonDays: Math.max(1, Number(e.target.value) || 14),
                }))
              }
              className="w-full min-h-10 px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg disabled:bg-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Weekly Schedule Editor */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              ۲. تنظیم دستی روزهای هفته، بازه‌های حضور و ظرفیت هر روز
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              یک روز هفته را انتخاب کنید تا بازه حضور، ظرفیت روزانه و ساعت‌های دستی آن را ویرایش کنید.
            </p>
          </div>
        </div>

        {/* Day Pills / Tabs */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {PERSIAN_WEEKDAYS.map((wd) => {
            const rule = config.weekSchedule[wd.id];
            const isSel = selectedWeekday === wd.id;
            return (
              <button
                key={wd.id}
                type="button"
                onClick={() => setSelectedWeekday(wd.id)}
                className={`min-h-14 p-2 rounded-xl border text-center transition-colors flex flex-col items-center justify-center gap-0.5 ${
                  isSel
                    ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                    : rule.enabled
                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    : 'border-slate-200 bg-slate-100/80 text-slate-400'
                }`}
              >
                <span className="text-xs font-semibold">{wd.label}</span>
                <span className="text-[11px] tabular-nums">
                  {rule.enabled ? `ظرفیت ${toPersianDigits(rule.dailyCapacity)}` : 'تعطیل'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Editor */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dayRule.enabled}
                  disabled={!canEdit}
                  onChange={(e) =>
                    updateDayRule((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                      dailyCapacity:
                        e.target.checked && prev.dailyCapacity === 0
                          ? config.defaultDailyCapacity
                          : prev.dailyCapacity,
                    }))
                  }
                  className="w-4 h-4 accent-teal-600 rounded"
                />
                <span>
                  حضور پزشک در روزهای {PERSIAN_WEEKDAYS[selectedWeekday].label}
                </span>
              </label>
            </div>

            {dayRule.enabled && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="day-capacity-input"
                  className="text-xs font-medium text-slate-700 whitespace-nowrap"
                >
                  ظرفیت روزانه ({PERSIAN_WEEKDAYS[selectedWeekday].label}):
                </label>
                <input
                  id="day-capacity-input"
                  type="number"
                  min={1}
                  max={100}
                  disabled={!canEdit}
                  value={dayRule.dailyCapacity}
                  onChange={(e) =>
                    updateDayRule((prev) => ({
                      ...prev,
                      dailyCapacity: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-20 min-h-9 px-2.5 py-1 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                />
                <span className="text-xs text-slate-500">نفر</span>
              </div>
            )}
          </div>

          {!dayRule.enabled ? (
            <p className="text-xs text-slate-500 py-3">
              این روز به عنوان روز غیرکاری تنظیم شده است و امکان رزرو در آن برای بیماران نمایش داده نمی‌شود.
            </p>
          ) : (
            <div className="space-y-5">
              {/* Attendance Windows (Shifts) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    بازه‌های زمانی حضور در مطب (شیفت‌ها)
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleAddWindow}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن بازه حضور</span>
                    </button>
                  )}
                </div>

                {dayRule.windows.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    هیچ بازه حضوری برای این روز تعریف نشده است. یک بازه جدید اضافه کنید.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayRule.windows.map((win) => (
                      <div
                        key={win.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-lg p-2.5"
                      >
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            disabled={!canEdit}
                            value={win.label}
                            onChange={(e) =>
                              handleUpdateWindow(win.id, { label: e.target.value })
                            }
                            aria-label="عنوان بازه حضور"
                            placeholder="مثلاً شیفت صبح"
                            className="w-full min-h-9 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                          />
                        </div>
                        <div className="sm:col-span-3 flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">از</span>
                          <input
                            type="time"
                            disabled={!canEdit}
                            value={win.start}
                            onChange={(e) =>
                              handleUpdateWindow(win.id, { start: e.target.value })
                            }
                            aria-label="ساعت شروع بازه"
                            className="flex-1 min-h-9 px-2 py-1 text-xs font-mono border border-slate-300 rounded-md"
                          />
                        </div>
                        <div className="sm:col-span-3 flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">تا</span>
                          <input
                            type="time"
                            disabled={!canEdit}
                            value={win.end}
                            onChange={(e) =>
                              handleUpdateWindow(win.id, { end: e.target.value })
                            }
                            aria-label="ساعت پایان بازه"
                            className="flex-1 min-h-9 px-2 py-1 text-xs font-mono border border-slate-300 rounded-md"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDeleteWindow(win.id)}
                              aria-label={`حذف ${win.label}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Exact Slot Controls (visible when exact time slots are ON) */}
              {config.enableExactTimeSlots ? (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        تنظیم دستی ساعت‌های نوبت‌دهی ({toPersianDigits(activeSlotCount)} ساعت فعال)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        برای حذف یا مسدود کردن هر ساعت روی آن کلیک کنید، یا یک ساعت دلخواه جدید اضافه نمایید.
                      </p>
                    </div>
                    {canEdit && (
                      <form onSubmit={handleAddManualSlot} className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={manualSlotInput}
                          onChange={(e) => setManualSlotInput(e.target.value)}
                          aria-label="ساعت دستی جدید"
                          className="min-h-9 px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                        <button
                          type="submit"
                          className="min-h-9 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
                        >
                          افزودن ساعت دستی
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rawSlotsForDay.map((slot) => {
                      const removed = dayRule.removedSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggleSlotRemoval(slot)}
                          aria-label={
                            removed
                              ? `بازگردانی ساعت ${slot}`
                              : `حذف ساعت ${slot}`
                          }
                          className={`min-h-9 px-2.5 py-1 text-xs font-mono tabular-nums rounded-lg border transition-colors ${
                            removed
                              ? 'bg-red-50 text-red-500 border-red-200 line-through'
                              : 'bg-white text-slate-800 border-slate-300 hover:border-teal-600'
                          }`}
                        >
                          {toPersianDigits(slot)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3.5 py-2.5">
                  حالت «حذف ساعت دقیق» فعال است. بیماران در روزهای {PERSIAN_WEEKDAYS[selectedWeekday].label} فقط یکی از بازه‌های حضور بالا را تا سقف ظرفیت {toPersianDigits(dayRule.dailyCapacity)} نفر انتخاب می‌کنند.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Special Date Overrides (Holidays / Custom Daily Capacity) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">
            ۳. استثناهای تاریخ خاص (مرخصی، تعطیلی یا تغییر ظرفیت یک روز مشخص)
          </h3>
        </div>

        {canEdit && (
          <form
            onSubmit={handleAddOverride}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 border border-slate-200 rounded-xl p-3.5"
          >
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب تاریخ</label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full min-h-10 px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">وضعیت این تاریخ</label>
              <select
                value={overrideClosed ? 'closed' : 'custom_cap'}
                onChange={(e) => setOverrideClosed(e.target.value === 'closed')}
                className="w-full min-h-10 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="closed">بستن کامل روز (تعطیل / مرخصی)</option>
                <option value="custom_cap">تغییر ظرفیت روزانه</option>
              </select>
            </div>
            {!overrideClosed && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">ظرفیت ویژه</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={overrideCapacity}
                  onChange={(e) => setOverrideCapacity(e.target.value)}
                  className="w-full min-h-10 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                />
              </div>
            )}
            <div className={overrideClosed ? 'sm:col-span-4' : 'sm:col-span-2'}>
              <label className="block text-xs font-medium text-slate-700 mb-1">علت / توضیح</label>
              <input
                type="text"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="مثلاً کنگره دندانپزشکی"
                className="w-full min-h-10 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full min-h-10 px-3 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
              >
                ثبت استثنا
              </button>
            </div>
          </form>
        )}

        {config.dateOverrides.length === 0 ? (
          <p className="text-xs text-slate-500">
            هیچ استثنای تاریخی برای این پزشک ثبت نشده است.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {config.dateOverrides.map((ov) => (
              <div
                key={ov.date}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs bg-white"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatPersianDate(ov.date, true)}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span
                    className={
                      ov.closed ? 'text-red-700 font-medium' : 'text-teal-700 font-medium'
                    }
                  >
                    {ov.closed
                      ? 'تعطیل / عدم پذیرش'
                      : `ظرفیت ویژه: ${toPersianDigits(ov.dailyCapacity ?? 0)} نفر`}
                  </span>
                  {ov.note && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{ov.note}</span>
                    </>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOverride(ov.date)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    حذف
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
