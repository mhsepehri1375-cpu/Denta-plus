import type {
  Appointment,
  AttendanceWindow,
  ClinicExpense,
  DateOverrideRule,
  DayScheduleRule,
  DoctorBookingConfig,
  ExpenseCategory,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Patient,
  PermissionKey,
  PersianWeekday,
  PettyCashTopUp,
  ReportPeriodType,
  RoleType,
  StaffMember,
} from '../types/clinic';

export const DEFAULT_CLINIC_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
];

export const PERSIAN_WEEKDAYS: { id: PersianWeekday; label: string; short: string }[] = [
  { id: 0, label: 'شنبه', short: 'ش' },
  { id: 1, label: 'یکشنبه', short: 'ی' },
  { id: 2, label: 'دوشنبه', short: 'د' },
  { id: 3, label: 'سه‌شنبه', short: 'س' },
  { id: 4, label: 'چهارشنبه', short: 'چ' },
  { id: 5, label: 'پنجشنبه', short: 'پ' },
  { id: 6, label: 'جمعه', short: 'ج' },
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'مواد مصرفی دندانپزشکی',
  'لابراتوار و پروتز',
  'تجهیزات و تعمیرات',
  'اجاره و قبوض',
  'حقوق و دستمزد',
  'پذیرایی و ملزومات اداری',
  'سایر هزینه‌ها',
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_ehr: 'مشاهده پرونده پزشکی و رادیولوژی',
  edit_ehr: 'ثبت و ویرایش چارت دندانی و درمان',
  manage_appointments: 'مدیریت نوبت‌دهی و تنظیمات پذیرش',
  manage_billing: 'صدور فاکتور، خریدها، تنخواه و حسابداری',
  send_sms: 'ارسال پیامک یادآوری به بیماران',
  view_reports: 'مشاهده گزارش‌های حرفه‌ای حسابداری و مالی',
  manage_consultations: 'پاسخگویی به مشاوره آنلاین پیش از درمان',
  manage_staff: 'مدیریت همکاران و سطوح دسترسی',
};

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function normalizeDigits(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const pIdx = PERSIAN_DIGITS.indexOf(ch);
    if (pIdx !== -1) {
      out += String(pIdx);
      continue;
    }
    const aIdx = ARABIC_DIGITS.indexOf(ch);
    if (aIdx !== -1) {
      out += String(aIdx);
      continue;
    }
    out += ch;
  }
  return out;
}

export function toPersianDigits(input: string | number): string {
  const str = String(input);
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function formatCurrencyToman(amount: number): string {
  const safe = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = safe < 0 ? '-' : '';
  const formatted = new Intl.NumberFormat('en-US').format(Math.abs(safe));
  return `${sign}${toPersianDigits(formatted)} تومان`;
}

export function formatCompactToman(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '');
    return `${sign}${toPersianDigits(m)} م`;
  }
  if (abs >= 1_000) {
    return `${sign}${toPersianDigits(Math.round(abs / 1_000))} هـ`;
  }
  return `${sign}${toPersianDigits(Math.round(abs))}`;
}

export function formatNumberFa(val: number): string {
  const formatted = new Intl.NumberFormat('en-US').format(Math.round(val));
  return toPersianDigits(formatted);
}

/**
 * Converts Gregorian YYYY-MM-DD to Jalali (Solar Hijri) YYYY/MM/DD.
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    gdm[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const JALALI_QUARTERS = ['بهار (فصل ۱)', 'تابستان (فصل ۲)', 'پاییز (فصل ۳)', 'زمستان (فصل ۴)'];

export function formatPersianDate(isoDate: string, includeMonthName = false): string {
  if (!isoDate) return '—';
  const clean = isoDate.slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [gy, gm, gd] = parts;
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  if (includeMonthName) {
    return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
  }
  const mm = String(jm).padStart(2, '0');
  const dd = String(jd).padStart(2, '0');
  return toPersianDigits(`${jy}/${mm}/${dd}`);
}

export function getPersianWeekday(isoDate: string): PersianWeekday {
  const clean = isoDate.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  // Convert to Persian weekday: 0=Sat(6), 1=Sun(0), 2=Mon(1), ..., 6=Fri(5)
  return ((jsDay + 1) % 7) as PersianWeekday;
}

export function getJalaliMonthKey(isoDate: string): { key: string; label: string } {
  const clean = isoDate.slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { key: 'unknown', label: 'نامشخص' };
  }
  const [jy, jm] = gregorianToJalali(parts[0], parts[1], parts[2]);
  const key = `${jy}-${String(jm).padStart(2, '0')}`;
  const label = `${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
  return { key, label };
}

export function getReportBucketMeta(
  isoDate: string,
  period: ReportPeriodType
): { key: string; label: string } {
  const clean = isoDate.slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { key: 'unknown', label: 'نامشخص' };
  }
  const [gy, gm, gd] = parts;
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);

  if (period === 'daily' || period === 'custom') {
    return {
      key: clean,
      label: `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]}`,
    };
  }

  if (period === 'weekly') {
    // Anchor week to Saturday (start of Iranian week)
    const utc = new Date(Date.UTC(gy, gm - 1, gd));
    const offset = (utc.getUTCDay() + 1) % 7;
    utc.setUTCDate(utc.getUTCDate() - offset);
    const wy = utc.getUTCFullYear();
    const wm = utc.getUTCMonth() + 1;
    const wd = utc.getUTCDate();
    const weekStartIso = `${wy}-${String(wm).padStart(2, '0')}-${String(wd).padStart(2, '0')}`;
    const [, jwm, jwd] = gregorianToJalali(wy, wm, wd);
    return {
      key: weekStartIso,
      label: `هفته ${toPersianDigits(jwd)} ${JALALI_MONTHS[jwm - 1]}`,
    };
  }

  if (period === 'quarterly') {
    const q = Math.floor((jm - 1) / 3);
    return {
      key: `${jy}-Q${q + 1}`,
      label: `${JALALI_QUARTERS[q]} ${toPersianDigits(jy)}`,
    };
  }

  if (period === 'yearly') {
    return {
      key: `${jy}`,
      label: `سال ${toPersianDigits(jy)}`,
    };
  }

  // monthly
  return {
    key: `${jy}-${String(jm).padStart(2, '0')}`,
    label: `${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`,
  };
}

export function searchPatients(patients: Patient[], rawQuery: string): Patient[] {
  const q = normalizeDigits(rawQuery.trim().toLowerCase());
  if (!q) return patients;

  return patients.filter((p) => {
    const name = normalizeDigits(p.fullName.toLowerCase());
    const phone = normalizeDigits(p.phone);
    const nationalId = normalizeDigits(p.nationalId);
    const code = normalizeDigits(p.patientCode.toLowerCase());
    return (
      name.includes(q) ||
      phone.includes(q) ||
      nationalId.includes(q) ||
      code.includes(q)
    );
  });
}

export function generateNextPatientCode(patients: Patient[], prefix = 'DN'): string {
  let maxNum = 1000;
  for (const p of patients) {
    const match = normalizeDigits(p.patientCode).match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `${prefix}-${maxNum + 1}`;
}

export function validatePatientCode(
  code: string,
  patients: Patient[],
  excludePatientId?: string
): { valid: boolean; error?: string } {
  const normalized = normalizeDigits(code.trim()).toUpperCase();
  if (!normalized) {
    return { valid: false, error: 'کد بیمار نمی‌تواند خالی باشد.' };
  }
  if (normalized.length < 3) {
    return { valid: false, error: 'کد بیمار باید حداقل ۳ کاراکتر باشد.' };
  }
  const exists = patients.some(
    (p) =>
      p.id !== excludePatientId &&
      normalizeDigits(p.patientCode.trim()).toUpperCase() === normalized
  );
  if (exists) {
    return { valid: false, error: 'این کد بیمار قبلاً برای پرونده دیگری ثبت شده است.' };
  }
  return { valid: true };
}

export function timeToMinutes(timeStr: string): number {
  const clean = normalizeDigits(timeStr);
  if (!/^\d{1,2}:\d{2}$/.test(clean)) return -1;
  const [h, m] = clean.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateSlotsFromWindows(
  windows: AttendanceWindow[],
  intervalMinutes: number,
  manualAddedSlots: string[] = [],
  removedSlots: string[] = []
): string[] {
  const step = Math.max(10, intervalMinutes || 30);
  const removedSet = new Set(removedSlots.map((s) => normalizeDigits(s)));
  const slotSet = new Set<string>();

  for (const w of windows) {
    const startMin = timeToMinutes(w.start);
    const endMin = timeToMinutes(w.end);
    if (startMin < 0 || endMin <= startMin) continue;
    for (let t = startMin; t + step <= endMin; t += step) {
      const formatted = minutesToTime(t);
      if (!removedSet.has(formatted)) {
        slotSet.add(formatted);
      }
    }
  }

  for (const manual of manualAddedSlots) {
    const min = timeToMinutes(manual);
    if (min >= 0) {
      const formatted = minutesToTime(min);
      if (!removedSet.has(formatted)) {
        slotSet.add(formatted);
      }
    }
  }

  return Array.from(slotSet).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export function createDefaultBookingConfig(doctorId: string): DoctorBookingConfig {
  const makeDay = (
    weekday: PersianWeekday,
    enabled: boolean,
    dailyCapacity: number,
    windows: AttendanceWindow[]
  ): DayScheduleRule => ({
    weekday,
    enabled,
    dailyCapacity,
    windows,
    manualAddedSlots: [],
    removedSlots: [],
  });

  const fullDayWindows: AttendanceWindow[] = [
    { id: 'w-morning', label: 'شیفت صبح', start: '09:00', end: '12:30' },
    { id: 'w-evening', label: 'شیفت عصر', start: '15:00', end: '19:30' },
  ];

  const halfDayWindows: AttendanceWindow[] = [
    { id: 'w-morning', label: 'شیفت صبح', start: '09:30', end: '13:30' },
  ];

  return {
    doctorId,
    enableExactTimeSlots: true,
    slotDurationMinutes: 30,
    defaultDailyCapacity: 12,
    bookingHorizonDays: 30,
    weekSchedule: {
      0: makeDay(0, true, 12, fullDayWindows), // شنبه
      1: makeDay(1, true, 12, fullDayWindows), // یکشنبه
      2: makeDay(2, true, 12, fullDayWindows), // دوشنبه
      3: makeDay(3, true, 12, fullDayWindows), // سه‌شنبه
      4: makeDay(4, true, 12, fullDayWindows), // چهارشنبه
      5: makeDay(5, true, 6, halfDayWindows), // پنجشنبه
      6: makeDay(6, false, 0, []), // جمعه
    },
    dateOverrides: [],
  };
}

export function hasAppointmentConflict(
  appointments: Appointment[],
  doctorId: string,
  date: string,
  time: string,
  durationMinutes: number,
  excludeAppointmentId?: string
): boolean {
  const start = timeToMinutes(time);
  if (start < 0) return false; // Window-only bookings don't collide on clock minute; checked by dailyCapacity
  const end = start + Math.max(15, durationMinutes);

  return appointments.some((apt) => {
    if (apt.id === excludeAppointmentId) return false;
    if (apt.status === 'cancelled') return false;
    if (apt.doctorId !== doctorId || apt.date !== date) return false;
    const aptStart = timeToMinutes(apt.time);
    if (aptStart < 0) return false;
    const aptEnd = aptStart + Math.max(15, apt.durationMinutes);
    return start < aptEnd && end > aptStart;
  });
}

export function getAvailableSlots(
  appointments: Appointment[],
  doctorId: string,
  date: string,
  slots: string[] = DEFAULT_CLINIC_SLOTS
): string[] {
  return slots.filter(
    (slot) => !hasAppointmentConflict(appointments, doctorId, date, slot, 30)
  );
}

export interface DayAvailabilitySummary {
  isWorkingDay: boolean;
  reason?: string;
  enableExactTimeSlots: boolean;
  dailyCapacity: number;
  bookedCount: number;
  remainingCapacity: number;
  windows: AttendanceWindow[];
  allConfiguredSlots: string[];
  availableSlots: string[];
}

export function getDoctorDayAvailability(
  config: DoctorBookingConfig | undefined,
  appointments: Appointment[],
  doctorId: string,
  date: string
): DayAvailabilitySummary {
  const effectiveConfig = config ?? createDefaultBookingConfig(doctorId);
  const weekday = getPersianWeekday(date);
  const dayRule = effectiveConfig.weekSchedule[weekday];
  const override: DateOverrideRule | undefined = effectiveConfig.dateOverrides.find(
    (o) => o.date === date
  );

  const bookedCount = appointments.filter(
    (a) => a.doctorId === doctorId && a.date === date && a.status !== 'cancelled'
  ).length;

  if (override?.closed) {
    return {
      isWorkingDay: false,
      reason: override.note || 'پزشک در این تاریخ تعطیل یا خارج از کلینیک است.',
      enableExactTimeSlots: effectiveConfig.enableExactTimeSlots,
      dailyCapacity: 0,
      bookedCount,
      remainingCapacity: 0,
      windows: [],
      allConfiguredSlots: [],
      availableSlots: [],
    };
  }

  if (!override && (!dayRule || !dayRule.enabled)) {
    const dayName = PERSIAN_WEEKDAYS.find((w) => w.id === weekday)?.label ?? '';
    return {
      isWorkingDay: false,
      reason: `پزشک در روزهای ${dayName} برنامه حضور ندارد.`,
      enableExactTimeSlots: effectiveConfig.enableExactTimeSlots,
      dailyCapacity: 0,
      bookedCount,
      remainingCapacity: 0,
      windows: [],
      allConfiguredSlots: [],
      availableSlots: [],
    };
  }

  const windows =
    override?.customWindows && override.customWindows.length > 0
      ? override.customWindows
      : dayRule.windows;
  const dailyCapacity =
    override?.dailyCapacity !== undefined
      ? override.dailyCapacity
      : dayRule.dailyCapacity;
  const manualAdded = [
    ...(dayRule?.manualAddedSlots ?? []),
    ...(override?.manualAddedSlots ?? []),
  ];
  const removed = [
    ...(dayRule?.removedSlots ?? []),
    ...(override?.removedSlots ?? []),
  ];

  const remainingCapacity = Math.max(0, dailyCapacity - bookedCount);
  const allConfiguredSlots = generateSlotsFromWindows(
    windows,
    effectiveConfig.slotDurationMinutes,
    manualAdded,
    removed
  );

  const availableSlots =
    remainingCapacity <= 0
      ? []
      : allConfiguredSlots.filter(
          (slot) =>
            !hasAppointmentConflict(
              appointments,
              doctorId,
              date,
              slot,
              effectiveConfig.slotDurationMinutes
            )
        );

  return {
    isWorkingDay: true,
    reason:
      remainingCapacity <= 0
        ? 'ظرفیت نوبت‌دهی این روز تکمیل شده است.'
        : undefined,
    enableExactTimeSlots: effectiveConfig.enableExactTimeSlots,
    dailyCapacity,
    bookedCount,
    remainingCapacity,
    windows,
    allConfiguredSlots,
    availableSlots,
  };
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  discount: number,
  insuranceCoverage: number,
  paidAmount: number
): {
  subtotal: number;
  netTotal: number;
  remaining: number;
  status: InvoiceStatus;
} {
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice),
    0
  );
  const safeDiscount = Math.max(0, discount);
  const safeInsurance = Math.max(0, insuranceCoverage);
  const netTotal = Math.max(0, subtotal - safeDiscount - safeInsurance);
  const safePaid = Math.max(0, paidAmount);
  const remaining = Math.max(0, netTotal - safePaid);

  let status: InvoiceStatus = 'unpaid';
  if (netTotal === 0 || remaining === 0) {
    status = 'paid';
  } else if (safePaid > 0) {
    status = 'partial';
  }

  return { subtotal, netTotal, remaining, status };
}

export function renderSmsTemplate(
  template: string,
  vars: {
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    clinicName: string;
  }
): string {
  return template
    .replace(/\{patient\}/g, vars.patientName)
    .replace(/\{doctor\}/g, vars.doctorName)
    .replace(/\{date\}/g, formatPersianDate(vars.date, true))
    .replace(/\{time\}/g, toPersianDigits(vars.time))
    .replace(/\{clinic\}/g, vars.clinicName);
}

export function hasPermission(
  staff: StaffMember | null,
  role: RoleType,
  perm: PermissionKey
): boolean {
  if (role === 'patient') return false;
  if (!staff) return false;
  if (staff.role === 'dentist' && staff.permissions.manage_staff) {
    return true;
  }
  return Boolean(staff.permissions[perm]);
}

export interface PettyCashSummary {
  totalTopUps: number;
  totalSpent: number;
  currentBalance: number;
  clinicPurchasesTotal: number;
  totalAllExpenses: number;
}

export function computePettyCashSummary(
  expenses: ClinicExpense[],
  topUps: PettyCashTopUp[]
): PettyCashSummary {
  const totalTopUps = topUps.reduce((s, t) => s + Math.max(0, t.amount), 0);
  const totalSpent = expenses
    .filter((e) => e.source === 'petty_cash')
    .reduce((s, e) => s + Math.max(0, e.amount), 0);
  const clinicPurchasesTotal = expenses
    .filter((e) => e.source === 'clinic_purchase')
    .reduce((s, e) => s + Math.max(0, e.amount), 0);

  return {
    totalTopUps,
    totalSpent,
    currentBalance: totalTopUps - totalSpent,
    clinicPurchasesTotal,
    totalAllExpenses: totalSpent + clinicPurchasesTotal,
  };
}

export interface MonthlyBucket {
  monthKey: string;
  monthLabel: string;
  billedAmount: number;
  collectedAmount: number;
  visitCount: number;
  newPatientsCount: number;
}

export interface DoctorPerformanceRow {
  doctorId: string;
  doctorName: string;
  appointmentsCount: number;
  completedCount: number;
  totalRevenue: number;
}

export interface ServiceShareRow {
  title: string;
  count: number;
  revenue: number;
}

export interface MonthlyAnalyticsSummary {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  totalVisits: number;
  completedVisits: number;
  onlineBookingsCount: number;
  months: MonthlyBucket[];
  byDoctor: DoctorPerformanceRow[];
  topServices: ServiceShareRow[];
}

export function computeMonthlyAnalytics(
  appointments: Appointment[],
  invoices: Invoice[],
  patients: Patient[]
): MonthlyAnalyticsSummary {
  const monthMap = new Map<string, MonthlyBucket>();

  const ensureBucket = (isoDate: string): MonthlyBucket => {
    const { key, label } = getJalaliMonthKey(isoDate);
    let bucket = monthMap.get(key);
    if (!bucket) {
      bucket = {
        monthKey: key,
        monthLabel: label,
        billedAmount: 0,
        collectedAmount: 0,
        visitCount: 0,
        newPatientsCount: 0,
      };
      monthMap.set(key, bucket);
    }
    return bucket;
  };

  let totalBilled = 0;
  let totalCollected = 0;
  const serviceMap = new Map<string, ServiceShareRow>();
  const doctorMap = new Map<string, DoctorPerformanceRow>();

  for (const inv of invoices) {
    const totals = calculateInvoiceTotals(
      inv.items,
      inv.discount,
      inv.insuranceCoverage,
      inv.paidAmount
    );
    totalBilled += totals.netTotal;
    totalCollected += Math.min(totals.netTotal, inv.paidAmount);

    const bucket = ensureBucket(inv.date);
    bucket.billedAmount += totals.netTotal;
    bucket.collectedAmount += Math.min(totals.netTotal, inv.paidAmount);

    let doc = doctorMap.get(inv.doctorId);
    if (!doc) {
      doc = {
        doctorId: inv.doctorId,
        doctorName: inv.doctorName,
        appointmentsCount: 0,
        completedCount: 0,
        totalRevenue: 0,
      };
      doctorMap.set(inv.doctorId, doc);
    }
    doc.totalRevenue += totals.netTotal;

    for (const item of inv.items) {
      const cur = serviceMap.get(item.title) ?? {
        title: item.title,
        count: 0,
        revenue: 0,
      };
      cur.count += item.quantity;
      cur.revenue += item.quantity * item.unitPrice;
      serviceMap.set(item.title, cur);
    }
  }

  let totalVisits = 0;
  let completedVisits = 0;
  let onlineBookingsCount = 0;

  for (const apt of appointments) {
    if (apt.status === 'cancelled') continue;
    totalVisits += 1;
    if (apt.status === 'completed') completedVisits += 1;
    if (apt.source === 'online') onlineBookingsCount += 1;

    const bucket = ensureBucket(apt.date);
    bucket.visitCount += 1;

    let doc = doctorMap.get(apt.doctorId);
    if (!doc) {
      doc = {
        doctorId: apt.doctorId,
        doctorName: apt.doctorName,
        appointmentsCount: 0,
        completedCount: 0,
        totalRevenue: 0,
      };
      doctorMap.set(apt.doctorId, doc);
    }
    doc.appointmentsCount += 1;
    if (apt.status === 'completed') doc.completedCount += 1;
  }

  for (const p of patients) {
    const bucket = ensureBucket(p.createdAt);
    bucket.newPatientsCount += 1;
  }

  const months = Array.from(monthMap.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );
  const byDoctor = Array.from(doctorMap.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );
  const topServices = Array.from(serviceMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const totalOutstanding = Math.max(0, totalBilled - totalCollected);
  const collectionRate =
    totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

  return {
    totalBilled,
    totalCollected,
    totalOutstanding,
    collectionRate,
    totalVisits,
    completedVisits,
    onlineBookingsCount,
    months,
    byDoctor,
    topServices,
  };
}

export interface AccountingReportBucket {
  key: string;
  label: string;
  billedAmount: number;
  collectedAmount: number;
  expensesAmount: number;
  pettyCashAmount: number;
  clinicPurchasesAmount: number;
  netProfit: number;
  visitCount: number;
}

export interface ExpenseCategoryBreakdown {
  category: ExpenseCategory;
  amount: number;
  count: number;
  sharePercent: number;
}

export interface AccountingReportResult {
  period: ReportPeriodType;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  totalExpenses: number;
  totalPettyCashExpenses: number;
  totalClinicPurchases: number;
  netProfit: number;
  profitMarginPercent: number;
  collectionRate: number;
  totalVisits: number;
  completedVisits: number;
  onlineBookingsCount: number;
  buckets: AccountingReportBucket[];
  expenseBreakdown: ExpenseCategoryBreakdown[];
  byDoctor: DoctorPerformanceRow[];
  topServices: ServiceShareRow[];
}

export function computeAccountingReport(
  appointments: Appointment[],
  invoices: Invoice[],
  expenses: ClinicExpense[],
  period: ReportPeriodType,
  dateRange?: { startDate?: string; endDate?: string }
): AccountingReportResult {
  const start = dateRange?.startDate?.trim() || '';
  const end = dateRange?.endDate?.trim() || '';

  const inRange = (isoDate: string): boolean => {
    const d = isoDate.slice(0, 10);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const filteredInvoices = invoices.filter((i) => inRange(i.date));
  const filteredExpenses = expenses.filter((e) => inRange(e.date));
  const filteredAppointments = appointments.filter(
    (a) => a.status !== 'cancelled' && inRange(a.date)
  );

  const bucketMap = new Map<string, AccountingReportBucket>();
  const ensureBucket = (isoDate: string): AccountingReportBucket => {
    const meta = getReportBucketMeta(isoDate, period);
    let b = bucketMap.get(meta.key);
    if (!b) {
      b = {
        key: meta.key,
        label: meta.label,
        billedAmount: 0,
        collectedAmount: 0,
        expensesAmount: 0,
        pettyCashAmount: 0,
        clinicPurchasesAmount: 0,
        netProfit: 0,
        visitCount: 0,
      };
      bucketMap.set(meta.key, b);
    }
    return b;
  };

  let totalBilled = 0;
  let totalCollected = 0;
  const doctorMap = new Map<string, DoctorPerformanceRow>();
  const serviceMap = new Map<string, ServiceShareRow>();

  for (const inv of filteredInvoices) {
    const t = calculateInvoiceTotals(
      inv.items,
      inv.discount,
      inv.insuranceCoverage,
      inv.paidAmount
    );
    const collected = Math.min(t.netTotal, inv.paidAmount);
    totalBilled += t.netTotal;
    totalCollected += collected;

    const bucket = ensureBucket(inv.date);
    bucket.billedAmount += t.netTotal;
    bucket.collectedAmount += collected;

    let doc = doctorMap.get(inv.doctorId);
    if (!doc) {
      doc = {
        doctorId: inv.doctorId,
        doctorName: inv.doctorName,
        appointmentsCount: 0,
        completedCount: 0,
        totalRevenue: 0,
      };
      doctorMap.set(inv.doctorId, doc);
    }
    doc.totalRevenue += t.netTotal;

    for (const item of inv.items) {
      const cur = serviceMap.get(item.title) ?? { title: item.title, count: 0, revenue: 0 };
      cur.count += item.quantity;
      cur.revenue += item.quantity * item.unitPrice;
      serviceMap.set(item.title, cur);
    }
  }

  let totalExpenses = 0;
  let totalPettyCashExpenses = 0;
  let totalClinicPurchases = 0;
  const catMap = new Map<ExpenseCategory, { amount: number; count: number }>();

  for (const exp of filteredExpenses) {
    const amt = Math.max(0, exp.amount);
    totalExpenses += amt;
    if (exp.source === 'petty_cash') {
      totalPettyCashExpenses += amt;
    } else {
      totalClinicPurchases += amt;
    }

    const bucket = ensureBucket(exp.date);
    bucket.expensesAmount += amt;
    if (exp.source === 'petty_cash') bucket.pettyCashAmount += amt;
    else bucket.clinicPurchasesAmount += amt;

    const cur = catMap.get(exp.category) ?? { amount: 0, count: 0 };
    cur.amount += amt;
    cur.count += 1;
    catMap.set(exp.category, cur);
  }

  let totalVisits = 0;
  let completedVisits = 0;
  let onlineBookingsCount = 0;

  for (const apt of filteredAppointments) {
    totalVisits += 1;
    if (apt.status === 'completed') completedVisits += 1;
    if (apt.source === 'online') onlineBookingsCount += 1;

    const bucket = ensureBucket(apt.date);
    bucket.visitCount += 1;

    let doc = doctorMap.get(apt.doctorId);
    if (!doc) {
      doc = {
        doctorId: apt.doctorId,
        doctorName: apt.doctorName,
        appointmentsCount: 0,
        completedCount: 0,
        totalRevenue: 0,
      };
      doctorMap.set(apt.doctorId, doc);
    }
    doc.appointmentsCount += 1;
    if (apt.status === 'completed') doc.completedCount += 1;
  }

  const buckets = Array.from(bucketMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((b) => ({
      ...b,
      netProfit: b.collectedAmount - b.expensesAmount,
    }));

  const expenseBreakdown: ExpenseCategoryBreakdown[] = Array.from(catMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      sharePercent: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalOutstanding = Math.max(0, totalBilled - totalCollected);
  const netProfit = totalCollected - totalExpenses;
  const profitMarginPercent =
    totalCollected > 0 ? Math.round((netProfit / totalCollected) * 100) : 0;
  const collectionRate =
    totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

  return {
    period,
    totalBilled,
    totalCollected,
    totalOutstanding,
    totalExpenses,
    totalPettyCashExpenses,
    totalClinicPurchases,
    netProfit,
    profitMarginPercent,
    collectionRate,
    totalVisits,
    completedVisits,
    onlineBookingsCount,
    buckets,
    expenseBreakdown,
    byDoctor: Array.from(doctorMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
    topServices: Array.from(serviceMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6),
  };
}
