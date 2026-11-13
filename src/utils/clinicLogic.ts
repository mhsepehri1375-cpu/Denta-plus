import type {
  Appointment,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Patient,
  PermissionKey,
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

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_ehr: 'مشاهده پرونده پزشکی و رادیولوژی',
  edit_ehr: 'ثبت و ویرایش چارت دندانی و درمان',
  manage_appointments: 'مدیریت نوبت‌دهی و پذیرش',
  manage_billing: 'صدور فاکتور و اتصال به حسابداری',
  send_sms: 'ارسال پیامک یادآوری به بیماران',
  view_reports: 'مشاهده گزارش‌های مالی و تحلیلی',
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
  const formatted = new Intl.NumberFormat('en-US').format(safe);
  return `${toPersianDigits(formatted)} تومان`;
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
  let gy2 = gm > 2 ? gy + 1 : gy;
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

function timeToMinutes(timeStr: string): number {
  const clean = normalizeDigits(timeStr);
  const [h, m] = clean.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
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
  if (start < 0) return false;
  const end = start + Math.max(15, durationMinutes);

  return appointments.some((apt) => {
    if (apt.id === excludeAppointmentId) return false;
    if (apt.status === 'cancelled') return false;
    if (apt.doctorId !== doctorId || apt.date !== date) return false;
    const aptStart = timeToMinutes(apt.time);
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
